// Copyright DataStax, Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import { Types } from 'mongoose';
import url from 'url';
import { logger } from '../logger';
import { HTTPClient, handleIfErrorResponse } from '../client/httpClient';

interface ParsedUri {
  baseUrl: string;
  baseApiPath: string;
  keyspaceName: string;
  applicationToken: string;
  logLevel: string;
  authHeaderName: string;
}

// Parse a connection URI in the format of: https://${baseUrl}/${baseAPIPath}/${keyspace}?applicationToken=${applicationToken}
export const parseUri = (uri: string): ParsedUri => {
    const parsedUrl = url.parse(uri, true);
    const baseUrl = `${parsedUrl.protocol}//${parsedUrl.host}`;
    const keyspaceName = parsedUrl.pathname?.substring(parsedUrl.pathname?.lastIndexOf('/') + 1);
    const baseApiPath = getBaseAPIPath(parsedUrl.pathname);
    const applicationToken = parsedUrl.query?.applicationToken as string;
    const logLevel = parsedUrl.query?.logLevel as string;
    const authHeaderName = parsedUrl.query?.authHeaderName as string;
    if (!keyspaceName) {
        throw new Error('Invalid URI: keyspace is required');
    }
    return {
        baseUrl,
        baseApiPath,
        keyspaceName,
        applicationToken,
        logLevel,
        authHeaderName
    };
};

// Removes the last part of the api path (which is assumed as the keyspace name). for example below are the sample input => output from this function
//  /v1/testks1 => v1
//  /apis/v1/testks1 => apis/v1
//  /testks1 => '' (empty string)
function getBaseAPIPath(pathFromUrl?: string | null) {
    if (!pathFromUrl) {
        return '';
    }
    const pathElements = pathFromUrl.split('/');
    pathElements[pathElements.length - 1] = '';
    const baseApiPath = pathElements.join('/');
    return baseApiPath === '/' ? '' : baseApiPath.substring(1, baseApiPath.length - 1);
}

/**
 * Create an Astra connection URI while connecting to Astra Data API
 * @param apiEndpoint the database API Endpoint of the Astra database
 * @param apiToken an Astra application token
 * @param namespace the namespace to connect to
 * @param baseApiPath baseAPI path defaults to /api/json/v1
 * @param logLevel an winston log level (error: 0, warn: 1, info: 2, http: 3, verbose: 4, debug: 5, silly: 6)
 * @param authHeaderName
 * @returns URL as string
 */
export function createAstraUri (
    apiEndpoint: string,
    apiToken: string,
    namespace?: string,
    baseApiPath?: string,
    logLevel?: string,
    authHeaderName?: string,
) {
    const uri = new url.URL(apiEndpoint);
    let contextPath = '';
    contextPath += baseApiPath ? `/${baseApiPath}` : '/api/json/v1';
    contextPath += `/${namespace ?? 'default_keyspace'}`;
    uri.pathname = contextPath;
    if (apiToken) {
        uri.searchParams.append('applicationToken', apiToken);
    }
    if (logLevel) {
        uri.searchParams.append('logLevel', logLevel);
    }
    if (authHeaderName) {
        uri.searchParams.append('authHeaderName', authHeaderName);
    }
    return uri.toString();
}

/**
 * Create a Data API connection URI while connecting to Open source Data API
 * @param baseUrl the base URL of the Data API
 * @param keyspace the keyspace to connect to
 * @param username the username to connect with
 * @param password the password to connect with
 * @param logLevel an winston log level (error: 0, warn: 1, info: 2, http: 3, verbose: 4, debug: 5, silly: 6)
* @returns URL as string
 */
export function createStargateUri(
    baseUrl: string,
    keyspace: string,
    username: string,
    password: string,
    logLevel?: string
) {
    const uri = new url.URL(baseUrl);
    uri.pathname = `/${keyspace}`;
    if (logLevel) {
        uri.searchParams.append('logLevel', logLevel);
    }
    const accessToken = getStargateAccessToken(username, password);
    uri.searchParams.append('applicationToken', accessToken);
    return uri.toString();
}

/**
 * Get an access token from Stargate (this is useful while connecting to open source Data API)
 * @param username Username
 * @param password Password
 * @returns access token as string
 */
export function getStargateAccessToken(
    username: string,
    password: string) {
    return 'Cassandra:' + Buffer.from(username).toString('base64') + ':' + Buffer.from(password).toString('base64');
}

export class StargateAuthError extends Error {
    message: string;
    constructor(message: string) {
        super(message);
        this.message = message;
    }
}
export const executeOperation = async (operation: () => Promise<unknown>) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let res: any = {};
    try {
        res = await operation();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
        logger.error(e?.stack || e?.message);
        throw e;
    }
    return res;
};

export async function createNamespace(httpClient: HTTPClient, name: string) {
    const data = {
        createNamespace: {
            name
        }
    };
    parseUri(httpClient.baseUrl);
    const response = await httpClient._request({
        url: httpClient.baseUrl,
        method: 'POST',
        data
    });
    handleIfErrorResponse(response, data);
    return response;
}

export async function dropNamespace(httpClient: HTTPClient, name: string) {
    const data = {
        dropNamespace: {
            name
        }
    };
    const response = await httpClient._request({
        url: httpClient.baseUrl,
        method: 'POST',
        data
    });
    handleIfErrorResponse(response, data);
    return response;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function setDefaultIdForUpsert(command: Record<string, any>, replace?: boolean) {
    if (command.filter == null || command.options == null) {
        return;
    }
    if (!command.options.upsert) {
        return;
    }
    if ('_id' in command.filter) {
        return;
    }

    if (replace) {
        if (command.replacement != null && '_id' in command.replacement) {
            return;
        }
        command.replacement._id = new Types.ObjectId();
    } else {
        if (command.update != null && _updateHasKey(command.update, '_id')) {
            return;
        }
        if (command.update == null) {
            command.update = {};
        }
        if (command.update.$setOnInsert == null) {
            command.update.$setOnInsert = {};
        }
        if (!('_id' in command.update.$setOnInsert)) {
            command.update.$setOnInsert._id = new Types.ObjectId();
        }
    }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function _updateHasKey(update: Record<string, any>, key: string) {
    for (const operator of Object.keys(update)) {
        if (update[operator] != null && typeof update[operator] === 'object' && key in update[operator]) {
            return true;
        }
    }
    return false;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function omit<T extends Record<string, any>>(obj: T | null | undefined, keys: string[]): T | null | undefined {
    if (obj == null) {
        return obj;
    }
    const hasKeys: string[] = [];
    for (const key of keys) {
        if (key in obj) {
            hasKeys.push(key);
        }
    }
    if (hasKeys.length === 0) {
        return obj;
    }
    obj = { ...obj };
    for (const key of hasKeys) {
        delete obj[key];
    }
    return obj;
}

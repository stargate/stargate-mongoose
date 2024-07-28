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
 * Create an Astra connection URI while connecting to Astra JSON API
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

export function setDefaultIdForUpsertv2(filter: Record<string, any>, update: Record<string, any>, options?: Record<string, any>, replace?: boolean) {
    if (filter == null || options == null) {
        return;
    }
    if (!options.upsert) {
        return;
    }
    if ('_id' in filter) {
        return;
    }

    if (replace) {
        if (update != null && '_id' in update) {
            return;
        }
        update._id = new Types.ObjectId();
    } else {
        if (update != null && _updateHasKey(update, '_id')) {
            return;
        }
        if (update.$setOnInsert == null) {
            update.$setOnInsert = {};
        }
        if (!('_id' in update.$setOnInsert)) {
            update.$setOnInsert._id = new Types.ObjectId();
        }
    }
}


function _updateHasKey(update: Record<string, any>, key: string) {
    for (const operator of Object.keys(update)) {
        if (update[operator] != null && typeof update[operator] === 'object' && key in update[operator]) {
            return true;
        }
    }
    return false;
}

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

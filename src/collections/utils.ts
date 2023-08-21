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

import { ObjectId } from 'mongodb';
import url from 'url';
import { logger } from '@/src/logger';
import axios from 'axios';
import { HTTPClient, handleIfErrorResponse } from '@/src/client/httpClient';

interface ParsedUri {
  baseUrl: string;
  baseApiPath: string;
  keyspaceName: string;
  applicationToken: string;
  logLevel: string;
  authHeaderName: string;
}

/**
 * Parse a connection URI
 * @param uri - a uri in the format of: https://${baseUrl}/${baseAPIPath}/${keyspace}?applicationToken=${applicationToken}
 * @returns ParsedUri
 */
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

/* Removes the last part of the api path (which is assumed as the keyspace name). for example below are the sample input => output from this function
 * /v1/testks1 => v1
 * /apis/v1/testks1 => apis/v1
 * /testks1 => '' (empty string)
*/
function getBaseAPIPath(pathFromUrl?: string | null) {
  if (!pathFromUrl) {
    return '';
  }
  const pathElements = pathFromUrl.split("/");
  pathElements[pathElements.length - 1] = '';
  const baseApiPath = pathElements.join('/');
  return baseApiPath === '/' ? '' : baseApiPath.substring(1, baseApiPath.length - 1);
}

/**
 * Create a Astra connection URI
 * @param databaseId the database id of the Astra database
 * @param region the region of the Astra database
 * @param keyspace the keyspace to connect to
 * @param applicationToken an Astra application token
 * @param baseApiPath baseAPI path defaults to /api/json/v1
 * @param logLevel an winston log level
 * @param authHeaderName
 * @returns URL as string
 */
export const createAstraUri = (
  databaseId: string,
  region: string,
  keyspace: string,
  applicationToken?: string,
  baseApiPath?: string,
  logLevel?: string,
  authHeaderName?: string,
) => {
  let uri = new url.URL(`https://${databaseId}-${region}.apps.astra.datastax.com`);
  let contextPath: string = '';
  contextPath += baseApiPath ? `/${baseApiPath}` : '/api/json/v1';
  contextPath += `/${keyspace}`;
  uri.pathname = contextPath;
  if (applicationToken) {
    uri.searchParams.append('applicationToken', applicationToken);
  }
  if (logLevel) {
    uri.searchParams.append('logLevel', logLevel);
  }
  if (authHeaderName) {
    uri.searchParams.append('authHeaderName', authHeaderName);
  }
  return uri.toString();
};

/**
 * Create a stargate  connection URI
 * @param baseUrl
 * @param baseAuthUrl
 * @param keyspace
 * @param username
 * @param password
 * @param logLevel
* @returns URL as string
 */
export const createStargateUri = async (
  baseUrl: string,
  baseAuthUrl: string,
  keyspace: string,
  username: string,
  password: string,
  logLevel?: string
) => {
  let uri = new url.URL(baseUrl);
  uri.pathname = `/${keyspace}`;
  if (logLevel) {
    uri.searchParams.append('logLevel', logLevel);
  }
  const accessToken = await getStargateAccessToken(baseAuthUrl, username, password);
  uri.searchParams.append('applicationToken', accessToken);
  return uri.toString();
};

/**
 *
 * @param authUrl
 * @param username
 * @param password
 */
export async function getStargateAccessToken(
  authUrl: string,
  username: string,
  password: string) {
  try {
    const response = await axios({
      url: authUrl,
      data: { username, password },
      method: 'POST',
      headers: {
        Accepts: 'application/json',
        'Content-Type': 'application/json'
      }
    });
    if (response.status === 401) {
      throw new StargateAuthError(response.data?.description || 'Invalid credentials provided');
    }
    return response.data?.authToken;
  } catch (e: any) {
    if (e.response?.data?.description) {
      e.message = e.response?.data?.description;
    }
    throw e;
  }
}

export class StargateAuthError extends Error {
  message: string
  constructor(message: string) {
    super(message);
    this.message = message;
  }
}

/**
 * executeOperation handles running functions
 * return a promise.
 * @param operation a function that takes no parameters and returns a response
 * @returns Promise
 */
export const executeOperation = async (operation: Function) => {
  let res: any = {};
  try {
    res = await operation();
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
  const parsedUri = parseUri(httpClient.baseUrl);
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
    command.replacement._id = new ObjectId();
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
      command.update.$setOnInsert._id = new ObjectId();
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
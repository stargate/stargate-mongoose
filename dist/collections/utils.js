"use strict";
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.omit = exports.setDefaultIdForUpsert = exports.dropNamespace = exports.createNamespace = exports.executeOperation = exports.StargateAuthError = exports.getStargateAccessToken = exports.createStargateUri = exports.createAstraUri = exports.parseUri = void 0;
const mongoose_1 = require("mongoose");
const url_1 = __importDefault(require("url"));
const logger_1 = require("../logger");
const httpClient_1 = require("../client/httpClient");
// Parse a connection URI in the format of: https://${baseUrl}/${baseAPIPath}/${keyspace}?applicationToken=${applicationToken}
const parseUri = (uri) => {
    const parsedUrl = url_1.default.parse(uri, true);
    const baseUrl = `${parsedUrl.protocol}//${parsedUrl.host}`;
    const keyspaceName = parsedUrl.pathname?.substring(parsedUrl.pathname?.lastIndexOf('/') + 1);
    const baseApiPath = getBaseAPIPath(parsedUrl.pathname);
    const applicationToken = parsedUrl.query?.applicationToken;
    const logLevel = parsedUrl.query?.logLevel;
    const authHeaderName = parsedUrl.query?.authHeaderName;
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
exports.parseUri = parseUri;
// Removes the last part of the api path (which is assumed as the keyspace name). for example below are the sample input => output from this function
//  /v1/testks1 => v1
//  /apis/v1/testks1 => apis/v1
//  /testks1 => '' (empty string)
function getBaseAPIPath(pathFromUrl) {
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
function createAstraUri(apiEndpoint, apiToken, namespace, baseApiPath, logLevel, authHeaderName) {
    const uri = new url_1.default.URL(apiEndpoint);
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
exports.createAstraUri = createAstraUri;
/**
 * Create a Data API connection URI while connecting to Open source Data API
 * @param baseUrl the base URL of the Data API
 * @param keyspace the keyspace to connect to
 * @param username the username to connect with
 * @param password the password to connect with
 * @param logLevel an winston log level (error: 0, warn: 1, info: 2, http: 3, verbose: 4, debug: 5, silly: 6)
* @returns URL as string
 */
function createStargateUri(baseUrl, keyspace, username, password, logLevel) {
    const uri = new url_1.default.URL(baseUrl);
    uri.pathname = `/${keyspace}`;
    if (logLevel) {
        uri.searchParams.append('logLevel', logLevel);
    }
    const accessToken = getStargateAccessToken(username, password);
    uri.searchParams.append('applicationToken', accessToken);
    return uri.toString();
}
exports.createStargateUri = createStargateUri;
/**
 * Get an access token from Stargate (this is useful while connecting to open source Data API)
 * @param username Username
 * @param password Password
 * @returns access token as string
 */
function getStargateAccessToken(username, password) {
    return 'Cassandra:' + Buffer.from(username).toString('base64') + ':' + Buffer.from(password).toString('base64');
}
exports.getStargateAccessToken = getStargateAccessToken;
class StargateAuthError extends Error {
    constructor(message) {
        super(message);
        this.message = message;
    }
}
exports.StargateAuthError = StargateAuthError;
const executeOperation = async (operation) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let res = {};
    try {
        res = await operation();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }
    catch (e) {
        logger_1.logger.error(e?.stack || e?.message);
        throw e;
    }
    return res;
};
exports.executeOperation = executeOperation;
async function createNamespace(httpClient, name) {
    const data = {
        createNamespace: {
            name
        }
    };
    (0, exports.parseUri)(httpClient.baseUrl);
    const response = await httpClient._request({
        url: httpClient.baseUrl,
        method: 'POST',
        data
    });
    (0, httpClient_1.handleIfErrorResponse)(response, data);
    return response;
}
exports.createNamespace = createNamespace;
async function dropNamespace(httpClient, name) {
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
    (0, httpClient_1.handleIfErrorResponse)(response, data);
    return response;
}
exports.dropNamespace = dropNamespace;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function setDefaultIdForUpsert(command, replace) {
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
        command.replacement._id = new mongoose_1.Types.ObjectId();
    }
    else {
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
            command.update.$setOnInsert._id = new mongoose_1.Types.ObjectId();
        }
    }
}
exports.setDefaultIdForUpsert = setDefaultIdForUpsert;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function _updateHasKey(update, key) {
    for (const operator of Object.keys(update)) {
        if (update[operator] != null && typeof update[operator] === 'object' && key in update[operator]) {
            return true;
        }
    }
    return false;
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function omit(obj, keys) {
    if (obj == null) {
        return obj;
    }
    const hasKeys = [];
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
exports.omit = omit;
//# sourceMappingURL=utils.js.map
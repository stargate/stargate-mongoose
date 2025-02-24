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
exports.handleIfErrorResponse = exports.StargateServerError = exports.HTTPClient = void 0;
const http_1 = __importDefault(require("http"));
const axios_1 = __importDefault(require("axios"));
const logger_1 = require("../logger");
const util_1 = require("util");
const version_1 = require("../version");
const utils_1 = require("../collections/utils");
const http2_1 = __importDefault(require("http2"));
const collection_1 = require("../collections/collection");
const deserialize_1 = require("./deserialize");
const serialize_1 = require("./serialize");
const REQUESTED_WITH = version_1.LIB_NAME + '/' + version_1.LIB_VERSION;
const DEFAULT_AUTH_HEADER = 'X-Cassandra-Token';
const DEFAULT_METHOD = 'get';
const DEFAULT_TIMEOUT = 30000;
const HTTP_METHODS = {
    get: 'GET',
    post: 'POST',
    put: 'PUT',
    patch: 'PATCH',
    delete: 'DELETE'
};
const MAX_HTTP2_REQUESTS_PER_SESSION = 1000;
const axiosAgent = axios_1.default.create({
    headers: {
        Accepts: 'application/json',
        'Content-Type': 'application/json',
        'User-Agent': `${REQUESTED_WITH} ${axios_1.default.defaults.headers.common['User-Agent']}`,
        'X-Requested-With': REQUESTED_WITH
    },
    // keepAlive pools and reuses TCP connections
    httpAgent: new http_1.default.Agent({
        keepAlive: true
    }),
    timeout: DEFAULT_TIMEOUT
});
// InternalAxiosRequestConfig because of https://github.com/axios/axios/issues/5494#issuecomment-1402663237
const requestInterceptor = (config) => {
    const { method, url } = config;
    if (logger_1.logger.isLevelEnabled('http')) {
        logger_1.logger.http(`--- request ${method?.toUpperCase()} ${url} ${(0, serialize_1.serialize)(config.data, true)}`);
    }
    config.data = (0, serialize_1.serialize)(config.data);
    return config;
};
const responseInterceptor = (response) => {
    if (logger_1.logger.isLevelEnabled('http')) {
        logger_1.logger.http(`--- response ${response.status} ${response.config.method?.toUpperCase()} ${response.config.url} ${JSON.stringify(response.data, null, 2)}`);
    }
    return response;
};
axiosAgent.interceptors.request.use(requestInterceptor);
axiosAgent.interceptors.response.use(responseInterceptor);
class HTTP2Session {
    constructor(origin) {
        this.origin = origin;
        this.numRequests = 0;
        this.closed = false;
        this.gracefulCloseInProgress = false;
        this._createSession();
    }
    _createSession() {
        this.numInFlightRequests = 0;
        this.session = http2_1.default.connect(this.origin);
        // Without these handlers, any errors will end up as uncaught exceptions,
        // even if they are handled in `_request()`.
        // More info: https://github.com/nodejs/node/issues/16345
        this.session.on('error', () => { });
        this.session.on('socketError', () => { });
    }
    close() {
        this.session.close();
        this.closed = true;
    }
    gracefulClose() {
        this.gracefulCloseInProgress = true;
        if (this.numInFlightRequests <= 0) {
            this.close();
        }
    }
    completeHTTP2Request() {
        --this.numInFlightRequests;
        if (this.numInFlightRequests <= 0 && this.gracefulCloseInProgress) {
            this.close();
        }
    }
    request(path, token, body, timeout, additionalParams) {
        return new Promise((resolve, reject) => {
            if (!this.closed && this.session.closed) {
                this._createSession();
            }
            ++this.numInFlightRequests;
            ++this.numRequests;
            let done = false;
            if (logger_1.logger.isLevelEnabled('http')) {
                logger_1.logger.http(`--- request POST ${this.origin}${path} ${(0, serialize_1.serialize)(body, true)}`);
            }
            const timer = setTimeout(() => {
                if (!done) {
                    done = true;
                    this.completeHTTP2Request();
                }
                reject(new collection_1.StargateMongooseError('Request timed out', body));
            }, timeout);
            const req = this.session.request({
                ...additionalParams,
                ':path': path,
                ':method': 'POST',
                token
            });
            req.write((0, serialize_1.serialize)(body), 'utf8');
            req.end();
            let status = 0;
            req.on('response', (data) => {
                if (!done) {
                    done = true;
                    clearTimeout(timer);
                    this.completeHTTP2Request();
                }
                status = data[':status'] ?? 0;
            });
            req.on('error', (error) => {
                if (!done) {
                    done = true;
                    clearTimeout(timer);
                    this.completeHTTP2Request();
                }
                reject(error);
            });
            req.setEncoding('utf8');
            let responseBody = '';
            req.on('data', (chunk) => {
                responseBody += chunk;
            });
            req.on('end', () => {
                if (!done) {
                    done = true;
                    clearTimeout(timer);
                    this.completeHTTP2Request();
                }
                let data = {};
                try {
                    data = JSON.parse(responseBody);
                    if (logger_1.logger.isLevelEnabled('http')) {
                        logger_1.logger.http(`--- response ${status} POST ${this.origin}${path} ${JSON.stringify(data, null, 2)}`);
                    }
                    resolve({ status, data });
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                }
                catch (error) {
                    reject(new Error('Unable to parse response as JSON, got: "' + data + '", error: ' + error?.message));
                    return;
                }
            });
        });
    }
}
class HTTPClient {
    constructor(options) {
        // do not support usage in browsers
        if (typeof window !== 'undefined') {
            throw new Error('not for use in a web browser');
        }
        // set the baseURL to Astra, if the user provides a Data API URL, use that instead.
        if (options.baseUrl) {
            this.baseUrl = options.baseUrl;
        }
        else {
            throw new Error('baseUrl required for initialization');
        }
        this.username = options.username || '';
        this.password = options.password || '';
        if (options.applicationToken) {
            this.applicationToken = options.applicationToken;
        }
        else {
            if (this.username === '' || this.password === '') {
                throw new Error('stargate-mongoose: must set `username` and `password` option when connecting if `applicationToken` not set');
            }
            this.applicationToken = ''; //We will set this by accessing the auth url when the first request is received
        }
        this.closed = false;
        this.origin = new URL(this.baseUrl).origin;
        // Convert array of strings to object with each key set to `'true'`
        const featureFlags = Array.isArray(options.featureFlags) ? options.featureFlags : [];
        this.featureFlagHeaders = featureFlags.reduce((obj, key) => Object.assign(obj, { [key]: 'true' }), {});
        const useHTTP2 = options.useHTTP2 == null ? true : !!options.useHTTP2;
        if (useHTTP2) {
            this._createHTTP2Session();
        }
        if (options.logLevel) {
            (0, logger_1.setLevel)(options.logLevel);
        }
        if (options.baseApiPath) {
            this.baseUrl = this.baseUrl + '/' + options.baseApiPath;
        }
        this.authHeaderName = options.authHeaderName || DEFAULT_AUTH_HEADER;
        this.isAstra = options.isAstra || false;
        this.logSkippedOptions = options.logSkippedOptions || false;
    }
    close() {
        if (this.http2Session != null) {
            this.http2Session.close();
        }
        this.closed = true;
    }
    _createHTTP2Session() {
        this.http2Session = new HTTP2Session(this.origin);
    }
    async _request(requestInfo) {
        try {
            if (this.applicationToken === '') {
                logger_1.logger.debug('@stargate-mongoose/rest: getting token');
                try {
                    this.applicationToken = (0, utils_1.getStargateAccessToken)(this.username, this.password);
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                }
                catch (authError) {
                    return {
                        errors: [
                            {
                                message: authError.message ? authError.message : 'Authentication failed, please retry!'
                            }
                        ]
                    };
                }
            }
            if (!this.applicationToken) {
                return {
                    errors: [
                        {
                            message: 'Unable to get token for the credentials provided'
                        }
                    ]
                };
            }
            if (!requestInfo.url) {
                return {
                    errors: [
                        {
                            message: 'URL not specified'
                        }
                    ]
                };
            }
            const response = this.http2Session != null
                ? await this.makeHTTP2Request(requestInfo.url.replace(this.origin, ''), this.applicationToken, requestInfo.data, requestInfo.timeout || DEFAULT_TIMEOUT, this.featureFlagHeaders)
                : await axiosAgent({
                    url: requestInfo.url,
                    data: requestInfo.data,
                    params: requestInfo.params,
                    method: requestInfo.method || DEFAULT_METHOD,
                    timeout: requestInfo.timeout || DEFAULT_TIMEOUT,
                    headers: {
                        ...this.featureFlagHeaders,
                        [this.authHeaderName]: this.applicationToken,
                    }
                });
            if (response.status === 200) {
                return {
                    status: (0, deserialize_1.deserialize)(response.data?.status),
                    data: (0, deserialize_1.deserialize)(response.data?.data),
                    errors: response.data?.errors
                };
            }
            else {
                return { errors: response.data?.errors };
            }
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        }
        catch (e) {
            logger_1.logger.error(requestInfo.url + ': ' + e.message);
            logger_1.logger.error('Data: ' + (0, util_1.inspect)(requestInfo.data));
            if (e?.response?.data) {
                logger_1.logger.error('Response Data: ' + (0, util_1.inspect)(e.response.data));
            }
            return {
                errors: [
                    {
                        message: e.message ? e.message : 'Server call failed, please retry!'
                    }
                ]
            };
        }
    }
    async makeHTTP2Request(path, token, body, timeout, additionalParams) {
        // Should never happen, but good to have a readable error just in case
        if (this.http2Session == null) {
            throw new Error('Cannot make http2 request without session');
        }
        if (this.closed) {
            throw new Error('Cannot make http2 request when client is closed');
        }
        if (this.http2Session.numRequests >= MAX_HTTP2_REQUESTS_PER_SESSION) {
            this.http2Session.gracefulClose();
            this._createHTTP2Session();
        }
        return await this.http2Session.request(path, token, body, timeout, additionalParams);
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async executeCommandWithUrl(url, data, optionsToRetain) {
        const commandName = Object.keys(data)[0];
        cleanupOptions(commandName, data[commandName], optionsToRetain, this.logSkippedOptions);
        const response = await this._request({
            url: this.baseUrl + url,
            method: HTTP_METHODS.post,
            data
        });
        (0, exports.handleIfErrorResponse)(response, data);
        return response;
    }
}
exports.HTTPClient = HTTPClient;
class StargateServerError extends Error {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    constructor(response, command) {
        const commandName = Object.keys(command)[0] || 'unknown';
        const status = response.status ? `, Status : ${JSON.stringify(response.status)}` : '';
        super(`Command "${commandName}" failed with the following errors: ${JSON.stringify(response.errors)}${status}`);
        this.errors = response.errors;
        this.command = command;
        this.status = response.status;
    }
}
exports.StargateServerError = StargateServerError;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const handleIfErrorResponse = (response, data) => {
    if (Array.isArray(response.errors) && response.errors.length > 0) {
        throw new StargateServerError(response, data);
    }
};
exports.handleIfErrorResponse = handleIfErrorResponse;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function cleanupOptions(commandName, command, optionsToRetain, logSkippedOptions) {
    if (command.options != null) {
        Object.keys(command.options).forEach((key) => {
            if (optionsToRetain != null && !optionsToRetain.has(key)) {
                if (logSkippedOptions) {
                    logger_1.logger.warn(`'${commandName}' does not support option '${key}'`);
                }
                delete command.options[key];
            }
        });
    }
}
//# sourceMappingURL=httpClient.js.map
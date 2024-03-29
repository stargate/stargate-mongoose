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

import http from 'http';
import axios, { AxiosRequestConfig, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { logger, setLevel } from '@/src/logger';
import { inspect } from 'util';
import { LIB_NAME, LIB_VERSION } from '../version';
import { getStargateAccessToken } from '../collections/utils';
import { EJSON } from 'bson';
import http2 from 'http2';
import { StargateMongooseError } from '../collections/collection';

const REQUESTED_WITH = LIB_NAME + '/' + LIB_VERSION;
const DEFAULT_AUTH_HEADER = 'X-Cassandra-Token';
const DEFAULT_METHOD = 'get';
const DEFAULT_TIMEOUT = 30000;
export const AUTH_API_PATH = '/v1/auth';
const HTTP_METHODS = {
    get: 'GET',
    post: 'POST',
    put: 'PUT',
    patch: 'PATCH',
    delete: 'DELETE'
};
const MAX_HTTP2_REQUESTS_PER_SESSION = 1000;

interface APIClientOptions {
  //applicationToken is optional, since adding username and password eventually will be an alternate option for this.
  applicationToken?: string;
  baseApiPath?: string;
  baseUrl?: string;
  authHeaderName?: string;
  logLevel?: string;
  username?: string;
  password?: string;
  authUrl?: string;
  isAstra?: boolean;
  logSkippedOptions?: boolean;
  useHTTP2?: boolean;
}

export interface APIResponse {
  status?: any
  data?: any
  errors?: any
}

const axiosAgent = axios.create({
    headers: {
        Accepts: 'application/json',
        'Content-Type': 'application/json',
        'User-Agent': `${REQUESTED_WITH} ${axios.defaults.headers.common['User-Agent']}`,
        'X-Requested-With': REQUESTED_WITH
    },
    // keepAlive pools and reuses TCP connections
    httpAgent: new http.Agent({
        keepAlive: true
    }),
    timeout: DEFAULT_TIMEOUT
});

// InternalAxiosRequestConfig because of https://github.com/axios/axios/issues/5494#issuecomment-1402663237
const requestInterceptor = (config: InternalAxiosRequestConfig) => {
    const { method, url } = config;
    if (logger.isLevelEnabled('http')) {
        logger.http(`--- request ${method?.toUpperCase()} ${url} ${serializeCommand(config.data, true)}`);
    }
    config.data = serializeCommand(config.data);
    return config;
};

const responseInterceptor = (response: AxiosResponse) => {
    if (logger.isLevelEnabled('http')) {
        logger.http(`--- response ${response.status} ${response.config.method?.toUpperCase()} ${response.config.url} ${JSON.stringify(response.data, null, 2)}`);
    }
    return response;
};

axiosAgent.interceptors.request.use(requestInterceptor);
axiosAgent.interceptors.response.use(responseInterceptor);

class HTTP2Session {
    session: http2.ClientHttp2Session;
    numInFlightRequests: number;
    numRequests: number;
    gracefulCloseInProgress: boolean;
    origin: string;

    constructor(origin: string) {
        this.origin = origin;
        this.session = http2.connect(origin);
        this.numInFlightRequests = 0;
        this.numRequests = 0;
        this.gracefulCloseInProgress = false;

        // Without these handlers, any errors will end up as uncaught exceptions,
        // even if they are handled in `_request()`.
        // More info: https://github.com/nodejs/node/issues/16345
        this.session.on('error', () => {});
        this.session.on('socketError', () => {});
    }

    close() {
        this.session.close();
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

    request(path: string, token: string, body: Record<string, any>, timeout: number): Promise<{ status: number, data: Record<string, any> }> {
        return new Promise((resolve, reject) => {
            ++this.numInFlightRequests;
            ++this.numRequests;
            let done = false;

            if (logger.isLevelEnabled('http')) {
                logger.http(`--- request POST ${this.origin}${path} ${serializeCommand(body, true)}`);
            }
            
            const timer = setTimeout(
                () => {
                    if (!done) {
                        done = true;
                        this.completeHTTP2Request();
                    }
                    reject(new StargateMongooseError('Request timed out', body));
                },
                timeout
            );

            const req: http2.ClientHttp2Stream = this.session.request({
                ':path': path,
                ':method': 'POST',
                token
            });
            req.write(serializeCommand(body), 'utf8');
            req.end();

            let status = 0;
            req.on('response', (data: http2.IncomingHttpStatusHeader) => {
                if (!done) {
                    done = true;
                    clearTimeout(timer);
                    this.completeHTTP2Request();
                }
                status = data[':status'] ?? 0;
            });

            req.on('error', (error: Error) => {
                if (!done) {
                    done = true;
                    clearTimeout(timer);
                    this.completeHTTP2Request();
                }
                reject(error);
            });

            req.setEncoding('utf8');
            let responseBody = '';
            req.on('data', (chunk: string) => {
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
                    if (logger.isLevelEnabled('http')) {
                        logger.http(`--- response ${status} POST ${this.origin}${path} ${JSON.stringify(data, null, 2)}`);
                    }

                    resolve({ status, data });
                } catch (error) {
                    reject(new Error('Unable to parse response as JSON, got: "' + data + '"'));
                    return;
                }
            });
        });
    }
}

export class HTTPClient {
    origin: string;
    baseUrl: string;
    applicationToken: string;
    authHeaderName: string;
    username: string;
    password: string;
    authUrl: string;
    isAstra: boolean;
    logSkippedOptions: boolean;
    http2Session?: HTTP2Session;
    closed: boolean;

    constructor(options: APIClientOptions) {
        // do not support usage in browsers
        if (typeof window !== 'undefined') {
            throw new Error('not for use in a web browser');
        }
        // set the baseURL to Astra, if the user provides a JSON API URL, use that instead.
        if (options.baseUrl) {
            this.baseUrl = options.baseUrl;
        } else {
            throw new Error('baseUrl required for initialization');
        }
        this.username = options.username || '';
        this.password = options.password || '';
        this.authUrl = options.authUrl || this.baseUrl + AUTH_API_PATH;
        if (options.applicationToken) {
            this.applicationToken = options.applicationToken;
        } else {
            if (this.username === '' || this.password === '') {
                throw new Error('applicationToken/auth info required for initialization');
            }
            this.applicationToken = '';//We will set this by accessing the auth url when the first request is received
        }

        this.closed = false;
        this.origin = new URL(this.baseUrl).origin;

        const useHTTP2 = options.useHTTP2 == null ? true : !!options.useHTTP2;
        if (useHTTP2) {
            this._createHTTP2Session();
        }

        if (options.logLevel) {
            setLevel(options.logLevel);
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

    async _request(requestInfo: AxiosRequestConfig): Promise<APIResponse> {
        try {
            if (this.applicationToken === '') {
                logger.debug('@stargate-mongoose/rest: getting token');
                try {
                    this.applicationToken = await getStargateAccessToken(this.authUrl, this.username, this.password);
                } catch (authError: any) {
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
                ? await this.makeHTTP2Request(
                    requestInfo.url.replace(this.origin, ''),
                    this.applicationToken,
                    requestInfo.data,
                    requestInfo.timeout || DEFAULT_TIMEOUT
                )
                : await axiosAgent({
                    url: requestInfo.url,
                    data: requestInfo.data,
                    params: requestInfo.params,
                    method: requestInfo.method || DEFAULT_METHOD,
                    timeout: requestInfo.timeout || DEFAULT_TIMEOUT,
                    headers: {
                        [this.authHeaderName]: this.applicationToken
                    }
                });
   
            if (!this.isAstra && (response.status === 401 || (response.data?.errors?.length > 0 && response.data?.errors?.[0]?.message === 'UNAUTHENTICATED: Invalid token'))) {
                logger.debug('@stargate-mongoose/rest: reconnecting');
                try {
                    this.applicationToken = await getStargateAccessToken(this.authUrl, this.username, this.password);
                } catch (authError: any) {
                    return {
                        errors: [
                            {
                                message: authError.message ? authError.message : 'Authentication failed, please retry!'
                            }
                        ]
                    };
                }
                return this._request(requestInfo);
            }
            if (response.status === 200) {
                return {
                    status: response.data?.status,
                    data: deserialize(response.data?.data),
                    errors: response.data?.errors
                };
            } else {
                return response;
            }
        } catch (e: any) {
            logger.error(requestInfo.url + ': ' + e.message);
            logger.error('Data: ' + inspect(requestInfo.data));
            if (e?.response?.data) {
                logger.error('Response Data: ' + inspect(e.response.data));
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

    async makeHTTP2Request(
        path: string,
        token: string,
        body: Record<string, any>,
        timeout: number
    ): Promise<{ status: number, data: Record<string, any> }> {
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

        return await this.http2Session.request(path, token, body, timeout);
    }

    async executeCommandWithUrl(url: string, data: Record<string, any>, optionsToRetain: Set<string> | null) {
        const commandName = Object.keys(data)[0];
        cleanupOptions(commandName, data[commandName], optionsToRetain, this.logSkippedOptions);
        const response = await this._request({
            url: this.baseUrl + url,
            method: HTTP_METHODS.post,
            data
        });
        handleIfErrorResponse(response, data);
        return response;
    }
}

export class StargateServerError extends Error {
    errors: any[];
    command: Record<string, any>;
    status: any;
    constructor(response: any, command: Record<string, any>) {
        const commandName = Object.keys(command)[0] || 'unknown';
        const status = response.status ? `, Status : ${JSON.stringify(response.status)}` : '';
        super(`Command "${commandName}" failed with the following errors: ${JSON.stringify(response.errors)}${status}`);
        this.errors = response.errors;
        this.command = command;
        this.status = response.status;
    }
}

export const handleIfErrorResponse = (response: any, data: Record<string, any>) => {
    if (response.errors && response.errors.length > 0) {
        throw new StargateServerError(response, data);
    }
};

function serializeCommand(data: Record<string, any>, pretty?: boolean): string {
    return EJSON.stringify(data, (key, value) => handleValues(key, value), pretty ? '  ' : '');
}

function deserialize(data: Record<string, any>): Record<string, any> {
    return data != null ? EJSON.deserialize(data) : data;
}

function handleValues(key: any, value: any): any {
    if (value != null && typeof value === 'bigint') {
    //BigInt handling
        return Number(value);
    } else if (value != null && typeof value === 'object') {
    // ObjectId to strings
        if (value.$oid) {
            return value.$oid;
        } else if (value.$numberDecimal) {
            //Decimal128 handling
            return Number(value.$numberDecimal);
        } else if (value.$binary && (value.$binary.subType === '03' || value.$binary.subType === '04')) {
            //UUID handling. Subtype 03 or 04 is UUID. Refer spec : https://bsonspec.org/spec.html
            return Buffer.from(value.$binary.base64, 'base64').toString('hex')
                .replace(/(.{8})(.{4})(.{4})(.{4})(.{12})/, '$1-$2-$3-$4-$5');
        }
        //Date handling
        else if (value.$date) {
            // Use numbers instead of strings for dates
            value.$date = new Date(value.$date).valueOf();
        }
    }
    //all other values
    return value;
}

function cleanupOptions(commandName: string, command: Record<string, any>, optionsToRetain: Set<string> | null, logSkippedOptions: boolean) {
    if (command.options) {
        Object.keys(command.options!).forEach((key) => {
            if (optionsToRetain === null || !optionsToRetain.has(key)) {
                if (logSkippedOptions) {
                    logger.warn(`'${commandName}' does not support option '${key}'`);
                }
                delete command.options[key];
            }
        });
    }
}
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
import axios, { AxiosError, AxiosRequestConfig, AxiosResponse } from 'axios';
import { logger, setLevel } from '@/src/logger';
import _ from 'lodash';
import { inspect } from 'util';

const REQUESTED_WITH = 'astra-mongoose/0.1.0';
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

interface AstraClientOptions {
  applicationToken: string;
  baseApiPath?: string;
  baseUrl?: string;
  databaseId?: string;
  databaseRegion?: string;
  authHeaderName?: string;
  logLevel?: string;
}

interface RequestOptions {
  'page-size': string;
  where?: any;
  ttl?: string;
}

class AstraError extends Error {
  message: string = '';
  response?: AxiosResponse;

  constructor(message: string, response?: AxiosResponse) {
    super(message);
    this.message = message;
    this.name = 'AstraError';
    this.response = response;
  }
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

const requestInterceptor = (config: AxiosRequestConfig) => {
  const { method, url } = config;
  logger.http(`--- ${method?.toUpperCase()} ${url}`);
  return config;
};

const responseInterceptor = (response: AxiosResponse) => {
  const { config, status } = response;
  logger.http(`${status} ${config.method?.toUpperCase()} ${config.url}`);
  return response;
};

axiosAgent.interceptors.request.use(requestInterceptor);
axiosAgent.interceptors.response.use(responseInterceptor);

export class HTTPClient {
  baseApiPath: string;
  baseUrl: string;
  applicationToken: string;
  authHeaderName: string;
  isAstra: boolean;

  constructor(options: AstraClientOptions) {
    // do not support usage in browsers
    if (typeof window !== 'undefined') {
      throw new Error('not for use in a web browser');
    }

    this.isAstra = options.applicationToken != null && options.applicationToken.startsWith('AstraCS');

    // set the baseURL to Astra, if the user provides a Stargate URL, use that instead.
    // databaseId and databaseRegion are required if no other URL is provided.
    if (options.baseUrl) {
      this.baseUrl = options.baseUrl;
    } else if (options.databaseId && options.databaseRegion) {
      this.baseUrl = `https://${options.databaseId}-${options.databaseRegion}.apps.astra.datastax.com`;
    } else {
      throw new Error('baseUrl required for initialization');
    }

    if (!options.applicationToken) {
      throw new Error('applicationToken required for initialization');
    }

    if (options.logLevel) {
      setLevel(options.logLevel);
    }

    this.baseApiPath = options.baseApiPath ?? '';
    this.applicationToken = options.applicationToken;
    this.authHeaderName = options.authHeaderName || process.env.AUTH_HEADER_NAME || DEFAULT_AUTH_HEADER;
  }

  async _request(requestInfo: AxiosRequestConfig) {
    try {
      logger.debug("_request with URL %s", requestInfo.url);
      const response = await axiosAgent({
        url: requestInfo.url,
        data: requestInfo.data,
        params: requestInfo.params,
        method: requestInfo.method || DEFAULT_METHOD,
        timeout: requestInfo.timeout || DEFAULT_TIMEOUT,
        headers: {
          [this.authHeaderName]: this.applicationToken
        }
      });
      return {
        status: response.data.status,
        data: response.data.data,
        errors: response.data.errors
      };
    } catch (e: any) {
       logger.error(requestInfo.url + ': ' + e.message);
       logger.error('Data: ' + inspect(requestInfo.data));
       if (e?.response?.data) {
         logger.error('Response Data: ' + inspect(e.response.data));
       }
       return {
        errors: [
          {
            message: e.message? e.message : "Server call failed, please retry!"
          }
        ]
       }
    }
  }

  async get(path: string, options?: RequestOptions) {
    return await this._request({
      url: this.baseUrl + path,
      method: HTTP_METHODS.get,
      ...options
    });
  }

  async post(path: string, data: Record<string, any>, options?: RequestOptions) {
    return await this._request({
      url: this.baseUrl + path,
      method: HTTP_METHODS.post,
      data,
      ...options
    });
  }

  async put(path: string, data: Record<string, any>, options?: RequestOptions) {
    return await this._request({
      url: this.baseUrl + path,
      method: HTTP_METHODS.put,
      data,
      ...options
    });
  }

  async patch(path: string, data: Record<string, any>, options?: RequestOptions) {
    return await this._request({
      url: this.baseUrl + path,
      method: HTTP_METHODS.patch,
      data,
      ...options
    });
  }

  async delete(path: string, options?: RequestOptions) {
    return await this._request({
      url: this.baseUrl + path,
      method: HTTP_METHODS.delete,
      ...options
    });
  }

  async executeCommand(data: Record<string, any>) {
    return await this._request({
      url: this.baseUrl,
      method: HTTP_METHODS.post,
      data
    });
  }
}

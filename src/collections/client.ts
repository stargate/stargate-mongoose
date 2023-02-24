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

import { Db } from './db';
import { executeOperation, parseUri } from './utils';
import { HTTPClient } from '@/src/client';
import _ from 'lodash';

export interface ClientOptions {
  applicationToken?: string;
  baseApiPath?: string;
  keyspaceName?: string;
  logLevel?: string;
  authHeaderName?: string;
  username?: string;
  password?: string;
  authUrl?: string;
}

interface ClientCallback {
  (err: Error | undefined, client: Client): void;
}

export class Client {
  httpClient: HTTPClient;
  keyspaceName?: string;

  /**
   * Set up a MongoClient that works with the Stargate/Astra document API
   * @param uri an Astra/Stargate connection uri. It should be formed like so if using
   *            Astra: https://${databaseId}-${region}.apps.astra.datastax.com
   * @param options provide the Astra applicationToken here along with the keyspace name (optional)
   */
  constructor(baseUrl: string, options: ClientOptions) {
    this.keyspaceName = options.keyspaceName;
    this.httpClient = new HTTPClient({
      baseApiPath: options.baseApiPath,
      baseUrl: baseUrl,
      applicationToken: options.applicationToken,
      logLevel: options.logLevel,
      authHeaderName: options.authHeaderName,
      username: options.username,
      password: options.password,
      authUrl: options.authUrl
  });
}

  /**
   * Setup a connection to the Astra/Stargate document API
   * @param uri an Astra/Stargate connection uri. It should be formed like so if using
   *            Astra: https://${databaseId}-${region}.apps.astra.datastax.com/${keyspace}?applicationToken=${applicationToken}
   *            You can also have it formed for you using utils.createAstraUri()
   * @param cb an optional callback whose parameters are (err, client)
   * @returns MongoClient
   */
  static async connect(uri: string, options?: ClientOptions | null, cb?: ClientCallback): Promise<Client> {
    if (typeof options === 'function') {
      cb = options;
      options = null;
    }
    return executeOperation(async () => {
      const parsedUri = parseUri(uri);
      const client = new Client(parsedUri.baseUrl, {
        applicationToken: options?.applicationToken ? options?.applicationToken : parsedUri.applicationToken,
        baseApiPath: options?.baseApiPath ? options?.baseApiPath : parsedUri.baseApiPath,
        keyspaceName: options?.keyspaceName ? options?.keyspaceName : parsedUri.keyspaceName,
        logLevel: options?.logLevel,
        authHeaderName: options?.authHeaderName,
        username: options?.username,
        password: options?.password,
        authUrl: options?.authUrl
      });
      await client.connect();

      return client;
    }, cb);
  }

  /**
   * Connect the MongoClient instance to Astra
   * @param cb an optional callback whose parameters are (err, client)
   * @returns a MongoClient instance
   */
  async connect(cb?: ClientCallback): Promise<Client> {
    if (cb) {
      cb(undefined, this);
    }
    return this;
  }

  /**
   * Use a Astra keyspace
   * @param dbName the Astra keyspace to connect to
   * @returns Db
   */
  db(dbName?: string) {
    if (dbName) {
      return new Db(this.httpClient, dbName);
    }
    if (this.keyspaceName) {
      return new Db(this.httpClient, this.keyspaceName);
    }
    throw new Error('Database name must be provided');
  }

  // NOOPS and unimplemented

  /**
   *
   * @param maxListeners
   * @returns number
   */
  setMaxListeners(maxListeners: number) {
    return maxListeners;
  }

  /**
   *
   * @param cb
   * @returns Client
   */
  close(cb?: ClientCallback) {
    if (cb) {
      cb(undefined, this);
    }
    return this;
  }
}

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
import { createNamespace, executeOperation, parseUri } from './utils';
import { HTTPClient } from '@/src/client';
import _ from 'lodash';
import { logger } from '@/src/logger';

export interface ClientOptions {
  applicationToken?: string;
  baseApiPath?: string;
  keyspaceName?: string;
  logLevel?: string;
  authHeaderName?: string;
  createNamespaceOnConnect?: boolean;
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
  createNamespaceOnConnect?: boolean;

  /**
   * Set up a MongoClient that works with the Stargate/Astra document API
   * @param uri an Astra/Stargate connection uri. It should be formed like so if using
   *            Astra: https://${databaseId}-${region}.apps.astra.datastax.com
   * @param options provide the Astra applicationToken here along with the keyspace name (optional)
   */
  constructor(baseUrl: string, options: ClientOptions) {
    this.keyspaceName = options?.keyspaceName;
    this.createNamespaceOnConnect = options?.createNamespaceOnConnect ?? true;

    const baseApiPath = options.baseApiPath ?? 'v1';
    this.httpClient = new HTTPClient({
      baseApiPath,
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
   * @returns MongoClient
   */
  static async connect(uri: string, options?: ClientOptions | null): Promise<Client> {
    const parsedUri = parseUri(uri);
    const client = new Client(parsedUri.baseUrl, {
      applicationToken: options?.applicationToken ? options?.applicationToken : parsedUri.applicationToken,
        baseApiPath: options?.baseApiPath ? options?.baseApiPath : parsedUri.baseApiPath,
        keyspaceName: options?.keyspaceName ? options?.keyspaceName : parsedUri.keyspaceName,
        logLevel: options?.logLevel,
        authHeaderName: options?.authHeaderName,
        createNamespaceOnConnect: options?.createNamespaceOnConnect ?? true,
        username: options?.username,
        password: options?.password,
        authUrl: options?.authUrl
      });
    await client.connect();
    return client;
  }

  /**
   * Connect the MongoClient instance to Astra
   * @returns a MongoClient instance
   */
  async connect(): Promise<Client> {
    if (this.createNamespaceOnConnect && this.keyspaceName) {
      logger.debug('Creating Namespace ' + this.keyspaceName);
      await createNamespace(this, this.keyspaceName);
    } else {
      logger.debug('Not creating Namespace on connection!');
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
   * @returns Client
   */
  close() {
    return this;
  }
}

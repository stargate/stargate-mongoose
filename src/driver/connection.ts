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

import { Collection } from './collection';
import { default as MongooseConnection } from 'mongoose/lib/connection';
import { STATES } from 'mongoose';
import { executeOperation, parseUri } from '../collections/utils';
import { CreateCollectionOptions } from '../collections/options';

import { DataAPIClient, DSEUsernamePasswordTokenProvider } from '@datastax/astra-db-ts';

export class Connection extends MongooseConnection {
    debugType = 'StargateMongooseConnection';
    initialConnection: Promise<Connection> | null = null;

    constructor(base: any) {
        super(base);
    }

    _waitForClient() {
        return new Promise<void>((resolve, reject) => {
            const shouldWaitForClient = (this.readyState === STATES.connecting || this.readyState === STATES.disconnected) && this._shouldBufferCommands();
            if (shouldWaitForClient) {
                this._queue.push({ fn: resolve });
            } else if (this.readyState === STATES.disconnected && this.db == null) {
                reject(new Error('Connection is disconnected'));
            } else {
                resolve();
            }
        });
    }

    collection(name: string, options: any) {
        if (!(name in this.collections)) {
            this.collections[name] = new Collection(name, this, options);
        }
        return super.collection(name, options);
    }

    async createCollection(name: string, options?: Record<string, any>) {
      await this._waitForClient();
      const db = this.db;
      return db.createCollection(name, { checkExists: false, ...options });
    }

    async dropCollection(name: string) {
        return executeOperation(async () => {
            await this._waitForClient();
            const db = this.db;
            return db.dropCollection(name);
        });
    }

    async dropDatabase() {
        throw new Error('dropDatabase() Not Implemented');
    }

    async listCollections(options: { explain: true }): Promise<Array<{ name: string, options?: CreateCollectionOptions }>>;

    async listCollections(options?: { explain?: boolean }): Promise<Array<{ name: string }>> {
        return executeOperation(async () => {
            await this._waitForClient();
            const db = this.db;
            const res = await db.listCollections(options);
            return res;
        });
    }

    async listDatabases(): Promise<{ databases: string[] }> {
      return this.db._httpClient._request({
        url: this.baseUrl + '/' + this.baseApiPath,
        method: 'POST',
        data: JSON.stringify({ findNamespaces: {} }),
        timeoutManager: this.db._httpClient.timeoutManager(120_000)
      }).then((res: any) => {
        return { databases: JSON.parse(res.body ?? '{}').status?.namespaces ?? [] };
      });
    }

    async openUri(uri: string, options: any) {
        let _fireAndForget = false;
        if (options && '_fireAndForget' in options) {
            _fireAndForget = options._fireAndForget;
            delete options._fireAndForget;
        }

        // Set Mongoose-specific config options. Need to set
        // this in order to allow connection-level overrides for
        // these options.
        this.config = {
            autoCreate: options?.autoCreate,
            autoIndex: options?.autoIndex,
            sanitizeFilter: options?.sanitizeFilter,
            bufferCommands: options?.bufferCommands
        };

        for (const model of Object.values(this.models)) {
            // @ts-ignore
            model.init().catch(() => { });
        }

        this.initialConnection = this.createClient(uri, options)
            .then(() => this)
            .catch(err => {
                this.readyState = STATES.disconnected;
                throw err;
            });

        if (_fireAndForget) {
            return this;
        }

        await this.initialConnection;

        return this;
    }

    async createClient(uri: string, options: any) {
        this._connectionString = uri;
        this._closeCalled = false;
        this.readyState = STATES.connecting;

        const { baseUrl, keyspaceName, applicationToken, baseApiPath } = parseUri(uri);

        const client = options?.isAstra
          ? new DataAPIClient(applicationToken)
          : new DataAPIClient(
            new DSEUsernamePasswordTokenProvider(options?.username, options?.password)
          );
        const dbOptions = {
          namespace: keyspaceName,
          dataApiPath: baseApiPath
        };
        const db = client.db(baseUrl, dbOptions);
        const admin = client.admin(options?.isAstra
          ? applicationToken
          : new DSEUsernamePasswordTokenProvider(options?.username, options?.password)
        );

        this.client = client;
        this.db = db;
        this.admin = admin;
        this.db.name = keyspaceName;
        this.baseUrl = baseUrl;
        this.keyspaceName = keyspaceName;
        this.baseApiPath = baseApiPath;

        this.readyState = STATES.connected;
        this.onOpen();
        return this;
    }

    async createDatabase() {
      return this.db._httpClient._request({
        url: this.baseUrl + '/' + this.baseApiPath,
        method: 'POST',
        data: JSON.stringify({ createNamespace: { name: this.keyspaceName } }),
        timeoutManager: this.db._httpClient.timeoutManager(120_000)
      });
    }

    setClient(client: DataAPIClient) {
        throw new Error('SetClient not supported');
    }

    asPromise() {
        return this.initialConnection;
    }

    startSession() {
        throw new Error('startSession() Not Implemented');
    }

    /**
     *
     * @returns Client
     */
    doClose(_force?: boolean) {
        if (this.client != null) {
            this.client.close();
        }
        return this;
    }
}
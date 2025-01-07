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

import { Client } from '../collections/client';
import { Collection } from './collection';
import { default as MongooseConnection } from 'mongoose/lib/connection';
import { STATES, Model, Mongoose, ConnectOptions } from 'mongoose';
import { executeOperation } from '../collections/utils';
import { CreateCollectionOptions } from '../collections/options';

interface ConnectOptionsInternal extends ConnectOptions {
    _fireAndForget?: boolean;
    sanitizeFilter?: boolean;
}

export class Connection extends MongooseConnection {
    debugType = 'StargateMongooseConnection';
    initialConnection: Promise<Connection> | null = null;

    constructor(base: Mongoose) {
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

    collection(name: string, options?: Record<string, unknown>) {
        if (!(name in this.collections)) {
            this.collections[name] = new Collection(name, this, options);
        }
        return super.collection(name, options);
    }

    async createCollection(name: string, options?: Record<string, unknown>) {
        return executeOperation(async () => {
            await this._waitForClient();
            const db = this.client.db();
            if (!this.client.httpClient.isAstra) {
                db.createDatabase();
            }
            return db.createCollection(name, options);
        });
    }

    async dropCollection(name: string) {
        return executeOperation(async () => {
            await this._waitForClient();
            const db = this.client.db();
            return db.dropCollection(name);
        });
    }

    async dropDatabase() {
        return executeOperation(async () => {
            await this._waitForClient();
            const db = this.client.db();
            return db.dropDatabase();
        });
    }

    async listCollections(options: { explain: true }): Promise<Array<{ name: string, options?: CreateCollectionOptions }>>;

    async listCollections(options?: { explain?: boolean }): Promise<Array<{ name: string }>> {
        return executeOperation(async () => {
            await this._waitForClient();
            const db = this.client.db();
            const res = await db.findCollections(options);
            const collections = res?.status?.collections ?? [];
            return collections.map((collection: string | Record<string, unknown>) => {
                if (typeof collection === 'string') {
                    return { name: collection };
                }
                return collection;
            });
        });
    }

    async listDatabases(): Promise<{ databases: string[] }> {
        return executeOperation(async () => {
            await this._waitForClient();
            const { status } = await this.client.findNamespaces();
            return { databases: status.namespaces };
        });
    }

    async runCommand(command: Record<string, unknown>): Promise<unknown> {
        return executeOperation(async () => {
            await this._waitForClient();
            const db = this.client.db();
            return db.runCommand(command);
        });
    }

    async openUri(uri: string, options?: ConnectOptionsInternal) {
        let _fireAndForget = false;
        if (options && '_fireAndForget' in options) {
            _fireAndForget = !!options._fireAndForget;
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

        for (const model of Object.values(this.models) as Model<unknown>[]) {
            model.init().catch(() => {});
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

    async createClient(uri: string, options?: ConnectOptionsInternal) {
        this._connectionString = uri;
        this._closeCalled = false;
        this.readyState = STATES.connecting;

        const client = await Client.connect(uri, options);
        this.client = client;
        this.db = client.db();

        this.readyState = STATES.connected;
        this.onOpen();
        return this;
    }

    setClient(client: Client) {
        this.client = client;
        this.db = client.db();
    }

    asPromise() {
        return this.initialConnection;
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

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
import { AstraAdmin, DataAPIDbAdmin, Db, RawDataAPIResponse } from '@datastax/astra-db-ts';
import { default as MongooseConnection } from 'mongoose/lib/connection';
import { STATES } from 'mongoose';
import type { ConnectOptions, Mongoose, Model } from 'mongoose';
import url from 'url';

import {
    DataAPIClient,
    UsernamePasswordTokenProvider
} from '@datastax/astra-db-ts';

interface ConnectOptionsInternal extends ConnectOptions {
    isAstra?: boolean;
    _fireAndForget?: boolean;
    featureFlags?: string[];
    username?: string;
    password?: string;
    autoIndex?: boolean;
    autoCreate?: boolean;
    sanitizeFilter?: boolean;
    bufferCommands?: boolean;
}

export class Connection extends MongooseConnection {
    debugType = 'StargateMongooseConnection';
    initialConnection: Promise<Connection> | null = null;
    client: DataAPIClient | null = null;
    admin: AstraAdmin | DataAPIDbAdmin | null = null;
    db: Db | null = null;
    namespace: string | null = null;
    config?: ConnectOptionsInternal;
    baseUrl: string | null = null;
    baseApiPath: string | null = null;

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

    collection(name: string, options?: { modelName?: string }) {
        if (!(name in this.collections)) {
            this.collections[name] = new Collection(name, this, options);
        }
        return super.collection(name, options);
    }

    async createCollection(name: string, options?: Record<string, unknown>) {
        await this._waitForClient();
        return this.db!.createCollection(name, options);
    }

    async dropCollection(name: string) {
        await this._waitForClient();
        return this.db!.dropCollection(name);
    }

    async createNamespace(namespace: string) {
        await this._waitForClient();
        if (this.admin instanceof AstraAdmin) {
            throw new Error('Cannot createNamespace() in Astra');
        }
        // Use createKeyspace because createNamespace is deprecated
        return this.admin!.createKeyspace(namespace);
    }

    async dropDatabase() {
        throw new Error('dropDatabase() Not Implemented');
    }

    async listCollections() {
        await this._waitForClient();
        return this.db!.listCollections({ nameOnly: false });
    }

    async runCommand(command: Record<string, unknown>): Promise<RawDataAPIResponse> {
        await this._waitForClient();
        return this.db!.command(command);
    }

    async openUri(uri: string, options: ConnectOptionsInternal) {
        let _fireAndForget: boolean | undefined = false;
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

    async createClient(uri: string, options: ConnectOptionsInternal) {
        this._connectionString = uri;
        this._closeCalled = false;
        this.readyState = STATES.connecting;

        const { baseUrl, keyspaceName, applicationToken, baseApiPath } = parseUri(uri);

        const featureFlags: Record<string, 'true'> | null = Array.isArray(options && options.featureFlags)
            ? (options.featureFlags ?? []).reduce((obj: Record<string, 'true'>, key: string) => Object.assign(obj, { [key]: 'true' }), {})
            : null;
        this.featureFlags = featureFlags;

        const dbOptions = {
            namespace: keyspaceName,
            dataApiPath: baseApiPath
        };

        const { client, db, admin } = (() => {
            if (options?.isAstra) {
                const client = new DataAPIClient(applicationToken);
                const db = client.db(baseUrl, dbOptions);
                db.useKeyspace(keyspaceName);
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                Object.assign((db as any)._httpClient.baseHeaders, featureFlags);
                return {
                    client,
                    db,
                    admin: client.admin({ adminToken: applicationToken })
                };
            }

            if (options?.username == null) {
                throw new Error('Username and password are required when connecting to Astra');
            }
            if (options?.password == null) {
                throw new Error('Username and password are required when connecting to Astra');
            }
            const client = new DataAPIClient(
                new UsernamePasswordTokenProvider(options.username, options.password),
                { environment: 'dse' }
            );
            const db = client.db(baseUrl, dbOptions);
            db.useKeyspace(keyspaceName);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            Object.assign((db as any)._httpClient.baseHeaders, featureFlags);
            return {
                client,
                db,
                admin: db.admin({
                    environment: 'dse',
                    adminToken: new UsernamePasswordTokenProvider(options.username, options.password)
                })
            };
        })();

        const collections: Collection[] = Object.values(this.collections);
        for (const collection of collections) {
            collection._collection = undefined;
        }

        this.client = client;
        this.db = db;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (this.db as any).name = keyspaceName;
        this.admin = admin;
        this.baseUrl = baseUrl;
        this.namespace = keyspaceName;
        this.baseApiPath = baseApiPath;

        this.readyState = STATES.connected;
        this.onOpen();
        return this;
    }

    setClient(_client: DataAPIClient) {
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

interface ParsedUri {
    baseUrl: string;
    baseApiPath: string;
    keyspaceName: string;
    applicationToken?: string;
    authHeaderName?: string;
  }
  
// Parse a connection URI in the format of: https://${baseUrl}/${baseAPIPath}/${keyspace}?applicationToken=${applicationToken}
export const parseUri = (uri: string): ParsedUri => {
    const parsedUrl = url.parse(uri, true);
    const baseUrl = `${parsedUrl.protocol}//${parsedUrl.host}`;
    const keyspaceName = parsedUrl.pathname?.substring(parsedUrl.pathname?.lastIndexOf('/') + 1);
    const baseApiPath = getBaseAPIPath(parsedUrl.pathname);
    const applicationToken = parsedUrl.query?.applicationToken;
    const authHeaderName = parsedUrl.query?.authHeaderName;
    if (Array.isArray(applicationToken)) {
        throw new Error('Invalid URI: multiple application tokens');
    }
    if (Array.isArray(authHeaderName)) {
        throw new Error('Invalid URI: multiple application auth header names');
    }
    if (!keyspaceName) {
        throw new Error('Invalid URI: keyspace is required');
    }
    return {
        baseUrl,
        baseApiPath,
        keyspaceName,
        applicationToken,
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

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
import type { AstraDbAdmin, DataAPIDbAdmin, Db, FullCollectionInfo, ListCollectionsOptions } from '@datastax/astra-db-ts';
import { default as MongooseConnection } from 'mongoose/lib/connection';
import { STATES } from 'mongoose';
import type { ConnectOptions, Mongoose } from 'mongoose';
import url from 'url';

import {
    DataAPIClient,
    UsernamePasswordTokenProvider
} from '@datastax/astra-db-ts';

type ConnectOptionsInternal = ConnectOptions & {
    isAstra?: boolean;
    _fireAndForget?: boolean;
    sanitizeFilter?: boolean;
    featureFlags?: string[];
    username?: string;
    password?: string;
};

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

    collection(name: string, options?: { modelName?: string }) {
        if (!(name in this.collections)) {
            this.collections[name] = new Collection(name, this, options);
        }
        return super.collection(name, options);
    }

    async createCollection(name: string, options?: Record<string, any>) {
        await this._waitForClient();
        const db: Db = this.db;
        return db.createCollection(name, { checkExists: false, ...options });
    }

    async dropCollection(name: string) {
        await this._waitForClient();
        const db: Db = this.db;
        return db.dropCollection(name);
    }

    async dropDatabase() {
        throw new Error('dropDatabase() Not Implemented');
    }

    async listCollections(options?: ListCollectionsOptions) {
        await this._waitForClient();
        const db: Db = this.db;
        return db.listCollections();
    }

    async runCommand(command: Record<string, any>): Promise<unknown> {
        await this._waitForClient();
        const db: Db = this.db;
        return db.command(command);
    }

    async openUri(uri: string, options: ConnectOptionsInternal) {
        let _fireAndForget: boolean | undefined = false;
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
            delete collection._collection;
        }

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

interface ParsedUri {
    baseUrl: string;
    baseApiPath: string;
    keyspaceName: string;
    applicationToken: string;
    logLevel: string;
    authHeaderName: string;
  }
  
// Parse a connection URI in the format of: https://${baseUrl}/${baseAPIPath}/${keyspace}?applicationToken=${applicationToken}
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
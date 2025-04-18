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

import { Collection, MongooseCollectionOptions } from './collection';
import { AstraDbAdmin, CollectionDescriptor, CreateTableDefinition, DataAPIDbAdmin, ListCollectionsOptions, ListTablesOptions, RawDataAPIResponse, TableDescriptor } from '@datastax/astra-db-ts';
import { CollectionsDb, TablesDb } from './db';
import { default as MongooseConnection } from 'mongoose/lib/connection';
import { STATES } from 'mongoose';
import type { ConnectOptions, Mongoose, Model } from 'mongoose';
import { URL } from 'url';

import {
    DataAPIClient,
    UsernamePasswordTokenProvider
} from '@datastax/astra-db-ts';
import { StargateMongooseError } from '../stargateMongooseError';

interface ConnectOptionsInternal extends ConnectOptions {
    useTables?: boolean;
    isAstra?: boolean;
    _fireAndForget?: boolean;
    username?: string;
    password?: string;
    autoIndex?: boolean;
    autoCreate?: boolean;
    sanitizeFilter?: boolean;
    bufferCommands?: boolean;
}

/**
 * Extends Mongoose's Connection class to provide compatibility with Data API. Responsible for maintaining the
 * connection to Data API.
 */

export class Connection extends MongooseConnection {
    debugType = 'StargateMongooseConnection';
    initialConnection: Promise<Connection> | null = null;
    client: DataAPIClient | null = null;
    admin: AstraDbAdmin | DataAPIDbAdmin | null = null;
    db: CollectionsDb | TablesDb | null = null;
    namespace: string | null = null;
    config?: ConnectOptionsInternal;
    baseUrl: string | null = null;
    baseApiPath: string | null = null;
    models: Record<string, Model<unknown>> = {};

    constructor(base: Mongoose) {
        super(base);
    }

    /**
     * Helper borrowed from Mongoose to wait for the connection to finish connecting. Because Mongoose
     * supports creating a new connection, registering some models, and connecting to the database later.
     * This method is private and should not be called by clients.
     *
     * #### Example:
     *     const conn = mongoose.createConnection();
     *     // This may call `createCollection()` internally depending on `autoCreate` option, even though
     *     // this connection hasn't connected to the database yet.
     *     conn.model('Test', mongoose.Schema({ name: String }));
     *     await conn.openUri(uri);
     *
     * @ignore
     */
    async _waitForClient() {
        const shouldWaitForClient = (this.readyState === STATES.connecting || this.readyState === STATES.disconnected) && this._shouldBufferCommands();
        if (shouldWaitForClient) {
            await this._waitForConnect();
        } else if (this.readyState !== STATES.connected) {
            throw new StargateMongooseError('Connection is not connected', { readyState: this.readyState });
        }
    }

    /**
     * Get a collection by name. Cached in `this.collections`.
     * @param name
     * @param options
     */
    collection<DocType extends Record<string, unknown> = Record<string, unknown>>(name: string, options?: MongooseCollectionOptions): Collection<DocType> {
        if (!(name in this.collections)) {
            this.collections[name] = new Collection<DocType>(name, this, options);
        }
        return super.collection(name, options);
    }

    /**
     * Create a new collection in the database
     * @param name The name of the collection to create
     * @param options
     */
    async createCollection(name: string, options?: Record<string, unknown>) {
        await this._waitForClient();
        return this.db!.createCollection(name, options);
    }

    /**
     * Create a new table in the database
     * @param name
     * @param definition
     */
    async createTable(name: string, definition: CreateTableDefinition) {
        await this._waitForClient();
        return this.db!.createTable(name, definition);
    }

    /**
     * Drop a collection from the database
     * @param name
     */
    async dropCollection(name: string) {
        await this._waitForClient();
        return this.db!.dropCollection(name);
    }

    /**
     * Drop a table from the database
     * @param name The name of the table to drop
     */
    async dropTable(name: string) {
        await this._waitForClient();
        return this.db!.dropTable(name);
    }

    /**
     * Create a new namespace in the database.
     * Throws an error if connecting to Astra, as Astra does not support creating namespaces through Data API.
     *
     * @param namespace The name of the namespace to create
     */
    async createNamespace(name: string) {
        await this._waitForClient();
        if (this.admin instanceof AstraDbAdmin) {
            throw new StargateMongooseError('Cannot createNamespace() in Astra', { name });
        }
        return this.db!.astraDb._httpClient._request({
            url: this.baseUrl + '/' + this.baseApiPath,
            method: 'POST',
            data: JSON.stringify({
                createNamespace: {
                    name
                }
            }),
            timeoutManager: this.db!.astraDb._httpClient.tm.single('databaseAdminTimeoutMs', { timeout: 120_000 })
        });
    }

    /**
     * Not implemented.
     *
     * @ignore
     */
    async dropDatabase() {
        throw new Error('dropDatabase() Not Implemented');
    }

    /**
     * List all collections in the database
     */

    async listCollections(options: ListCollectionsOptions & { nameOnly: true }): Promise<string[]>;
    async listCollections(options?: ListCollectionsOptions & { nameOnly?: false }): Promise<CollectionDescriptor[]>;

    async listCollections(options?: ListCollectionsOptions) {
        await this._waitForClient();
        if (options?.nameOnly) {
            return this.db!.listCollections({ ...options, nameOnly: true });
        }
        return this.db!.listCollections({ ...options, nameOnly: false });
    }

    /**
     * List all tables in the database
     */

    async listTables(options: ListTablesOptions & { nameOnly: true }): Promise<string[]>;
    async listTables(options?: ListTablesOptions & { nameOnly?: false }): Promise<TableDescriptor[]>;

    async listTables(options?: ListTablesOptions) {
        await this._waitForClient();
        if (options?.nameOnly) {
            return this.db!.listTables({ ...options, nameOnly: true });
        }
        return this.db!.listTables({ ...options, nameOnly: false });
    }

    /**
     * Run an arbitrary Data API command on the database
     * @param command The command to run
     */
    async runCommand(command: Record<string, unknown>): Promise<RawDataAPIResponse> {
        await this._waitForClient();
        return this.db!.command(command);
    }

    /**
     * List all keyspaces. Only available in local Data API, not Astra. Called "listDatabases" for Mongoose compatibility
     */

    async listDatabases(): Promise<{ databases: { name: string }[] }> {
        if (this.admin instanceof AstraDbAdmin) {
            throw new StargateMongooseError('Cannot listDatabases in Astra');
        }
        await this._waitForClient();
        return { databases: await this.admin!.listKeyspaces().then(keyspaces => keyspaces.map(name => ({ name }))) };
    }

    /**
     * Logic for creating a connection to Data API. Mongoose calls `openUri()` internally when the
     * user calls `mongoose.create()` or `mongoose.createConnection(uri)`
     *
     * @param uri the connection string
     * @param options
     */
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

        for (const model of Object.values(this.models)) {
            model.init();
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

    /**
     * Create an astra-db-ts client and corresponding objects: client, db, admin.
     * @param uri the connection string
     * @param options
     */
    async createClient(uri: string, options: ConnectOptionsInternal) {
        this._connectionString = uri;
        this._closeCalled = false;
        this.readyState = STATES.connecting;

        const { baseUrl, keyspaceName, applicationToken, baseApiPath } = parseUri(uri);

        const dbOptions = { dataApiPath: baseApiPath };

        const { client, db, admin } = (() => {
            if (options?.isAstra) {
                const client = new DataAPIClient(applicationToken);
                const db = options.useTables
                    ? new TablesDb(client.db(baseUrl, dbOptions), keyspaceName)
                    : new CollectionsDb(client.db(baseUrl, dbOptions), keyspaceName);
                return {
                    client,
                    db,
                    admin: db.astraDb.admin({ adminToken: applicationToken })
                };
            }

            if (options?.username == null || options?.password == null) {
                throw new StargateMongooseError('Username and password are required when connecting to self-hosted DSE', { uri, options });
            }
            const client = new DataAPIClient(
                new UsernamePasswordTokenProvider(options.username, options.password),
                { environment: 'dse' }
            );
            const db = options?.useTables
                ? new TablesDb(client.db(baseUrl, dbOptions), keyspaceName)
                : new CollectionsDb(client.db(baseUrl, dbOptions), keyspaceName);
            return {
                client,
                db,
                admin: db.astraDb.admin({
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

    /**
     * Not supported
     *
     * @param _client
     * @ignore
     */

    setClient(_client: DataAPIClient) {
        throw new StargateMongooseError('SetClient not supported');
    }

    /**
     * For consistency with Mongoose's API. `mongoose.createConnection(uri)` returns the connection, **not** a promise,
     * so the Mongoose pattern to call `createConnection()` and wait for connection to succeed is
     * `await createConnection(uri).asPromise()`
     */
    asPromise() {
        return this.initialConnection;
    }

    /**
     * Not supported
     *
     * @ignore
     */

    startSession() {
        throw new StargateMongooseError('startSession() Not Implemented');
    }

    /**
     * Mongoose calls `doClose()` to close the connection when the user calls `mongoose.disconnect()` or `conn.close()`.
     * Handles closing the astra-db-ts client.
     * This method is private and should not be called by clients directly. Mongoose will call this method internally when
     * the user calls `mongoose.disconnect()` or `conn.close()`.
     *
     * @returns Client
     * @ignore
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
    const parsedUrl = new URL(uri);
    const baseUrl = `${parsedUrl.protocol}//${parsedUrl.host}`;

    const keyspaceName = parsedUrl.pathname.substring(parsedUrl.pathname.lastIndexOf('/') + 1);
    // Remove the last part of the api path (which is assumed as the keyspace name). For example:
    //  /v1/testks1 => v1
    //  /apis/v1/testks1 => apis/v1
    //  /testks1 => '' (empty string)
    const baseApiPath = parsedUrl.pathname.substring(1, parsedUrl.pathname.lastIndexOf('/') + 1);

    const applicationToken = parsedUrl.searchParams.get('applicationToken') ?? undefined;
    const authHeaderName = parsedUrl.searchParams.get('authHeaderName') ?? undefined;

    // Check for duplicate application tokens
    if (parsedUrl.searchParams.getAll('applicationToken').length > 1) {
        throw new Error('Invalid URI: multiple application tokens');
    }

    // Check for duplicate auth header names
    if (parsedUrl.searchParams.getAll('authHeaderName').length > 1) {
        throw new Error('Invalid URI: multiple application auth header names');
    }

    if (keyspaceName.length === 0) {
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

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
import {
    AstraDbAdmin,
    CollectionDescriptor,
    CreateAstraKeyspaceOptions,
    CreateCollectionOptions,
    CreateDataAPIKeyspaceOptions,
    CreateTableDefinition,
    CreateTableOptions,
    DataAPIClientOptions,
    DataAPIDbAdmin,
    DropCollectionOptions,
    DropTableOptions,
    ListCollectionsOptions,
    ListTablesOptions,
    LoggingEvent,
    RawDataAPIResponse,
    TableDescriptor,
    WithTimeout,
} from '@datastax/astra-db-ts';
import { CollectionsDb, TablesDb } from './db';
import { default as MongooseConnection } from 'mongoose/lib/connection';
import { STATES } from 'mongoose';
import type { ConnectOptions, Mongoose, Model } from 'mongoose';
import { URL } from 'url';

import {
    DataAPIClient,
    UsernamePasswordTokenProvider
} from '@datastax/astra-db-ts';
import { AstraMongooseError } from '../astraMongooseError';

interface ConnectOptionsInternal extends ConnectOptions {
    isTable?: boolean;
    isAstra?: boolean;
    _fireAndForget?: boolean;
    username?: string;
    password?: string;
    autoIndex?: boolean;
    autoCreate?: boolean;
    sanitizeFilter?: boolean;
    bufferCommands?: boolean;
    debug?: boolean | ((name: string, fn: string, ...args: unknown[]) => void) | null;
    logging?: LoggingEvent
}

/**
 * Extends Mongoose's Connection class to provide compatibility with Data API. Responsible for maintaining the
 * connection to Data API.
 */

export class Connection extends MongooseConnection {
    debugType = 'AstraMongooseConnection';
    initialConnection: Promise<Connection> | null = null;
    client: DataAPIClient | null = null;
    admin: AstraDbAdmin | DataAPIDbAdmin | null = null;
    db: CollectionsDb | TablesDb | null = null;
    keyspaceName: string | null = null;
    config?: ConnectOptionsInternal;
    baseUrl: string | null = null;
    baseApiPath: string | null = null;
    models: Record<string, Model<unknown>> = {};
    _debug?: boolean | ((name: string, fn: string, ...args: unknown[]) => void) | null;

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
            throw new AstraMongooseError('Connection is not connected', { readyState: this.readyState });
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
    async createCollection<DocType extends Record<string, unknown> = Record<string, unknown>>(
        name: string,
        options?: CreateCollectionOptions<DocType>
    ) {
        await this._waitForClient();
        return this.db!.createCollection<DocType>(name, options);
    }

    /**
     * Get current debug setting, accounting for potential changes to global debug config (`mongoose.set('debug', true | false)`)
     */
    get debug(): boolean | ((name: string, fn: string, ...args: unknown[]) => void) | null | undefined {
        return this._debug ?? this.base?.options?.debug;
    }

    /**
     * Create a new table in the database
     * @param name
     * @param definition
     */
    async createTable<DocType extends Record<string, unknown> = Record<string, unknown>>(
        name: string,
        definition: CreateTableDefinition,
        options?: Omit<CreateTableOptions, 'definition'>
    ) {
        await this._waitForClient();
        return this.db!.createTable<DocType>(name, definition, options);
    }

    /**
     * Drop a collection from the database
     * @param name
     */
    async dropCollection(name: string, options?: DropCollectionOptions) {
        await this._waitForClient();
        return this.db!.dropCollection(name, options);
    }

    /**
     * Drop a table from the database
     * @param name The name of the table to drop
     */
    async dropTable(name: string, options?: DropTableOptions) {
        await this._waitForClient();
        return this.db!.dropTable(name, options);
    }

    /**
     * Create a new keyspace.
     *
     * @param name The name of the keyspace to create
     */
    async createKeyspace(name: string, options?: CreateAstraKeyspaceOptions & CreateDataAPIKeyspaceOptions) {
        await this._waitForClient();
        return await this.admin!.createKeyspace(name, options);
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
     * List all keyspaces. Called "listDatabases" for Mongoose compatibility
     */

    async listDatabases(options?: WithTimeout<'keyspaceAdminTimeoutMs'>): Promise<{ databases: { name: string }[] }> {
        await this._waitForClient();
        return { databases: await this.admin!.listKeyspaces(options).then(keyspaces => keyspaces.map(name => ({ name }))) };
    }

    /**
     * Logic for creating a connection to Data API. Mongoose calls `openUri()` internally when the
     * user calls `mongoose.create()` or `mongoose.createConnection(uri)`
     *
     * @param uri the connection string
     * @param options
     */
    async openUri(uri: string, options?: ConnectOptionsInternal) {
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
            void model.init();
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
    async createClient(uri: string, options?: ConnectOptionsInternal) {
        this._connectionString = uri;
        this._closeCalled = false;
        this.readyState = STATES.connecting;

        const { baseUrl, keyspaceName, applicationToken, baseApiPath } = parseUri(uri);

        const dbOptions = { dataApiPath: baseApiPath };

        this._debug = options?.debug;

        const isAstra = options?.isAstra ?? true;
        const { adminToken, environment } = isAstra
            ? { adminToken: applicationToken, environment: 'astra' as const }
            : {
                adminToken: new UsernamePasswordTokenProvider(
                    options?.username || throwMissingUsernamePassword(),
                    options?.password || throwMissingUsernamePassword()
                ),
                environment: 'dse' as const
            };

        const clientOptions: DataAPIClientOptions = { environment, logging: options?.logging };
        if (options?.httpOptions != null) {
            clientOptions.httpOptions = options.httpOptions;
        }
        const client = new DataAPIClient(adminToken, clientOptions);
        const db = options?.isTable
            ? new TablesDb(client.db(baseUrl, dbOptions), keyspaceName)
            : new CollectionsDb(client.db(baseUrl, dbOptions), keyspaceName);
        const admin = isAstra
            ? db.astraDb.admin({ adminToken })
            : db.astraDb.admin({ adminToken, environment: 'dse' });

        const collections: Collection[] = Object.values(this.collections);
        for (const collection of collections) {
            collection._collection = undefined;
        }

        this.client = client;
        this.db = db;
        this.admin = admin;
        this.baseUrl = baseUrl;
        this.keyspaceName = keyspaceName;
        this.baseApiPath = baseApiPath;

        this.readyState = STATES.connected;
        this.onOpen();
        return this;

        function throwMissingUsernamePassword(): string {
            throw new AstraMongooseError(
                'Username and password are required when connecting to non-Astra deployments',
                { uri, options },
            );
        }
    }

    /**
     * Not supported
     *
     * @param _client
     * @ignore
     */

    setClient() {
        throw new AstraMongooseError('SetClient not supported');
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
        throw new AstraMongooseError('startSession() Not Implemented');
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
    doClose() {
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
    const baseApiPath = parsedUrl.pathname.substring(1, parsedUrl.pathname.lastIndexOf('/'));

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

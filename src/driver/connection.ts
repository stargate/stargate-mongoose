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

import { AstraMongooseError } from '../astraMongooseError';
import { Collection, MongooseCollectionOptions } from './collection';
import {
    AstraDbAdmin,
    CollectionDescriptor,
    CommandFailedEvent,
    CommandStartedEvent,
    CommandSucceededEvent,
    CommandWarningsEvent,
    CreateAstraKeyspaceOptions,
    CreateCollectionOptions,
    CreateDataAPIKeyspaceOptions,
    CreateTableDefinition,
    CreateTableOptions,
    DataAPIClient,
    DataAPIClientOptions,
    DataAPIDbAdmin,
    DropCollectionOptions,
    DropTableOptions,
    ListCollectionsOptions,
    ListTablesOptions,
    LoggingEvent,
    RawDataAPIResponse,
    TableDescriptor,
    UsernamePasswordTokenProvider,
    WithTimeout,
} from '@datastax/astra-db-ts';
import { CollectionsDb, TablesDb } from './db';
import { BaseConnection as MongooseConnection } from 'mongoose';
import { OperationNotSupportedError } from '../operationNotSupportedError';
import { default as MongooseConnection } from 'mongoose/lib/connection';
import { STATES } from 'mongoose';
import type { ConnectOptions, Mongoose, Model } from 'mongoose';
import { URL } from 'url';
import { Writable } from 'stream';

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
    debug?: boolean | { color?: boolean, shell?: boolean } | Writable | ((name: string, fn: string, ...args: unknown[]) => void) | null | undefined;
    logging?: LoggingEvent
}

interface ConnectionEvents {
  commandStarted: CommandStartedEvent;
  commandFailed: CommandFailedEvent;
  commandSucceeded: CommandSucceededEvent;
  commandWarnings: CommandWarningsEvent;
  // These Mongoose events don't emit any event details
  disconnected: undefined;
  connected: undefined;
  connecting: undefined;
  disconnecting: undefined;
  close: undefined;
}

/**
 * Extends Mongoose's Connection class to provide compatibility with Data API. Responsible for maintaining the
 * connection to Data API.
 */

export class Connection extends MongooseConnection {
    debugType = 'AstraMongooseConnection';
    initialConnection: Promise<this> | null = null;
    client: DataAPIClient | null = null;
    admin: AstraDbAdmin | DataAPIDbAdmin | null = null;
    // @ts-expect-error astra-mongoose Db classes don't fully extend from Mongoose Db in a TypeScript-compatible way.
    db: CollectionsDb | TablesDb | null = null;
    keyspaceName: string | null = null;
    config?: ConnectOptionsInternal;
    baseUrl: string | null = null;
    baseApiPath: string | null = null;
    models: Record<string, Model<unknown>> = {};
    // @ts-expect-error astra-mongoose collection currently doesn't fully extend from Mongoose collection in a TypeScript-compatible way.
    collections: Record<string, Collection> = {};
    _debug?: boolean | { color?: boolean, shell?: boolean } | Writable | ((name: string, fn: string, ...args: unknown[]) => void) | null | undefined;
    _connectionString: string | null = null;
    _closeCalled: boolean = false;

    // Store references to event listener functions for cleanup
    private _dbEventListeners?: {
         commandStarted: (ev: CommandStartedEvent) => void;
         commandFailed: (ev: CommandFailedEvent) => void;
         commandSucceeded: (ev: CommandSucceededEvent) => void;
         commandWarnings: (ev: CommandWarningsEvent) => void;
     };

    constructor(base: Mongoose) {
        // @ts-expect-error Mongoose connection constructor is not public in TypeScript
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
        const shouldWaitForClient = (this.readyState === STATES.connecting || this.readyState === STATES.disconnected) &&
          // @ts-expect-error _shouldBufferCommands not part of public API
          this._shouldBufferCommands();
        if (shouldWaitForClient) {
            // @ts-expect-error _waitForConnect not part of public API
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

    // @ts-expect-error astra-mongoose collection currently doesn't fully extend from Mongoose collection in a TypeScript-compatible way.
    collection<DocType extends Record<string, unknown> = Record<string, unknown>>(name: string, options?: MongooseCollectionOptions): Collection<DocType> {
        if (!(name in this.collections)) {
            // @ts-expect-error astra-mongoose collection currently doesn't fully extend from Mongoose collection in a TypeScript-compatible way.
            this.collections[name] = new Collection<DocType>(name, this, options);
        }
        return super.collection(name, options) as unknown as Collection<DocType>;
    }

    /**
     * Create a new collection in the database
     * @param name The name of the collection to create
     * @param options
     */

    // @ts-expect-error astra-mongoose collection currently doesn't fully extend from Mongoose collection in a TypeScript-compatible way.
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
        throw new OperationNotSupportedError('dropDatabase() Not Implemented');
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

    async listDatabases(options?: WithTimeout<'keyspaceAdminTimeoutMs'>): Promise<{ databases: { name: string }[], ok: 1 }> {
        await this._waitForClient();
        // `ok: 1` to be compatible with Mongoose's TypeScript types.
        return { databases: await this.admin!.listKeyspaces(options).then(keyspaces => keyspaces.map(name => ({ name }))), ok: 1 };
    }

    /**
     * Logic for creating a connection to Data API. Mongoose calls `openUri()` internally when the
     * user calls `mongoose.create()` or `mongoose.createConnection(uri)`
     *
     * @param uri the connection string
     * @param options
     */

    // @ts-expect-error astra-mongoose connection currently doesn't fully extend from Mongoose connection in a TypeScript-compatible way because of collections
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
                // @ts-expect-error readyState is read-only in Mongoose types
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
        // @ts-expect-error readyState is read-only in Mongoose types
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

        const collections = Object.values(this.collections);
        for (const collection of collections) {
            collection._collection = undefined;
        }

        this.client = client;
        this.db = db;
        this.admin = admin;
        this.baseUrl = baseUrl;
        this.keyspaceName = keyspaceName;
        this.baseApiPath = baseApiPath;

        // Bubble up db-level events from astra-db-ts to the main connection
        // Store listener references for later removal
        this._dbEventListeners = {
            commandStarted: (ev: CommandStartedEvent) => this.emit('commandStarted', ev),
            commandFailed: (ev: CommandFailedEvent) => this.emit('commandFailed', ev),
            commandSucceeded: (ev: CommandSucceededEvent) => this.emit('commandSucceeded', ev),
            commandWarnings: (ev: CommandWarningsEvent) => this.emit('commandWarnings', ev),
        };
        db.astraDb.on('commandStarted', this._dbEventListeners.commandStarted);
        db.astraDb.on('commandFailed', this._dbEventListeners.commandFailed);
        db.astraDb.on('commandSucceeded', this._dbEventListeners.commandSucceeded);
        db.astraDb.on('commandWarnings', this._dbEventListeners.commandWarnings);

        setImmediate(() => {
            // @ts-expect-error readyState is read-only in Mongoose types
            this.readyState = STATES.connected;
            // @ts-expect-error onOpen is private in Mongoose types
            this.onOpen();
        });

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

    setClient(): never {
        throw new AstraMongooseError('SetClient not supported');
    }

    /**
      * For consistency with Mongoose's API. `mongoose.createConnection(uri)` returns the connection, **not** a promise,
      * so the Mongoose pattern to call `createConnection()` and wait for connection to succeed is
      * `await createConnection(uri).asPromise()`
      */
    asPromise() {
        if (!this.initialConnection) {
            throw new AstraMongooseError('Connection not initialized');
        }
        return this.initialConnection;
    }

    /**
      * Not supported
      *
      * @ignore
      */

    startSession(): never {
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
    async doClose() {
        // Remove db-level event listeners if present
        if (this.db && this._dbEventListeners) {
            const dbEmitter = this.db.astraDb;
            dbEmitter.off('commandStarted', this._dbEventListeners.commandStarted);
            dbEmitter.off('commandFailed', this._dbEventListeners.commandFailed);
            dbEmitter.off('commandSucceeded', this._dbEventListeners.commandSucceeded);
            dbEmitter.off('commandWarnings', this._dbEventListeners.commandWarnings);
            this._dbEventListeners = undefined;
        }
        if (this.client != null) {
            await this.client.close();
        }
        return this;
    }

    override on<K extends keyof ConnectionEvents>(
        event: K,
        listener: (event: ConnectionEvents[K]) => void
    ): this {
        return super.on(event, listener);
    }

    override once<K extends keyof ConnectionEvents>(
        event: K,
        listener: (event: ConnectionEvents[K]) => void
    ): this {
        return super.once(event, listener);
    }

    override emit<K extends keyof ConnectionEvents>(
        event: K,
        eventData: ConnectionEvents[K]
    ): boolean {
        return super.emit(event, eventData);
    }
}

 interface ParsedUri {
     baseUrl: string;
     baseApiPath: string;
     keyspaceName: string;
     applicationToken?: string;
 }

// Parse a connection URI in the format of: https://${baseUrl}/${baseAPIPath}/${keyspace}?applicationToken=${applicationToken}
export const parseUri = (uri: string): ParsedUri => {
    const parsedUrl = new URL(uri);
    const baseUrl = `${parsedUrl.protocol}//${parsedUrl.host}`;


    // Remove trailing slash from pathname before use
    //  /v1/testks1/ => /v1/testks1
    //  /apis/v1/testks1/ => /apis/v1/testks1
    //  /testks1/ => /testks1
    //  / => '' (empty string)
    const pathname = parsedUrl.pathname.replace(/\/$/, '');
    const keyspaceName = pathname.substring(pathname.lastIndexOf('/') + 1);
    // Remove the last part of the api path (which is assumed as the keyspace name). For example:
    //  /v1/testks1 => v1
    //  /apis/v1/testks1 => apis/v1
    //  /testks1 => '' (empty string)
    const baseApiPath = pathname.substring(1, pathname.lastIndexOf('/'));

    const applicationToken = parsedUrl.searchParams.get('applicationToken') ?? undefined;

    // Check for duplicate application tokens
    if (parsedUrl.searchParams.getAll('applicationToken').length > 1) {
        throw new Error('Invalid URI: multiple application tokens');
    }

    if (keyspaceName.length === 0) {
        throw new Error('Invalid URI: keyspace is required');
    }
    return {
        baseUrl,
        baseApiPath,
        keyspaceName,
        applicationToken
    };
};

import { Collection } from './collection';
import { AstraAdmin, CreateTableDefinition, DataAPIDbAdmin, RawDataAPIResponse } from '@datastax/astra-db-ts';
import { Db } from './db';
import { default as MongooseConnection } from 'mongoose/lib/connection';
import type { ConnectOptions, Mongoose } from 'mongoose';
import { DataAPIClient } from '@datastax/astra-db-ts';
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
export declare class Connection extends MongooseConnection {
    static [x: string]: any;
    debugType: string;
    initialConnection: Promise<Connection> | null;
    client: DataAPIClient | null;
    admin: AstraAdmin | DataAPIDbAdmin | null;
    db: Db | null;
    namespace: string | null;
    config?: ConnectOptionsInternal;
    baseUrl: string | null;
    baseApiPath: string | null;
    constructor(base: Mongoose);
    /**
     * Helper borrowed from Mongoose to wait for the connection to finish connecting. Because Mongoose
     * supports creating a new connection, registering some models, and connecting to the database later.
     *
     * #### Example:
     *     const conn = mongoose.createConnection();
     *     // This may call `createCollection()` internally depending on `autoCreate` option, even though
     *     // this connection hasn't connected to the database yet.
     *     conn.model('Test', mongoose.Schema({ name: String }));
     *     await conn.openUri(uri);
     */
    _waitForClient(): Promise<void>;
    /**
     * Get a collection by name. Cached in `this.collections`.
     * @param name
     * @param options
     */
    collection(name: string, options?: {
        modelName?: string;
    }): Collection;
    /**
     * Create a new collection in the database
     * @param name The name of the collection to create
     * @param options
     */
    createCollection(name: string, options?: Record<string, unknown>): Promise<import("@datastax/astra-db-ts").Collection<import("@datastax/astra-db-ts").SomeDoc, import("@datastax/astra-db-ts").FoundDoc<import("@datastax/astra-db-ts").SomeDoc>>>;
    /**
     * Create a new table in the database
     * @param name
     * @param definition
     */
    createTable(name: string, definition: CreateTableDefinition): Promise<import("@datastax/astra-db-ts").Table<{
        [x: string]: {};
    }, {
        [x: string]: {};
    }, import("@datastax/astra-db-ts").FoundRow<{
        [x: string]: {};
    }>>>;
    /**
     * Drop a collection from the database
     * @param name
     */
    dropCollection(name: string): Promise<void>;
    /**
     * Drop a table from the database
     * @param name The name of the table to drop
     */
    dropTable(name: string): Promise<void>;
    /**
     * Create a new namespace in the database
     * @param namespace The name of the namespace to create
     */
    createNamespace(namespace: string): Promise<void>;
    /**
     * Drop the entire database
     */
    dropDatabase(): Promise<void>;
    /**
     * List all collections in the database
     */
    listCollections(): Promise<import("@datastax/astra-db-ts").CollectionDescriptor[]>;
    /**
     * List all tables in the database
     */
    listTables(): Promise<import("@datastax/astra-db-ts").TableDescriptor[]>;
    /**
     * Run an arbitrary Data API command on the database
     * @param command The command to run
     */
    runCommand(command: Record<string, unknown>): Promise<RawDataAPIResponse>;
    /**
     * Logic for creating a connection to Data API. Mongoose calls `openUri()` internally when the
     * user calls `mongoose.create()` or `mongoose.createConnection(uri)`
     *
     * @param uri the connection string
     * @param options
     */
    openUri(uri: string, options: ConnectOptionsInternal): Promise<this>;
    /**
     * Create an astra-db-ts client and corresponding objects: client, db, admin.
     * @param uri the connection string
     * @param options
     */
    createClient(uri: string, options: ConnectOptionsInternal): Promise<this>;
    setClient(_client: DataAPIClient): void;
    /**
     * For consistency with Mongoose's API. `mongoose.createConnection(uri)` returns the connection, **not** a promise,
     * so the Mongoose pattern to call `createConnection()` and wait for connection to succeed is
     * `await createConnection(uri).asPromise()`
     */
    asPromise(): Promise<Connection> | null;
    startSession(): void;
    /**
     * Mongoose calls `doClose()` to close the connection when the user calls `mongoose.disconnect()` or `conn.close()`.
     * Handles closing the astra-db-ts client.
     * @returns Client
     */
    doClose(_force?: boolean): this;
}
interface ParsedUri {
    baseUrl: string;
    baseApiPath: string;
    keyspaceName: string;
    applicationToken?: string;
    authHeaderName?: string;
}
export declare const parseUri: (uri: string) => ParsedUri;
export {};

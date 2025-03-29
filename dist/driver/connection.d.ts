import { Collection, MongooseCollectionOptions } from './collection';
import { AstraAdmin, CollectionDescriptor, CreateTableDefinition, DataAPIDbAdmin, ListCollectionsOptions, ListTablesOptions, RawDataAPIResponse, TableDescriptor } from '@datastax/astra-db-ts';
import { CollectionsDb, TablesDb } from './db';
import { default as MongooseConnection } from 'mongoose/lib/connection';
import type { ConnectOptions, Mongoose, Model } from 'mongoose';
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
/**
 * Extends Mongoose's Connection class to provide compatibility with Data API. Responsible for maintaining the
 * connection to Data API.
 */
export declare class Connection extends MongooseConnection {
    debugType: string;
    initialConnection: Promise<Connection> | null;
    client: DataAPIClient | null;
    admin: AstraAdmin | DataAPIDbAdmin | null;
    db: CollectionsDb | TablesDb | null;
    namespace: string | null;
    config?: ConnectOptionsInternal;
    baseUrl: string | null;
    baseApiPath: string | null;
    models: Record<string, Model<unknown>>;
    constructor(base: Mongoose);
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
    _waitForClient(): Promise<void>;
    /**
     * Get a collection by name. Cached in `this.collections`.
     * @param name
     * @param options
     */
    collection<DocType extends Record<string, unknown> = Record<string, unknown>>(name: string, options?: MongooseCollectionOptions): Collection<DocType>;
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
     * Create a new namespace in the database.
     * Throws an error if connecting to Astra, as Astra does not support creating namespaces through Data API.
     *
     * @param namespace The name of the namespace to create
     */
    createNamespace(name: string): Promise<any>;
    /**
     * Not implemented.
     *
     * @ignore
     */
    dropDatabase(): Promise<void>;
    /**
     * List all collections in the database
     */
    listCollections(options: ListCollectionsOptions & {
        nameOnly: true;
    }): Promise<string[]>;
    listCollections(options?: ListCollectionsOptions & {
        nameOnly?: false;
    }): Promise<CollectionDescriptor[]>;
    /**
     * List all tables in the database
     */
    listTables(options: ListTablesOptions & {
        nameOnly: true;
    }): Promise<string[]>;
    listTables(options?: ListTablesOptions & {
        nameOnly?: false;
    }): Promise<TableDescriptor[]>;
    /**
     * Run an arbitrary Data API command on the database
     * @param command The command to run
     */
    runCommand(command: Record<string, unknown>): Promise<RawDataAPIResponse>;
    /**
     * List all keyspaces. Only available in local Data API, not Astra. Called "listDatabases" for Mongoose compatibility
     */
    listDatabases(): Promise<{
        databases: {
            name: string;
        }[];
    }>;
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
    /**
     * Not supported
     *
     * @param _client
     * @ignore
     */
    setClient(_client: DataAPIClient): void;
    /**
     * For consistency with Mongoose's API. `mongoose.createConnection(uri)` returns the connection, **not** a promise,
     * so the Mongoose pattern to call `createConnection()` and wait for connection to succeed is
     * `await createConnection(uri).asPromise()`
     */
    asPromise(): Promise<Connection> | null;
    /**
     * Not supported
     *
     * @ignore
     */
    startSession(): void;
    /**
     * Mongoose calls `doClose()` to close the connection when the user calls `mongoose.disconnect()` or `conn.close()`.
     * Handles closing the astra-db-ts client.
     * This method is private and should not be called by clients directly. Mongoose will call this method internally when
     * the user calls `mongoose.disconnect()` or `conn.close()`.
     *
     * @returns Client
     * @ignore
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

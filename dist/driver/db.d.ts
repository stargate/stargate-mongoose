import { Db as AstraDb, Collection as AstraCollection, CollectionOptions, CreateTableDefinition, ListCollectionsOptions, ListTablesOptions, RawDataAPIResponse, Table as AstraTable, TableOptions, Collection } from '@datastax/astra-db-ts';
/**
 * Defines the base database class for interacting with Astra DB. Responsible for creating collections and tables.
 * This class abstracts the operations for both collections mode and tables mode. There is a separate TablesDb class
 * for tables and CollectionsDb class for collections.
 */
export declare abstract class BaseDb {
    astraDb: AstraDb;
    /**
     * Whether we're using "tables mode" or "collections mode". If tables mode, then `collection()` returns
     * a Table instance, **not** a Collection instance. Also, if tables mode, `createCollection()` throws an
     * error for Mongoose `syncIndexes()` compatibility reasons.
     */
    useTables: boolean;
    constructor(astraDb: AstraDb, keyspaceName: string, useTables?: boolean);
    /**
     * Return the raw HTTP client used by astra-db-ts to talk to the db.
     */
    get httpClient(): any;
    /**
     * Get a collection by name.
     * @param name The name of the collection.
     */
    abstract collection<DocType extends Record<string, unknown> = Record<string, unknown>>(name: string, options: Record<string, unknown>): AstraCollection | AstraTable<DocType>;
    /**
     * Create a new collection with the specified name and options.
     * @param name The name of the collection to be created.
     * @param options Additional options for creating the collection.
     */
    abstract createCollection(name: string, options?: Record<string, unknown>): Promise<Collection>;
    /**
     * Create a new table with the specified name and definition
     * @param name
     * @param definition
     */
    createTable(name: string, definition: CreateTableDefinition): Promise<AstraTable<{
        [x: string]: {};
    }, {
        [x: string]: {};
    }, import("@datastax/astra-db-ts").FoundRow<{
        [x: string]: {};
    }>>>;
    /**
     * Drop a collection by name.
     * @param name The name of the collection to be dropped.
     */
    dropCollection(name: string, options?: {
        timeout?: number;
    }): Promise<void>;
    /**
     * Drop a table by name. This function does **not** throw an error if the table does not exist.
     * @param name
     */
    dropTable(name: string): Promise<void>;
    /**
     * List all collections in the database.
     * @param options Additional options for listing collections.
     */
    listCollections(options: ListCollectionsOptions): Promise<string[] | import("@datastax/astra-db-ts").CollectionDescriptor[]>;
    /**
     * List all tables in the database.
     */
    listTables(options: ListTablesOptions): Promise<string[] | import("@datastax/astra-db-ts").TableDescriptor[]>;
    /**
     * Execute a command against the database.
     * @param command The command to be executed.
     */
    command(command: Record<string, unknown>): Promise<RawDataAPIResponse>;
}
/**
 * Db instance that creates and manages collections.
 * @extends BaseDb
 */
export declare class CollectionsDb extends BaseDb {
    /**
     * Creates an instance of CollectionsDb. Do not instantiate this class directly.
     * @param astraDb The AstraDb instance to interact with the database.
     * @param keyspaceName The name of the keyspace to use.
     */
    constructor(astraDb: AstraDb, keyspaceName: string);
    /**
     * Get a collection by name.
     * @param name The name of the collection.
     */
    collection<DocType extends Record<string, unknown> = Record<string, unknown>>(name: string, options: CollectionOptions): AstraCollection<DocType, import("@datastax/astra-db-ts").FoundDoc<DocType>>;
    /**
     * Send a CreateCollection command to Data API.
     */
    createCollection(name: string, options?: Record<string, unknown>): Promise<AstraCollection<import("@datastax/astra-db-ts").SomeDoc, import("@datastax/astra-db-ts").FoundDoc<import("@datastax/astra-db-ts").SomeDoc>>>;
}
/**
 * Db instance that creates and manages tables.
 * @extends BaseDb
 */
export declare class TablesDb extends BaseDb {
    /**
     * Creates an instance of TablesDb. Do not instantiate this class directly.
     * @param astraDb The AstraDb instance to interact with the database.
     * @param keyspaceName The name of the keyspace to use.
     */
    constructor(astraDb: AstraDb, keyspaceName: string);
    /**
     * Get a table by name. This method is called `collection()` for compatibility with Mongoose, which calls
     * this method for getting a Mongoose Collection instance, which may map to a table in Astra DB when using tables mode.
     * @param name The name of the table.
     */
    collection<DocType extends Record<string, unknown> = Record<string, unknown>>(name: string, options: TableOptions): AstraTable<DocType, Partial<import("@datastax/astra-db-ts").FoundRow<DocType>>, import("@datastax/astra-db-ts").FoundRow<DocType>>;
    /**
     * Throws an error, stargate-mongoose does not support creating collections in tables mode.
     */
    createCollection(name: string, options?: Record<string, unknown>): Promise<Collection<Record<string, never>>>;
}

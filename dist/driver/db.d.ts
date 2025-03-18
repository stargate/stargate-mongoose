import { Db as AstraDb, Collection as AstraCollection, CollectionOptions, CreateTableDefinition, ListCollectionsOptions, ListTablesOptions, RawDataAPIResponse, Table as AstraTable, TableOptions, Collection } from '@datastax/astra-db-ts';
export declare abstract class BaseDb {
    astraDb: AstraDb;
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
export declare class CollectionsDb extends BaseDb {
    constructor(astraDb: AstraDb, keyspaceName: string);
    /**
     * Get a collection by name.
     * @param name The name of the collection.
     */
    collection<DocType extends Record<string, unknown> = Record<string, unknown>>(name: string, options: CollectionOptions): AstraCollection<DocType, import("@datastax/astra-db-ts").FoundDoc<DocType>>;
    createCollection(name: string, options?: Record<string, unknown>): Promise<AstraCollection<import("@datastax/astra-db-ts").SomeDoc, import("@datastax/astra-db-ts").FoundDoc<import("@datastax/astra-db-ts").SomeDoc>>>;
}
export declare class TablesDb extends BaseDb {
    constructor(astraDb: AstraDb, keyspaceName: string);
    /**
     * Get a collection by name.
     * @param name The name of the collection.
     */
    collection<DocType extends Record<string, unknown> = Record<string, unknown>>(name: string, options: TableOptions): AstraTable<DocType, Partial<import("@datastax/astra-db-ts").FoundRow<DocType>>, import("@datastax/astra-db-ts").FoundRow<DocType>>;
    createCollection(_name: string, _options?: Record<string, unknown>): Promise<Collection<Record<string, never>>>;
}

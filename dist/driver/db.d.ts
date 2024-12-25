import { Db as AstraDb, CreateTableDefinition, RawDataAPIResponse } from '@datastax/astra-db-ts';
export declare class Db {
    astraDb: AstraDb;
    useTables: boolean;
    constructor(astraDb: AstraDb, keyspaceName: string, useTables?: boolean);
    /**
     * Return the raw HTTP client used by astra-db-ts to talk to the db.
     */
    get httpClient(): DataAPIHttpClient<"normal">;
    /**
     * Get a collection by name.
     * @param name The name of the collection.
     */
    collection(name: string): import("@datastax/astra-db-ts").Table<import("@datastax/astra-db-ts").SomeRow, Partial<import("@datastax/astra-db-ts").FoundRow<import("@datastax/astra-db-ts").SomeRow>>, import("@datastax/astra-db-ts").FoundRow<import("@datastax/astra-db-ts").SomeRow>> | import("@datastax/astra-db-ts").Collection<import("@datastax/astra-db-ts").SomeDoc, import("@datastax/astra-db-ts").FoundDoc<import("@datastax/astra-db-ts").SomeDoc>>;
    /**
     * Create a new collection with the specified name and options.
     * @param name The name of the collection to be created.
     * @param options Additional options for creating the collection.
     */
    createCollection(name: string, options?: Record<string, unknown>): Promise<import("@datastax/astra-db-ts").Collection<import("@datastax/astra-db-ts").SomeDoc, import("@datastax/astra-db-ts").FoundDoc<import("@datastax/astra-db-ts").SomeDoc>> | undefined>;
    /**
     * Create a new table with the specified name and definition
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
     * Drop a collection by name.
     * @param name The name of the collection to be dropped.
     */
    dropCollection(name: string): Promise<void>;
    /**
     * Drop a table by name. This function does **not** throw an error if the table does not exist.
     * @param name
     */
    dropTable(name: string): Promise<void>;
    /**
     * Drop an index by name
     * @param name
     */
    dropTableIndex(name: string): Promise<void>;
    /**
     * List all collections in the database.
     * @param options Additional options for listing collections.
     */
    listCollections(options: Record<string, unknown>): Promise<import("@datastax/astra-db-ts").CollectionDescriptor[]>;
    /**
     * List all tables in the database.
     */
    listTables(): Promise<import("@datastax/astra-db-ts").TableDescriptor[]>;
    /**
     * Execute a command against the database.
     * @param command The command to be executed.
     */
    command(command: Record<string, unknown>): Promise<RawDataAPIResponse>;
}

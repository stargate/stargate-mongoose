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

import {
    Collection,
    Collection as AstraCollection,
    CollectionDescriptor,
    CollectionOptions,
    CreateTableDefinition,
    Db as AstraDb,
    DropCollectionOptions,
    ListCollectionsOptions,
    ListTablesOptions,
    RawDataAPIResponse,
    Table as AstraTable,
    TableDescriptor,
    TableOptions,
    CreateTableOptions,
    DropTableOptions,
    CreateCollectionOptions,
} from '@datastax/astra-db-ts';
import { AstraMongooseError } from '../astraMongooseError';

/**
 * Defines the base database class for interacting with Astra DB. Responsible for creating collections and tables.
 * This class abstracts the operations for both collections mode and tables mode. There is a separate TablesDb class
 * for tables and CollectionsDb class for collections.
 */
export abstract class BaseDb {
    astraDb: AstraDb;
    /**
     * Whether we're using "tables mode" or "collections mode". If tables mode, then `collection()` returns
     * a Table instance, **not** a Collection instance. Also, if tables mode, `createCollection()` throws an
     * error for Mongoose `syncIndexes()` compatibility reasons.
     */
    isTable: boolean;
    name: string;

    constructor(astraDb: AstraDb, keyspaceName: string, isTable?: boolean) {
        this.astraDb = astraDb;
        astraDb.useKeyspace(keyspaceName);
        this.isTable = !!isTable;
        this.name = keyspaceName;
    }

    /**
     * Get a collection by name.
     * @param name The name of the collection.
     */
    abstract collection<DocType extends Record<string, unknown> = Record<string, unknown>>(name: string, options: Record<string, unknown>): AstraCollection<DocType> | AstraTable<DocType>;

    /**
     * Create a new collection with the specified name and options.
     * @param name The name of the collection to be created.
     * @param options Additional options for creating the collection.
     */
    abstract createCollection<DocType extends Record<string, unknown> = Record<string, unknown>>(
        name: string,
        options?: CreateCollectionOptions<DocType>
    ): Promise<Collection<DocType>>;

    /**
     * Create a new table with the specified name and definition
     * @param name
     * @param definition
     */

    async createTable<DocType extends Record<string, unknown> = Record<string, unknown>>(
        name: string,
        definition: CreateTableDefinition,
        options?: Omit<CreateTableOptions, 'definition'>
    ) {
        return this.astraDb.createTable<DocType>(name, { ...options, definition });
    }

    /**
     * Drop a collection by name.
     * @param name The name of the collection to be dropped.
     */
    async dropCollection(name: string, options?: DropCollectionOptions) {
        return this.astraDb.dropCollection(name, options);
    }

    /**
     * Drop a table by name. This function does **not** throw an error if the table does not exist.
     * @param name
     */
    async dropTable(name: string, options?: DropTableOptions) {
        return this.astraDb.dropTable(name, {
            ifExists: true,
            ...options
        });
    }

    /**
     * List all collections in the database.
     * @param options Additional options for listing collections.
     */

    async listCollections(options: ListCollectionsOptions & { nameOnly: true }): Promise<string[]>;
    async listCollections(options?: ListCollectionsOptions & { nameOnly?: false }): Promise<CollectionDescriptor[]>;

    async listCollections(options?: ListCollectionsOptions) {
        if (options?.nameOnly) {
            return this.astraDb.listCollections({ ...options, nameOnly: true });
        }
        return this.astraDb.listCollections({ ...options, nameOnly: false });
    }

    /**
     * List all tables in the database.
     */
    async listTables(options: ListTablesOptions & { nameOnly: true }): Promise<string[]>;
    async listTables(options?: ListTablesOptions & { nameOnly?: false }): Promise<TableDescriptor[]>;

    async listTables(options?: ListTablesOptions) {
        if (options?.nameOnly) {
            return this.astraDb.listTables({ ...options, nameOnly: true });
        }
        return this.astraDb.listTables({ ...options, nameOnly: false });
    }

    /**
     * Execute a command against the database.
     * @param command The command to be executed.
     */
    async command(command: Record<string, unknown>): Promise<RawDataAPIResponse> {
        return this.astraDb.command(command);
    }
}

/**
 * Db instance that creates and manages collections.
 * @extends BaseDb
 */
export class CollectionsDb extends BaseDb {
    /**
     * Creates an instance of CollectionsDb. Do not instantiate this class directly.
     * @param astraDb The AstraDb instance to interact with the database.
     * @param keyspaceName The name of the keyspace to use.
     */
    constructor(astraDb: AstraDb, keyspaceName: string) {
        super(astraDb, keyspaceName, false);
    }

    /**
     * Get a collection by name.
     * @param name The name of the collection.
     */
    collection<DocType extends Record<string, unknown> = Record<string, unknown>>(name: string, options: CollectionOptions) {
        return this.astraDb.collection<DocType>(name, options);
    }

    /**
     * Send a CreateCollection command to Data API.
     */
    createCollection<DocType extends Record<string, unknown> = Record<string, unknown>>(name: string, options?: CreateCollectionOptions<DocType>) {
        return this.astraDb.createCollection<DocType>(name, options);
    }
}

/**
 * Db instance that creates and manages tables.
 * @extends BaseDb
 */
export class TablesDb extends BaseDb {
    /**
     * Creates an instance of TablesDb. Do not instantiate this class directly.
     * @param astraDb The AstraDb instance to interact with the database.
     * @param keyspaceName The name of the keyspace to use.
     */
    constructor(astraDb: AstraDb, keyspaceName: string) {
        super(astraDb, keyspaceName, true);
    }

    /**
     * Get a table by name. This method is called `collection()` for compatibility with Mongoose, which calls
     * this method for getting a Mongoose Collection instance, which may map to a table in Astra DB when using tables mode.
     * @param name The name of the table.
     */
    collection<DocType extends Record<string, unknown> = Record<string, unknown>>(name: string, options: TableOptions) {
        return this.astraDb.table<DocType>(name, options);
    }

    /**
     * Throws an error, astra-mongoose does not support creating collections in tables mode.
     */
    createCollection<DocType extends Record<string, unknown> = Record<string, unknown>>(
        name: string,
        options?: CreateCollectionOptions<DocType>
    ): Promise<Collection<DocType>> {
        throw new AstraMongooseError('Cannot createCollection in tables mode; use createTable instead', { name, options });
    }
}

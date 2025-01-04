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

import { Db as AstraDb, CreateTableDefinition, ListTablesOptions, RawDataAPIResponse } from '@datastax/astra-db-ts';

export class Db {
    astraDb: AstraDb;
    // Whether we're using "tables mode" or "collections mode". If tables mode, then `collection()` returns
    // a Table instance, **not** a Collection instance. Also, if tables mode, `createCollection()` throws an
    // error for Mongoose `syncIndexes()` compatibility reasons.
    useTables: boolean;

    constructor(astraDb: AstraDb, keyspaceName: string, useTables?: boolean) {
        this.astraDb = astraDb;
        astraDb.useKeyspace(keyspaceName);
        this.useTables = !!useTables;
    }

    /**
     * Return the raw HTTP client used by astra-db-ts to talk to the db.
     */
    get httpClient() {
        return this.astraDb._httpClient;
    }

    /**
     * Get a collection by name.
     * @param name The name of the collection.
     */
    collection<DocType extends Record<string, unknown> = Record<string, unknown>>(name: string) {
        if (this.useTables) {
            return this.astraDb.table<DocType>(name);
        }
        return this.astraDb.collection<DocType>(name);
    }

    /**
     * Create a new collection with the specified name and options.
     * @param name The name of the collection to be created.
     * @param options Additional options for creating the collection.
     */
    async createCollection(name: string, options?: Record<string, unknown>) {
        if (this.useTables) {
            throw new Error('Cannot createCollection in tables mode');
        }
        return this.astraDb.createCollection(name, options);
    }

    /**
     * Create a new table with the specified name and definition
     * @param name
     * @param definition
     */

    async createTable(name: string, definition: CreateTableDefinition) {
        return this.astraDb.createTable(name, { definition });
    }

    /**
     * Drop a collection by name.
     * @param name The name of the collection to be dropped.
     */
    async dropCollection(name: string) {
        return this.astraDb.dropCollection(name);
    }

    /**
     * Drop a table by name. This function does **not** throw an error if the table does not exist.
     * @param name
     */
    async dropTable(name: string) {
        return this.astraDb.dropTable(name).catch(err => {
            // For consistency with Mongoose, ignore errors if the table does not exist.
            if (err.errorDescriptors?.[0].errorCode === 'CANNOT_DROP_UNKNOWN_TABLE') {
                return;
            }
            throw err;
        });
    }

    /**
     * List all collections in the database.
     * @param options Additional options for listing collections.
     */
    async listCollections(options: Record<string, unknown>) {
        return this.astraDb.listCollections({ nameOnly: false, ...options });
    }

    /**
     * List all tables in the database.
     */
    async listTables(options: ListTablesOptions) {
        if (options.nameOnly) {
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
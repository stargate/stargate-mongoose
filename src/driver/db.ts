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

import { Db as AstraDb, RawDataAPIResponse } from '@datastax/astra-db-ts';

export class Db {
    astraDb: AstraDb;
    useTables: boolean;

    constructor(astraDb: AstraDb, keyspaceName: string, useTables?: boolean) {
        this.astraDb = astraDb;
        astraDb.useKeyspace(keyspaceName);
        this.useTables = !!useTables;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    get httpClient(): any {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return (this.astraDb as any)._httpClient;
    }

    /**
   * Get a collection by name.
   * @param name The name of the collection.
   */

    collection(name: string) {
        if (this.useTables) {
            return this.astraDb.table(name);
        }
        return this.astraDb.collection(name);
    }

    /**
   * Create a new collection with the specified name and options.
   * @param name The name of the collection to be created.
   * @param options Additional options for creating the collection.
   */

    async createCollection(name: string, options?: Record<string, unknown>) {
        if (this.useTables) {
            // No-op because Mongoose's `syncIndexes()` calls `createCollection()`
            return;
        }
        return this.astraDb.createCollection(name, options);
    }

    /**
     * Drop a collection by name.
     * @param name The name of the collection to be dropped.
     */

    async dropCollection(name: string) {
        if (this.useTables) {
            throw new Error('Cannot dropCollection in tables mode');
        }
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

    async listTables() {
        return this.astraDb.listTables();
    }

    /**
     * Execute a command against the database.
     * @param command The command to be executed.
     */

    async command(command: Record<string, unknown>): Promise<RawDataAPIResponse> {
        return this.astraDb.command(command);
    }
}
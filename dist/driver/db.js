"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.TablesDb = exports.CollectionsDb = exports.BaseDb = void 0;
class BaseDb {
    constructor(astraDb, keyspaceName, useTables) {
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
     * Create a new table with the specified name and definition
     * @param name
     * @param definition
     */
    async createTable(name, definition) {
        return this.astraDb.createTable(name, { definition });
    }
    /**
     * Drop a collection by name.
     * @param name The name of the collection to be dropped.
     */
    async dropCollection(name) {
        return this.astraDb.dropCollection(name);
    }
    /**
     * Drop a table by name. This function does **not** throw an error if the table does not exist.
     * @param name
     */
    async dropTable(name) {
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
    async listCollections(options) {
        if (options.nameOnly) {
            return this.astraDb.listCollections({ ...options, nameOnly: true });
        }
        return this.astraDb.listCollections({ ...options, nameOnly: false });
    }
    /**
     * List all tables in the database.
     */
    async listTables(options) {
        if (options.nameOnly) {
            return this.astraDb.listTables({ ...options, nameOnly: true });
        }
        return this.astraDb.listTables({ ...options, nameOnly: false });
    }
    /**
     * Execute a command against the database.
     * @param command The command to be executed.
     */
    async command(command) {
        return this.astraDb.command(command);
    }
}
exports.BaseDb = BaseDb;
class CollectionsDb extends BaseDb {
    constructor(astraDb, keyspaceName) {
        super(astraDb, keyspaceName, false);
    }
    /**
     * Get a collection by name.
     * @param name The name of the collection.
     */
    collection(name, options) {
        return this.astraDb.collection(name, options);
    }
    async createCollection(name, options) {
        return this.astraDb.createCollection(name, options);
    }
}
exports.CollectionsDb = CollectionsDb;
class TablesDb extends BaseDb {
    constructor(astraDb, keyspaceName) {
        super(astraDb, keyspaceName, true);
    }
    /**
     * Get a collection by name.
     * @param name The name of the collection.
     */
    collection(name, options) {
        return this.astraDb.table(name, options);
    }
    async createCollection(name, _options) {
        // throw new Error('Cannot createCollection in tables mode');
        return this.astraDb.collection(name);
    }
}
exports.TablesDb = TablesDb;
//# sourceMappingURL=db.js.map
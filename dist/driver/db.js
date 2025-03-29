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
const stargateMongooseError_1 = require("src/stargateMongooseError");
/**
 * Defines the base database class for interacting with Astra DB. Responsible for creating collections and tables.
 * This class abstracts the operations for both collections mode and tables mode. There is a separate TablesDb class
 * for tables and CollectionsDb class for collections.
 */
class BaseDb {
    constructor(astraDb, keyspaceName, useTables) {
        this.astraDb = astraDb;
        this.httpClient.baseHeaders['Feature-Flag-tables'] = 'true';
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
    async dropCollection(name, options) {
        return this.astraDb.dropCollection(name, options);
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
/**
 * Db instance that creates and manages collections.
 * @extends BaseDb
 */
class CollectionsDb extends BaseDb {
    /**
     * Creates an instance of CollectionsDb. Do not instantiate this class directly.
     * @param astraDb The AstraDb instance to interact with the database.
     * @param keyspaceName The name of the keyspace to use.
     */
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
    /**
     * Send a CreateCollection command to Data API.
     */
    createCollection(name, options) {
        return this.astraDb.createCollection(name, options);
    }
}
exports.CollectionsDb = CollectionsDb;
/**
 * Db instance that creates and manages tables.
 * @extends BaseDb
 */
class TablesDb extends BaseDb {
    /**
     * Creates an instance of TablesDb. Do not instantiate this class directly.
     * @param astraDb The AstraDb instance to interact with the database.
     * @param keyspaceName The name of the keyspace to use.
     */
    constructor(astraDb, keyspaceName) {
        super(astraDb, keyspaceName, true);
    }
    /**
     * Get a table by name. This method is called `collection()` for compatibility with Mongoose, which calls
     * this method for getting a Mongoose Collection instance, which may map to a table in Astra DB when using tables mode.
     * @param name The name of the table.
     */
    collection(name, options) {
        return this.astraDb.table(name, options);
    }
    /**
     * Throws an error, stargate-mongoose does not support creating collections in tables mode.
     */
    createCollection(name, options) {
        throw new stargateMongooseError_1.StargateMongooseError('Cannot createCollection in tables mode', { name, options });
    }
}
exports.TablesDb = TablesDb;
//# sourceMappingURL=db.js.map
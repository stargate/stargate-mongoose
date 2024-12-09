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
exports.StargateAstraError = exports.Db = void 0;
const options_1 = require("./options");
const collection_1 = require("./collection");
const utils_1 = require("./utils");
class Db {
    constructor(httpClient, name) {
        if (!name) {
            throw new Error('Db: name is required');
        }
        this.rootHttpClient = httpClient;
        // use a clone of the underlying http client to support multiple db's from a single connection
        this.httpClient = httpClient;
        this.name = name;
        this.collections = new Map();
        this.httpBasePath = `/${name}`;
    }
    /**
   *
   * @param collectionName
   * @returns Collection
   */
    collection(collectionName) {
        if (!collectionName) {
            throw new Error('Db: collection name is required');
        }
        const collection = this.collections.get(collectionName);
        if (collection != null) {
            return collection;
        }
        const newCollection = new collection_1.Collection(this, collectionName);
        this.collections.set(collectionName, newCollection);
        return newCollection;
    }
    /**
   *
   * @param collectionName
   * @param options
   * @returns Promise
   */
    async createCollection(collectionName, options) {
        if (collectionName == null) {
            throw new TypeError(`Must specify a collection name when calling createCollection, got ${collectionName}`);
        }
        return (0, utils_1.executeOperation)(async () => {
            const command = {
                createCollection: {
                    name: collectionName,
                    ...(options == null ? {} : { options })
                }
            };
            return await this.httpClient.executeCommandWithUrl(this.httpBasePath, command, options_1.createCollectionOptionsKeys);
        });
    }
    /**
   *
   * @param collectionName
   * @returns APIResponse
   */
    async dropCollection(collectionName) {
        if (collectionName == null) {
            throw new TypeError(`Must specify a collection name when calling dropCollection, got ${collectionName}`);
        }
        const command = {
            deleteCollection: {
                name: collectionName
            }
        };
        return await this.httpClient.executeCommandWithUrl(this.httpBasePath, command, options_1.retainNoOptions);
    }
    /**
   *
   * @returns Promise
   */
    async dropDatabase() {
        if (this.rootHttpClient.isAstra) {
            throw new StargateAstraError('Cannot drop database in Astra. Please use the Astra UI to drop the database.');
        }
        return await (0, utils_1.dropNamespace)(this.rootHttpClient, this.name);
    }
    /**
   *
   * @returns Promise
   */
    async createDatabase() {
        return await (0, utils_1.createNamespace)(this.rootHttpClient, this.name);
    }
    async findCollections(options) {
        return (0, utils_1.executeOperation)(async () => {
            const command = {
                findCollections: options != null ? { options } : {}
            };
            return await this.httpClient.executeCommandWithUrl('/' + this.name, command, options_1.listCollectionOptionsKeys);
        });
    }
    async runCommand(command) {
        return (0, utils_1.executeOperation)(async () => {
            return await this.httpClient.executeCommandWithUrl('/' + this.name, command, options_1.retainNoOptions);
        });
    }
}
exports.Db = Db;
class StargateAstraError extends Error {
    constructor(message) {
        super(message);
        this.message = message;
    }
}
exports.StargateAstraError = StargateAstraError;
//# sourceMappingURL=db.js.map
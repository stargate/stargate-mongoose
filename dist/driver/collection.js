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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OperationNotSupportedError = exports.Collection = void 0;
exports.setDefaultIdForUpsert = setDefaultIdForUpsert;
const collection_1 = __importDefault(require("mongoose/lib/collection"));
const astra_db_ts_1 = require("@datastax/astra-db-ts");
const serialize_1 = require("../serialize");
const deserializeDoc_1 = __importDefault(require("../deserializeDoc"));
const mongoose_1 = require("mongoose");
/**
 * Collection operations supported by the driver. This class is called "Collection" for consistency with Mongoose, because
 * in Mongoose a Collection is the interface that Models and Queries use to communicate with the database. However, from
 * an Astra perspective, this class can be a wrapper around a Collection **or** a Table depending on the corresponding db's
 * `useTables` option.
 */
class Collection extends collection_1.default {
    constructor(name, conn, options) {
        super(name, conn, options);
        this.debugType = 'StargateMongooseCollection';
        this.connection = conn;
        this._closed = false;
        this.options = options;
    }
    // Get the collection or table. Cache the result so we don't recreate collection/table every time.
    get collection() {
        if (this._collection != null) {
            return this._collection;
        }
        const collectionOptions = this.options?.schemaUserProvidedOptions?.serdes
            // Type coercion because `collection<>` method below doesn't know whether we're creating a
            // Astra Table or Astra Collection until runtime
            ? { serdes: this.options.schemaUserProvidedOptions.serdes }
            : {};
        // Cache because @datastax/astra-db-ts doesn't
        const collection = this.connection.db.collection(this.name, collectionOptions);
        this._collection = collection;
        return collection;
    }
    // Get whether the underlying Astra store is a table or a collection. `connection.db` may be `null` if
    // the connection has never been opened (`mongoose.connect()` or `openUri()` never called), so in that
    // case we default to `useTables: false`.
    get useTables() {
        return this.connection.db?.useTables;
    }
    /**
     * Count documents in the collection that match the given filter.
     * @param filter
     */
    countDocuments(filter) {
        if (this.collection instanceof astra_db_ts_1.Table) {
            throw new OperationNotSupportedError('Cannot use countDocuments() with tables');
        }
        filter = (0, serialize_1.serialize)(filter);
        return this.collection.countDocuments(filter, 1000);
    }
    /**
     * Find documents in the collection that match the given filter.
     * @param filter
     * @param options
     * @param callback
     */
    find(filter, options) {
        const requestOptions = options != null && options.sort != null
            ? { ...options, sort: processSortOption(options.sort) }
            : { ...options, sort: undefined };
        filter = (0, serialize_1.serialize)(filter, this.useTables);
        // Weirdness to work around astra-db-ts method overrides: `find()` with `projection: never` means we need a separate branch
        if (this.collection instanceof astra_db_ts_1.Table) {
            return this.collection.find(filter, requestOptions).map(doc => (0, deserializeDoc_1.default)(doc));
        }
        else {
            return this.collection.find(filter, requestOptions).map(doc => (0, deserializeDoc_1.default)(doc));
        }
    }
    /**
     * Find a single document in the collection that matches the given filter.
     * @param filter
     * @param options
     */
    async findOne(filter, options) {
        // Weirdness to work around astra-db-ts method overrides
        if (options == null) {
            filter = (0, serialize_1.serialize)(filter, this.useTables);
            if (this.collection instanceof astra_db_ts_1.Table) {
                return this.collection.findOne(filter).then(doc => (0, deserializeDoc_1.default)(doc));
            }
            return this.collection.findOne(filter).then(doc => (0, deserializeDoc_1.default)(doc));
        }
        const requestOptions = options != null && options.sort != null
            ? { ...options, sort: processSortOption(options.sort) }
            : { ...options, sort: undefined };
        filter = (0, serialize_1.serialize)(filter, this.useTables);
        // Weirdness to work around astra-db-ts method overrides: `findOne()` with `projection: never` means we need a separate branch
        if (this.collection instanceof astra_db_ts_1.Table) {
            return this.collection.findOne(filter, requestOptions).then(doc => (0, deserializeDoc_1.default)(doc));
        }
        else {
            return this.collection.findOne(filter, requestOptions).then(doc => (0, deserializeDoc_1.default)(doc));
        }
    }
    /**
     * Insert a single document into the collection.
     * @param doc
     */
    insertOne(doc) {
        return this.collection.insertOne((0, serialize_1.serialize)(doc, this.useTables));
    }
    /**
     * Insert multiple documents into the collection.
     * @param documents
     * @param options
     */
    async insertMany(documents, options) {
        documents = documents.map(doc => (0, serialize_1.serialize)(doc, this.useTables));
        return this.collection.insertMany(documents, options);
    }
    /**
     * Update a single document in a collection.
     * @param filter
     * @param update
     * @param options
     */
    async findOneAndUpdate(filter, update, options) {
        if (this.collection instanceof astra_db_ts_1.Table) {
            throw new OperationNotSupportedError('Cannot use findOneAndUpdate() with tables');
        }
        const requestOptions = options.sort != null
            ? { ...options, sort: processSortOption(options.sort) }
            : { ...options, sort: undefined };
        filter = (0, serialize_1.serialize)(filter);
        setDefaultIdForUpsert(filter, update, requestOptions, false);
        update = (0, serialize_1.serialize)(update);
        // Weirdness to work around TypeScript, otherwise TypeScript fails with
        // "Types of property 'includeResultMetadata' are incompatible: Type 'boolean | undefined' is not assignable to type 'false | undefined'."
        if (options?.includeResultMetadata) {
            return this.collection.findOneAndUpdate(filter, update, requestOptions).then((value) => {
                return { value: (0, deserializeDoc_1.default)(value) };
            });
        }
        else {
            return this.collection.findOneAndUpdate(filter, update, requestOptions).then((doc) => (0, deserializeDoc_1.default)(doc));
        }
    }
    /**
     * Find a single document in the collection and delete it.
     * @param filter
     * @param options
     */
    async findOneAndDelete(filter, options) {
        if (this.collection instanceof astra_db_ts_1.Table) {
            throw new OperationNotSupportedError('Cannot use findOneAndDelete() with tables');
        }
        const requestOptions = options.sort != null
            ? { ...options, sort: processSortOption(options.sort) }
            : { ...options, sort: undefined };
        filter = (0, serialize_1.serialize)(filter);
        // Weirdness to work around TypeScript, otherwise TypeScript fails with
        // "Types of property 'includeResultMetadata' are incompatible: Type 'boolean | undefined' is not assignable to type 'false | undefined'."
        if (options?.includeResultMetadata) {
            return this.collection.findOneAndDelete(filter, requestOptions).then((value) => {
                return { value: (0, deserializeDoc_1.default)(value) };
            });
        }
        else {
            return this.collection.findOneAndDelete(filter, requestOptions).then((doc) => (0, deserializeDoc_1.default)(doc));
        }
    }
    /**
     * Find a single document in the collection and replace it.
     * @param filter
     * @param newDoc
     * @param options
     */
    async findOneAndReplace(filter, newDoc, options) {
        if (this.collection instanceof astra_db_ts_1.Table) {
            throw new OperationNotSupportedError('Cannot use findOneAndReplace() with tables');
        }
        const requestOptions = options.sort != null
            ? { ...options, sort: processSortOption(options.sort) }
            : { ...options, sort: undefined };
        filter = (0, serialize_1.serialize)(filter);
        setDefaultIdForUpsert(filter, newDoc, requestOptions, true);
        newDoc = (0, serialize_1.serialize)(newDoc);
        // Weirdness to work around TypeScript, otherwise TypeScript fails with
        // "Types of property 'includeResultMetadata' are incompatible: Type 'boolean | undefined' is not assignable to type 'false | undefined'."
        if (options?.includeResultMetadata) {
            return this.collection.findOneAndReplace(filter, newDoc, requestOptions).then((value) => {
                return { value: (0, deserializeDoc_1.default)(value) };
            });
        }
        else {
            return this.collection.findOneAndReplace(filter, newDoc, requestOptions).then((doc) => (0, deserializeDoc_1.default)(doc));
        }
    }
    /**
     * Delete one or more documents in a collection that match the given filter.
     * @param filter
     */
    deleteMany(filter) {
        filter = (0, serialize_1.serialize)(filter, this.useTables);
        return this.collection.deleteMany(filter);
    }
    /**
     * Delete a single document in a collection that matches the given filter.
     * @param filter
     * @param options
     * @param callback
     */
    deleteOne(filter, options) {
        const requestOptions = options.sort != null
            ? { ...options, sort: processSortOption(options.sort) }
            : { ...options, sort: undefined };
        filter = (0, serialize_1.serialize)(filter, this.useTables);
        return this.collection.deleteOne(filter, requestOptions);
    }
    /**
     * Update a single document in a collection that matches the given filter, replacing it with `replacement`.
     * Converted to a `findOneAndReplace()` under the hood.
     * @param filter
     * @param replacement
     * @param options
     */
    replaceOne(filter, replacement, options) {
        if (this.collection instanceof astra_db_ts_1.Table) {
            throw new OperationNotSupportedError('Cannot use replaceOne() with tables');
        }
        const requestOptions = options.sort != null
            ? { ...options, sort: processSortOption(options.sort) }
            : { ...options, sort: undefined };
        filter = (0, serialize_1.serialize)(filter);
        setDefaultIdForUpsert(filter, replacement, requestOptions, true);
        replacement = (0, serialize_1.serialize)(replacement);
        return this.collection.replaceOne(filter, replacement, requestOptions);
    }
    /**
     * Update a single document in a collection that matches the given filter.
     * @param filter
     * @param update
     * @param options
     */
    updateOne(filter, update, options) {
        const requestOptions = options.sort != null
            ? { ...options, sort: processSortOption(options.sort) }
            : { ...options, sort: undefined };
        filter = (0, serialize_1.serialize)(filter, this.useTables);
        setDefaultIdForUpsert(filter, update, requestOptions, false);
        update = (0, serialize_1.serialize)(update, this.useTables);
        return this.collection.updateOne(filter, update, requestOptions).then(res => {
            // Mongoose currently has a bug where null response from updateOne() throws an error that we can't
            // catch here for unknown reasons. See Automattic/mongoose#15126. Tables API returns null here.
            return res ?? {};
        });
    }
    /**
     * Update multiple documents in a collection that match the given filter.
     * @param filter
     * @param update
     * @param options
     */
    updateMany(filter, update, options) {
        if (this.collection instanceof astra_db_ts_1.Table) {
            throw new OperationNotSupportedError('Cannot use updateMany() with tables');
        }
        filter = (0, serialize_1.serialize)(filter, this.useTables);
        setDefaultIdForUpsert(filter, update, options, false);
        update = (0, serialize_1.serialize)(update, this.useTables);
        return this.collection.updateMany(filter, update, options);
    }
    /**
     * Get the estimated number of documents in a collection based on collection metadata
     */
    estimatedDocumentCount() {
        if (this.collection instanceof astra_db_ts_1.Table) {
            throw new OperationNotSupportedError('Cannot use estimatedDocumentCount() with tables');
        }
        return this.collection.estimatedDocumentCount();
    }
    /**
     * Run an arbitrary command against this collection's http client
     * @param command
     */
    runCommand(command) {
        return this.collection._httpClient.executeCommand(command, {
            timeoutManager: this.collection._httpClient.tm.single('runCommandTimeoutMS', 60000)
        });
    }
    /**
     * Bulk write not supported.
     * @param ops
     * @param options
     */
    bulkWrite(_ops, _options) {
        throw new OperationNotSupportedError('bulkWrite() Not Implemented');
    }
    /**
     * Aggregate not supported.
     * @param pipeline
     * @param options
     */
    aggregate(_pipeline, _options) {
        throw new OperationNotSupportedError('aggregate() Not Implemented');
    }
    /**
     * Returns a list of all indexes on the collection. Returns a pseudo-cursor for Mongoose compatibility.
     * Only works in tables mode, throws an error in collections mode.
     */
    listIndexes() {
        if (this.collection instanceof astra_db_ts_1.Collection) {
            throw new OperationNotSupportedError('Cannot use listIndexes() with collections');
        }
        // TypeScript isn't able to infer that `this.collection` is an AstraTable here, so we need to cast it.
        const collection = this.collection;
        /**
         * Mongoose expects listIndexes() to return a cursor but Astra returns an array. Mongoose itself doesn't support
         * returning a cursor from Model.listIndexes(), so all we need to return is an object with a toArray() function.
         */
        return {
            // Mongoose uses the `key` property of an index for index diffing in `cleanIndexes()` and `syncIndexes()`.
            toArray: () => collection.listIndexes().then(indexes => indexes.map(index => ({ ...index, key: { [index.definition.column]: 1 } })))
        };
    }
    /**
     * Create a new index. Only works in tables mode, throws an error in collections mode.
     *
     * @param indexSpec MongoDB-style index spec for Mongoose compatibility
     * @param options
     */
    async createIndex(indexSpec, options) {
        if (this.collection instanceof astra_db_ts_1.Collection) {
            throw new OperationNotSupportedError('Cannot use createIndex() with collections');
        }
        if (Object.keys(indexSpec).length !== 1) {
            throw new TypeError('createIndex indexSpec must have exactly 1 key');
        }
        const [column] = Object.keys(indexSpec);
        return this.collection.createIndex(options?.name ?? column, column, options).catch((error) => {
            if (error instanceof astra_db_ts_1.DataAPIResponseError) {
                // This error occurs if we try to create an index that already exists with same name and options.
                // Ignore this error for Mongoose compatibility.
                if (error.errorDescriptors?.[0]?.errorCode === 'CANNOT_ADD_EXISTING_INDEX') {
                    return;
                }
            }
            throw error;
        });
    }
    /**
     * Create a new vector index. Only works in tables mode, throws an error in collections mode.
     *
     * @param name
     * @param column
     * @param options
     */
    async createVectorIndex(name, column, options) {
        if (this.collection instanceof astra_db_ts_1.Collection) {
            throw new OperationNotSupportedError('Cannot use createVectorIndex() with collections');
        }
        return this.collection.createVectorIndex(name, column, { options, ifNotExists: true });
    }
    /**
     * Drop an existing index by name. Only works in tables mode, throws an error in collections mode.
     *
     * @param name
     */
    async dropIndex(name) {
        if (this.collection instanceof astra_db_ts_1.Collection) {
            throw new OperationNotSupportedError('Cannot use dropIndex() with collections');
        }
        await this.connection.db.astraDb.dropTableIndex(name);
    }
    /**
     * Watch operation not supported.
     *
     * @ignore
     */
    watch() {
        throw new OperationNotSupportedError('watch() Not Implemented');
    }
    /**
     * Distinct operation not supported.
     *
     * @ignore
     */
    distinct() {
        throw new OperationNotSupportedError('distinct() Not Implemented');
    }
}
exports.Collection = Collection;
function processSortOption(sort) {
    const result = {};
    for (const key of Object.keys(sort)) {
        const sortValue = sort[key];
        if (sortValue == null || typeof sortValue !== 'object') {
            result[key] = sortValue;
            continue;
        }
        const $meta = typeof sortValue === 'object' && sortValue.$meta;
        if ($meta) {
            // Astra-db-ts 1.x does not currently support using fields other than $vector and $vectorize
            // for vector sort and vectorize sort, but that works in tables. Stargate-mongoose added
            // support in PR #258
            result[key] = $meta;
        }
    }
    return result;
}
class OperationNotSupportedError extends Error {
    constructor(message) {
        super(message);
        this.name = 'OperationNotSupportedError';
    }
}
exports.OperationNotSupportedError = OperationNotSupportedError;
function setDefaultIdForUpsert(filter, update, options, replace) {
    if (!options.upsert) {
        return;
    }
    if ('_id' in filter) {
        return;
    }
    if (replace) {
        if ('_id' in update) {
            return;
        }
        update._id = new mongoose_1.Types.ObjectId();
    }
    else {
        if (_updateHasKey(update, '_id')) {
            return;
        }
        if (update.$setOnInsert == null) {
            update.$setOnInsert = {};
        }
        if (!('_id' in update.$setOnInsert)) {
            update.$setOnInsert._id = new mongoose_1.Types.ObjectId();
        }
    }
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function _updateHasKey(update, key) {
    for (const operator of Object.keys(update)) {
        if (update[operator] != null && typeof update[operator] === 'object' && key in update[operator]) {
            return true;
        }
    }
    return false;
}
//# sourceMappingURL=collection.js.map
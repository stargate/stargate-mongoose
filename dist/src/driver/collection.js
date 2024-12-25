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
const deserializeDoc_1 = __importDefault(require("src/deserializeDoc"));
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
        this.useTables = false;
        this._closed = false;
    }
    //getter for collection
    get collection() {
        if (this._collection != null) {
            return this._collection;
        }
        const db = this.conn.db;
        // Cache because @datastax/astra-db-ts doesn't
        const collection = db.collection(this.name);
        this._collection = collection;
        this.useTables = this.conn.db.useTables;
        return collection;
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
    find(filter, options, callback) {
        // Weirdness to work around astra-db-ts method overrides
        if (options == null) {
            filter = (0, serialize_1.serialize)(filter, this.useTables);
            const cursor = this.collection.find(filter).map((doc) => (0, deserializeDoc_1.default)(doc));
            if (callback != null) {
                return callback(null, cursor);
            }
            return cursor;
        }
        const requestOptions = options != null && options.sort != null
            ? { ...options, sort: processSortOption(options.sort) }
            : { ...options, sort: undefined };
        filter = (0, serialize_1.serialize)(filter, this.useTables);
        // Weirdness to work around astra-db-ts method overrides: `find()` with `projection: never` means we need a separate branch
        if (this.collection instanceof astra_db_ts_1.Table) {
            const cursor = this.collection.find(filter, requestOptions).map((doc) => (0, deserializeDoc_1.default)(doc));
            if (callback != null) {
                return callback(null, cursor);
            }
            return cursor;
        }
        else {
            const cursor = this.collection.find(filter, requestOptions).map((doc) => (0, deserializeDoc_1.default)(doc));
            if (callback != null) {
                return callback(null, cursor);
            }
            return cursor;
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
            const doc = await this.collection.findOne(filter);
            return (0, deserializeDoc_1.default)(doc);
        }
        const requestOptions = options != null && options.sort != null
            ? { ...options, sort: processSortOption(options.sort) }
            : { ...options, sort: undefined };
        filter = (0, serialize_1.serialize)(filter, this.useTables);
        // Weirdness to work around astra-db-ts method overrides: `findOne()` with `projection: never` means we need a separate branch
        if (this.collection instanceof astra_db_ts_1.Table) {
            const doc = await this.collection.findOne(filter, requestOptions);
            return (0, deserializeDoc_1.default)(doc);
        }
        else {
            const doc = await this.collection.findOne(filter, requestOptions);
            return (0, deserializeDoc_1.default)(doc);
        }
    }
    /**
     * Insert a single document into the collection.
     * @param doc
     */
    insertOne(doc) {
        doc = (0, serialize_1.serialize)(doc, this.useTables);
        return this.collection.insertOne(doc);
    }
    /**
     * Insert multiple documents into the collection.
     * @param documents
     * @param options
     */
    async insertMany(documents, options) {
        documents = documents.map(doc => (0, serialize_1.serialize)(doc, this.useTables));
        if (this instanceof astra_db_ts_1.Table) {
            return this.collection.insertMany(documents, options);
        }
        else {
            return this.collection.insertMany(documents, options);
        }
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
        let requestOptions = undefined;
        if (options != null && options.sort != null) {
            requestOptions = { ...options, sort: processSortOption(options.sort) };
        }
        else if (options != null && options.sort == null) {
            requestOptions = { ...options, sort: undefined };
            delete requestOptions.sort;
        }
        filter = (0, serialize_1.serialize)(filter);
        setDefaultIdForUpsert(filter, update, requestOptions, false);
        update = (0, serialize_1.serialize)(update);
        // Weirdness to work around TypeScript, otherwise TypeScript fails with
        // "Types of property 'includeResultMetadata' are incompatible: Type 'boolean | undefined' is not assignable to type 'false | undefined'."
        if (requestOptions == null) {
            return this.collection.findOneAndUpdate(filter, update).then((doc) => (0, deserializeDoc_1.default)(doc));
        }
        else if (options?.includeResultMetadata) {
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
        let requestOptions = undefined;
        if (options != null && options.sort != null) {
            requestOptions = { ...options, sort: processSortOption(options.sort) };
        }
        else if (options != null && options.sort == null) {
            requestOptions = { ...options, sort: undefined };
            delete requestOptions.sort;
        }
        filter = (0, serialize_1.serialize)(filter);
        // Weirdness to work around TypeScript, otherwise TypeScript fails with
        // "Types of property 'includeResultMetadata' are incompatible: Type 'boolean | undefined' is not assignable to type 'false | undefined'."
        if (requestOptions == null) {
            return this.collection.findOneAndDelete(filter).then((doc) => (0, deserializeDoc_1.default)(doc));
        }
        else if (options?.includeResultMetadata) {
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
        let requestOptions = undefined;
        if (options != null && options.sort != null) {
            requestOptions = { ...options, sort: processSortOption(options.sort) };
        }
        else if (options != null && options.sort == null) {
            requestOptions = { ...options, sort: undefined };
            delete requestOptions.sort;
        }
        filter = (0, serialize_1.serialize)(filter);
        setDefaultIdForUpsert(filter, newDoc, requestOptions, true);
        newDoc = (0, serialize_1.serialize)(newDoc);
        // Weirdness to work around TypeScript, otherwise TypeScript fails with
        // "Types of property 'includeResultMetadata' are incompatible: Type 'boolean | undefined' is not assignable to type 'false | undefined'."
        if (requestOptions == null) {
            return this.collection.findOneAndReplace(filter, newDoc).then((doc) => (0, deserializeDoc_1.default)(doc));
        }
        else if (options?.includeResultMetadata) {
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
    deleteOne(filter, options, callback) {
        let requestOptions = undefined;
        if (options != null && options.sort != null) {
            requestOptions = { ...options, sort: processSortOption(options.sort) };
        }
        else if (options != null && options.sort == null) {
            requestOptions = { ...options, sort: undefined };
            delete requestOptions.sort;
        }
        filter = (0, serialize_1.serialize)(filter, this.useTables);
        const promise = this.collection.deleteOne(filter, requestOptions);
        if (callback != null) {
            promise.then((res) => callback(null, res), (err) => callback(err, null));
        }
        return promise;
    }
    /**
     * Update a single document in a collection that matches the given filter.
     * @param filter
     * @param update
     * @param options
     */
    updateOne(filter, update, options) {
        let requestOptions = undefined;
        if (options != null && options.sort != null) {
            requestOptions = { ...options, sort: processSortOption(options.sort) };
        }
        else if (options != null && options.sort == null) {
            requestOptions = { ...options, sort: undefined };
            delete requestOptions.sort;
        }
        filter = (0, serialize_1.serialize)(filter, this.useTables);
        setDefaultIdForUpsert(filter, update, requestOptions, false);
        update = (0, serialize_1.serialize)(update, this.useTables);
        return this.collection.updateOne(filter, update, requestOptions).then(res => {
            // Mongoose currently has a bug where null response from updateOne() throws an error that we can't
            // catch here for unknown reasons. See Automattic/mongoose#15126
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
     * Bulk Save not supported.
     * @param docs
     * @param options
     */
    bulkSave(_docs, _options) {
        throw new OperationNotSupportedError('bulkSave() Not Implemented');
    }
    /**
     * List indexes not supported.
     * @param options
     */
    listIndexes() {
        if (this.collection instanceof astra_db_ts_1.Collection) {
            throw new OperationNotSupportedError('Cannot use listIndexes() with collections');
        }
        return new AsyncCursorPlaceholder(this.collection.listIndexes({ nameOnly: true }).then(indexes => indexes.map(name => ({ name, key: {} }))));
    }
    /**
     * Create a new index
     *
     * @param name
     * @param column
     * @param options
     */
    async createIndex(name, column, options) {
        if (this.collection instanceof astra_db_ts_1.Collection) {
            throw new OperationNotSupportedError('Cannot use createIndex() with collections');
        }
        return this.collection.createIndex(name, column, options);
    }
    /**
     * Drop an existin index
     *
     * @param name
     */
    async dropIndex(name) {
        if (this.collection instanceof astra_db_ts_1.Collection) {
            throw new OperationNotSupportedError('Cannot use dropIndex() with collections');
        }
        const db = this.conn.db;
        await db.dropTableIndex(name);
    }
    /**
     * Watch operation not supported.
     */
    watch() {
        throw new OperationNotSupportedError('watch() Not Implemented');
    }
    /**
     * Distinct operation not supported.
     */
    distinct() {
        throw new OperationNotSupportedError('distinct() Not Implemented');
    }
    /**
     * Replace one operation not supported.
     */
    replaceOne() {
        throw new OperationNotSupportedError('replaceOne() Not Implemented');
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
    if (filter == null || options == null) {
        return;
    }
    if (!options.upsert) {
        return;
    }
    if ('_id' in filter) {
        return;
    }
    if (replace) {
        if (update != null && '_id' in update) {
            return;
        }
        update._id = new mongoose_1.Types.ObjectId();
    }
    else {
        if (update != null && _updateHasKey(update, '_id')) {
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
/**
 * Mongoose expects listIndexes() to return a cursor but Astra returns an array.
 */
class AsyncCursorPlaceholder {
    constructor(promise) {
        this.promise = promise;
    }
    toArray() {
        return this.promise;
    }
}
//# sourceMappingURL=collection.js.map
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
exports.setDefaultIdForUpsert = exports.OperationNotSupportedError = exports.Collection = void 0;
const collection_1 = __importDefault(require("mongoose/lib/collection"));
const serialize_1 = require("../serialize");
const mongoose_1 = require("mongoose");
/**
 * Collection operations supported by the driver.
 */
class Collection extends collection_1.default {
    constructor(name, conn, options) {
        super(name, conn, options);
        this.debugType = 'StargateMongooseCollection';
        this._closed = false;
        this._collection = null;
    }
    //getter for collection
    get collection() {
        if (this._collection != null) {
            return this._collection;
        }
        // Cache because @datastax/astra-db-ts doesn't
        const collection = this.conn.db.collection(this.name);
        Object.assign(collection._httpClient.baseHeaders, this.conn.featureFlags);
        this._collection = collection;
        return collection;
    }
    /**
     * Count documents in the collection that match the given filter.
     * @param filter
     */
    countDocuments(filter) {
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
        let requestOptions = undefined;
        if (options != null && options.sort != null) {
            requestOptions = { ...options, sort: processSortOption(options.sort) };
        }
        else if (options != null && options.sort == null) {
            requestOptions = { ...options, sort: undefined };
            delete requestOptions.sort;
        }
        filter = (0, serialize_1.serialize)(filter);
        const cursor = this.collection.find(filter, requestOptions);
        if (callback != null) {
            return callback(null, cursor);
        }
        return cursor;
    }
    /**
     * Find a single document in the collection that matches the given filter.
     * @param filter
     * @param options
     */
    findOne(filter, options) {
        let requestOptions = undefined;
        if (options != null && options.sort != null) {
            requestOptions = { ...options, sort: processSortOption(options.sort) };
        }
        else if (options != null && options.sort == null) {
            requestOptions = { ...options, sort: undefined };
            delete requestOptions.sort;
        }
        filter = (0, serialize_1.serialize)(filter);
        return this.collection.findOne(filter, requestOptions);
    }
    /**
     * Insert a single document into the collection.
     * @param doc
     */
    insertOne(doc) {
        return this.collection.insertOne((0, serialize_1.serialize)(doc));
    }
    /**
     * Insert multiple documents into the collection.
     * @param documents
     * @param options
     */
    async insertMany(documents, options) {
        documents = documents.map(doc => (0, serialize_1.serialize)(doc));
        return this.collection.insertMany(documents, options);
    }
    /**
     * Update a single document in a collection.
     * @param filter
     * @param update
     * @param options
     */
    async findOneAndUpdate(filter, update, options) {
        let requestOptions = undefined;
        if (options != null && options.sort != null) {
            requestOptions = { ...options, sort: processSortOption(options.sort) };
        }
        else if (options != null && options.sort == null) {
            requestOptions = { ...options, sort: undefined };
            delete requestOptions.sort;
        }
        filter = (0, serialize_1.serialize)(filter);
        update = (0, serialize_1.serialize)(update);
        setDefaultIdForUpsert(filter, update, requestOptions, false);
        // Weirdness to work around TypeScript, otherwise TypeScript fails with
        // "Types of property 'includeResultMetadata' are incompatible: Type 'boolean | undefined' is not assignable to type 'false | undefined'."
        if (requestOptions == null) {
            return this.collection.findOneAndUpdate(filter, update);
        }
        else if (requestOptions.includeResultMetadata) {
            return this.collection.findOneAndUpdate(filter, update, { ...requestOptions, includeResultMetadata: true });
        }
        else {
            return this.collection.findOneAndUpdate(filter, update, { ...requestOptions, includeResultMetadata: false });
        }
    }
    /**
     * Find a single document in the collection and delete it.
     * @param filter
     * @param options
     */
    async findOneAndDelete(filter, options) {
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
            return this.collection.findOneAndDelete(filter);
        }
        else if (requestOptions.includeResultMetadata) {
            return this.collection.findOneAndDelete(filter, { ...requestOptions, includeResultMetadata: true });
        }
        else {
            return this.collection.findOneAndDelete(filter, { ...requestOptions, includeResultMetadata: false });
        }
    }
    /**
     * Find a single document in the collection and replace it.
     * @param filter
     * @param newDoc
     * @param options
     */
    async findOneAndReplace(filter, newDoc, options) {
        let requestOptions = undefined;
        if (options != null && options.sort != null) {
            requestOptions = { ...options, sort: processSortOption(options.sort) };
        }
        else if (options != null && options.sort == null) {
            requestOptions = { ...options, sort: undefined };
            delete requestOptions.sort;
        }
        filter = (0, serialize_1.serialize)(filter);
        newDoc = (0, serialize_1.serialize)(newDoc);
        setDefaultIdForUpsert(filter, newDoc, requestOptions, true);
        // Weirdness to work around TypeScript, otherwise TypeScript fails with
        // "Types of property 'includeResultMetadata' are incompatible: Type 'boolean | undefined' is not assignable to type 'false | undefined'."
        if (requestOptions == null) {
            return this.collection.findOneAndReplace(filter, newDoc);
        }
        else if (requestOptions.includeResultMetadata) {
            return this.collection.findOneAndReplace(filter, newDoc, { ...requestOptions, includeResultMetadata: true });
        }
        else {
            return this.collection.findOneAndReplace(filter, newDoc, { ...requestOptions, includeResultMetadata: false });
        }
    }
    /**
     * Delete one or more documents in a collection that match the given filter.
     * @param filter
     */
    deleteMany(filter) {
        filter = (0, serialize_1.serialize)(filter);
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
        filter = (0, serialize_1.serialize)(filter);
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
        filter = (0, serialize_1.serialize)(filter);
        update = (0, serialize_1.serialize)(update);
        setDefaultIdForUpsert(filter, update, requestOptions, false);
        return this.collection.updateOne(filter, update, requestOptions);
    }
    /**
     * Update multiple documents in a collection that match the given filter.
     * @param filter
     * @param update
     * @param options
     */
    updateMany(filter, update, options) {
        filter = (0, serialize_1.serialize)(filter);
        update = (0, serialize_1.serialize)(update);
        setDefaultIdForUpsert(filter, update, options, false);
        return this.collection.updateMany(filter, update, options);
    }
    /**
     * Get the estimated number of documents in a collection based on collection metadata
     */
    estimatedDocumentCount() {
        return this.collection.estimatedDocumentCount();
    }
    /**
     * Run an arbitrary command against this collection's http client
     * @param command
     */
    runCommand(command) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return this.collection._httpClient.executeCommand(command);
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
     * Clean indexes not supported.
     * @param options
     */
    cleanIndexes(_options) {
        throw new OperationNotSupportedError('cleanIndexes() Not Implemented');
    }
    /**
     * List indexes not supported.
     * @param options
     */
    listIndexes(_options) {
        throw new OperationNotSupportedError('listIndexes() Not Implemented');
    }
    /**
     * Create index not supported.
     *
     * Async because Mongoose `createIndexes()` throws an unhandled error if `createIndex()` throws a sync error
     * See Automattic/mongoose#14995
     *
     * @param fieldOrSpec
     * @param options
     */
    async createIndex(_fieldOrSpec, _options) {
        throw new OperationNotSupportedError('createIndex() Not Implemented');
    }
    /**
     * Drop indexes not supported.
     */
    dropIndexes() {
        throw new OperationNotSupportedError('dropIndexes() Not Implemented');
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
exports.setDefaultIdForUpsert = setDefaultIdForUpsert;
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
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

import { default as MongooseCollection } from 'mongoose/lib/collection';
import type { Connection } from './connection';
import {
    DeleteOneOptions,
    FindOneAndDeleteOptions,
    FindOneAndReplaceOptions,
    FindOneAndUpdateOptions,
    FindOneOptions,
    FindOptions,
    InsertManyOptions,
    SortOption,
    UpdateManyOptions,
    UpdateOneOptions
} from '@/src/collections/options';
import { DataAPIDeleteResult } from '../collections/collection';

import { version } from 'mongoose';

const IS_MONGOOSE_7 = version.startsWith('7.');

type NodeCallback<ResultType = unknown> = (err: Error | null, res: ResultType | null) => unknown;

/**
 * Collection operations supported by the driver.
 */
export class Collection extends MongooseCollection {
    debugType = 'StargateMongooseCollection';

    constructor(name: string, conn: Connection, options?: unknown) {
        super(name, conn, options);
        this._closed = false;
    }

    //getter for collection
    get collection() {
        return this.conn.db.collection(this.name);
    }

    /**
    * Count documents in the collection that match the given filter. Use countDocuments() instead.
    * @param filter
    * @deprecated
    */
    count(filter: Record<string, unknown>) {
        return this.collection.count(filter);
    }

    /**
     * Count documents in the collection that match the given filter.
     * @param filter
     */
    countDocuments(filter: Record<string, unknown>) {
        return this.collection.countDocuments(filter);
    }

    /**
     * Find documents in the collection that match the given filter.
     * @param filter
     * @param options
     * @param callback
     */
    find(filter: Record<string, unknown>, options?: FindOptions, callback?: NodeCallback<Record<string, unknown>[]>) {
        if (options != null) {
            processSortOption(options);
        }
        const cursor = this.collection.find(filter, options);
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
    findOne(filter: Record<string, unknown>, options?: FindOneOptions) {
        if (options != null) {
            processSortOption(options);
        }
        return this.collection.findOne(filter, options);
    }

    /**
     * Insert a single document into the collection.
     * @param doc
     */
    insertOne(doc: Record<string, unknown>) {
        return this.collection.insertOne(doc);
    }

    /**
     * Insert multiple documents into the collection.
     * @param documents
     * @param options
     */
    async insertMany(documents: Record<string, unknown>[], options?: InsertManyOptions) {
        const usePagination = options?.usePagination ?? false;
        if (options != null && 'usePagination' in options) {
            options = { ...options };
            delete options.usePagination;
        }

        const ordered = options?.ordered ?? true;

        if (usePagination) {
            const batchSize = 20;
            const ops = [];
            const ret = options?.returnDocumentResponses
                ? { acknowledged: true, documentResponses: [] }
                : { acknowledged: true, insertedCount: 0, insertedIds: [] };
            for (let i = 0; i < documents.length; i += batchSize) {
                const batch = documents.slice(i, i + batchSize);
                if (ordered) {
                    const {
                        acknowledged,
                        insertedCount,
                        insertedIds,
                        documentResponses
                    } = await this.collection.insertMany(batch, options);
                    ret.acknowledged = ret.acknowledged && acknowledged;
                    if (options?.returnDocumentResponses) {
                        ret.documentResponses = ret.documentResponses?.concat(documentResponses ?? []);
                    } else {
                        ret.insertedCount += insertedCount;
                        ret.insertedIds = (ret.insertedIds ?? []).concat(insertedIds);
                    }
                } else {
                    ops.push(this.collection.insertMany(batch, options));
                }
            }
            if (!ordered) {
                const results = await Promise.all(ops);
                for (const { acknowledged, insertedCount, insertedIds, documentResponses } of results) {
                    ret.acknowledged = ret.acknowledged && acknowledged;
                    if (options?.returnDocumentResponses) {
                        ret.documentResponses = ret.documentResponses?.concat(documentResponses ?? []);
                    } else {
                        ret.insertedCount += insertedCount;
                        ret.insertedIds = (ret.insertedIds ?? []).concat(insertedIds);
                    }
                }
            }

            return ret;
        } else {
            return this.collection.insertMany(documents, options);
        }
    }

    /**
     * Update a single document in a collection.
     * @param filter
     * @param update
     * @param options
     */
    async findOneAndUpdate(filter: Record<string, unknown>, update: Record<string, unknown>, options?: FindOneAndUpdateOptions) {
        if (options != null) {
            processSortOption(options);
        }
        const res = await this.collection.findOneAndUpdate(filter, update, options);
        if (IS_MONGOOSE_7) {
            return options?.includeResultMetadata === false ? res.value : res;
        } else if (options?.includeResultMetadata !== false) {
            return res.value;
        }
        return res;
    }

    /**
     * Find a single document in the collection and delete it.
     * @param filter
     * @param options
     */
    async findOneAndDelete(filter: Record<string, unknown>, options?: FindOneAndDeleteOptions) {
        if (options != null) {
            processSortOption(options);
        }
        const res = await this.collection.findOneAndDelete(filter, options);
        if (IS_MONGOOSE_7) {
            return options?.includeResultMetadata === false ? res.value : res;
        } else if (options?.includeResultMetadata !== false) {
            return res.value;
        }
        return res;
    }

    /**
     * Find a single document in the collection and replace it.
     * @param filter
     * @param newDoc
     * @param options
     */
    async findOneAndReplace(filter: Record<string, unknown>, newDoc: Record<string, unknown>, options?: FindOneAndReplaceOptions) {
        if (options != null) {
            processSortOption(options);
        }
        const res = await this.collection.findOneAndReplace(filter, newDoc, options);
        if (IS_MONGOOSE_7) {
            return options?.includeResultMetadata === false ? res.value : res;
        } else if (options?.includeResultMetadata !== false) {
            return res.value;
        }
        return res;
    }

    /**
     * Delete one or more documents in a collection that match the given filter.
     * @param filter
     */
    deleteMany(filter: Record<string, unknown>) {
        return this.collection.deleteMany(filter);
    }

    /**
     * Delete a single document in a collection that matches the given filter.
     * @param filter
     * @param options
     * @param callback
     */
    deleteOne(filter: Record<string, unknown>, options?: DeleteOneOptions, callback?: NodeCallback<DataAPIDeleteResult>) {
        if (options != null) {
            processSortOption(options);
        }
    
        const promise = this.collection.deleteOne(filter, options);

        if (callback != null) {
            promise.then((res: DataAPIDeleteResult) => callback(null, res), (err: Error) => callback(err, null));
        }

        return promise;
    }

    /**
     * Update a single document in a collection that matches the given filter.
     * @param filter
     * @param update
     * @param options
     */
    updateOne(filter: Record<string, unknown>, update: Record<string, unknown>, options?: UpdateOneOptions) {
        if (options != null) {
            processSortOption(options);
        }
        return this.collection.updateOne(filter, update, options);
    }

    /**
     * Update multiple documents in a collection that match the given filter.
     * @param filter
     * @param update
     * @param options
     */
    updateMany(filter: Record<string, unknown>, update: Record<string, unknown>, options?: UpdateManyOptions) {
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
    runCommand(command: Record<string, unknown>) {
        return this.collection.runCommand(command);
    }

    /**
     * Bulk write not supported.
     * @param ops
     * @param options
     */
    bulkWrite(_ops: Record<string, unknown>[], _options?: Record<string, unknown>) {
        throw new OperationNotSupportedError('bulkWrite() Not Implemented');
    }

    /**
     * Aggregate not supported.
     * @param pipeline
     * @param options
     */
    aggregate(_pipeline: Record<string, unknown>[], _options?: Record<string, unknown>) {
        throw new OperationNotSupportedError('aggregate() Not Implemented');
    }

    /**
     * Bulk Save not supported.
     * @param docs
     * @param options
     */
    bulkSave(_docs: Record<string, unknown>[], _options?: Record<string, unknown>) {
        throw new OperationNotSupportedError('bulkSave() Not Implemented');
    }

    /**
     * Clean indexes not supported.
     * @param options
     */
    cleanIndexes(_options?: Record<string, unknown>) {
        throw new OperationNotSupportedError('cleanIndexes() Not Implemented');
    }

    /**
     * List indexes not supported.
     * @param options
     */
    listIndexes(_options?: Record<string, unknown>) {
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
    async createIndex(_fieldOrSpec: Record<string, unknown>, _options?: Record<string, unknown>) {
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

function processSortOption(options: { sort?: SortOption }) {
    if (options.sort == null) {
        return;
    }
    if ('$vector' in options.sort &&
        typeof options.sort.$vector === 'object' &&
        !Array.isArray(options.sort.$vector)) {
        options.sort.$vector = options.sort.$vector.$meta;
    }
    if ('$vectorize' in options.sort &&
        typeof options.sort.$vectorize === 'object' &&
        !Array.isArray(options.sort.$vectorize)) {
        options.sort.$vectorize = options.sort.$vectorize.$meta;
    }
}

export class OperationNotSupportedError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'OperationNotSupportedError';
    }
}

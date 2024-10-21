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
import {
    Collection as AstraCollection,
    DeleteOneOptions,
    DeleteOneResult,
    FindCursor,
    FindOneAndDeleteOptions,
    FindOneAndReplaceOptions,
    FindOneAndUpdateOptions,
    FindOneOptions,
    FindOptions,
    SortDirection,
    UpdateManyOptions,
    UpdateOneOptions
} from '@datastax/astra-db-ts';
import { serialize } from '../serialize';
import { Types } from 'mongoose';
import type { Connection } from './connection';

export type SortOption = Record<string, SortDirection> |
  { $vector: { $meta: Array<number> } } |
  { $vector: Array<number> } |
  { $vectorize: { $meta: string } } |
  { $vectorize: string };

export interface InsertManyOptions {
    ordered?: boolean;
    usePagination?: boolean;
    returnDocumentResponses?: boolean;
}

type NodeCallback<ResultType = any> = (err: Error | null, res: ResultType | null) => unknown;

/**
 * Collection operations supported by the driver.
 */
export class Collection extends MongooseCollection {
    debugType = 'StargateMongooseCollection';

    constructor(name: string, conn: Connection, options?: { modelName?: string | null }) {
        super(name, conn, options);
        if (options?.modelName != null) {
            this.modelName = options.modelName;
            delete options.modelName;
        }
        this._closed = false;
        this._collection = null;
    }

    //getter for collection
    get collection(): AstraCollection {
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
    countDocuments(filter: Record<string, any>) {
        filter = serialize(filter);
        return this.collection.countDocuments(filter, 1000);
    }

    /**
     * Find documents in the collection that match the given filter.
     * @param filter
     * @param options
     * @param callback
     */
    find(filter: Record<string, any>, options?: FindOptions, callback?: NodeCallback<FindCursor<unknown>>) {
        if (options != null) {
            processSortOption(options);
        }
        filter = serialize(filter);
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
    findOne(filter: Record<string, any>, options?: FindOneOptions) {
        if (options != null) {
            processSortOption(options);
        }
        filter = serialize(filter);
        return this.collection.findOne(filter, options);
    }

    /**
     * Insert a single document into the collection.
     * @param doc
     */
    insertOne(doc: Record<string, any>) {
        return this.collection.insertOne(serialize(doc));
    }

    /**
     * Insert multiple documents into the collection.
     * @param documents
     * @param options
     */
    async insertMany(documents: Record<string, any>[], options?: InsertManyOptions) {
        const usePagination = options?.usePagination ?? false;
        if (options != null && 'usePagination' in options) {
            options = { ...options };
            delete options.usePagination;
        }

        const ordered = options?.ordered ?? true;
        documents = documents.map(doc => serialize(doc));

        if (usePagination) {
            const batchSize = 20;
            if (ordered) {
                if (options?.returnDocumentResponses) {
                    const ret = { documentResponses: [] as unknown[] };
                    for (let i = 0; i < documents.length; i += batchSize) {
                        const batch = documents.slice(i, i + batchSize);
                        const {
                            documentResponses
                        } = await this.collection.insertMany(batch, options) as unknown as { documentResponses: unknown[] };
                        ret.documentResponses.push(...documentResponses);
                    }
                    return ret;
                } else {
                    const ret = { insertedCount: 0, insertedIds: [] as unknown[] };
                    for (let i = 0; i < documents.length; i += batchSize) {
                        const batch = documents.slice(i, i + batchSize);
                        const {
                            insertedCount,
                            insertedIds
                        } = await this.collection.insertMany(batch, options);
                        ret.insertedCount += insertedCount;
                        ret.insertedIds.push(...insertedIds);
                    }
                    return ret;
                }
            } else {
                const ops = [];
                if (options?.returnDocumentResponses) {
                    const ret = { documentResponses: [] as unknown[] };
                    for (let i = 0; i < documents.length; i += batchSize) {
                        const batch = documents.slice(i, i + batchSize);
                        ops.push(this.collection.insertMany(batch, options));
                    }
                    const results = await Promise.all(ops) as unknown as { documentResponses: unknown[] }[];
                    for (const { documentResponses } of results) {
                        ret.documentResponses.push(...documentResponses);
                    }
                    return ret;
                } else {
                    const ret = { insertedCount: 0, insertedIds: [] as unknown[] };
                    for (let i = 0; i < documents.length; i += batchSize) {
                        const batch = documents.slice(i, i + batchSize);
                        ops.push(this.collection.insertMany(batch, options));
                    }
                    const results = await Promise.all(ops);
                    for (const { insertedCount, insertedIds } of results) {
                        ret.insertedCount += insertedCount;
                        ret.insertedIds = ret.insertedIds!.concat(insertedIds);
                    }
                    return ret;
                }
            }
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
    async findOneAndUpdate(filter: Record<string, any>, update: Record<string, any>, options?: FindOneAndUpdateOptions) {
        if (options != null) {
            processSortOption(options);
        }
        filter = serialize(filter);
        update = serialize(update);
        setDefaultIdForUpsert(filter, update, options, false);

        // Weirdness to work around TypeScript, otherwise TypeScript fails with
        // "Types of property 'includeResultMetadata' are incompatible: Type 'boolean | undefined' is not assignable to type 'false | undefined'."
        if (options == null) {
            return this.collection.findOneAndUpdate(filter, update);
        } else if (options.includeResultMetadata) {
            return this.collection.findOneAndUpdate(filter, update, { ...options, includeResultMetadata: true });
        } else {
            return this.collection.findOneAndUpdate(filter, update, { ...options, includeResultMetadata: false });
        }
    }

    /**
     * Find a single document in the collection and delete it.
     * @param filter
     * @param options
     */
    async findOneAndDelete(filter: Record<string, any>, options?: FindOneAndDeleteOptions) {
        if (options != null) {
            processSortOption(options);
        }
        filter = serialize(filter);

        // Weirdness to work around TypeScript, otherwise TypeScript fails with
        // "Types of property 'includeResultMetadata' are incompatible: Type 'boolean | undefined' is not assignable to type 'false | undefined'."
        if (options == null) {
            return this.collection.findOneAndDelete(filter);
        } else if (options.includeResultMetadata) {
            return this.collection.findOneAndDelete(filter, { ...options, includeResultMetadata: true });
        } else {
            return this.collection.findOneAndDelete(filter, { ...options, includeResultMetadata: false });
        }
    }

    /**
     * Find a single document in the collection and replace it.
     * @param filter
     * @param newDoc
     * @param options
     */
    async findOneAndReplace(filter: Record<string, any>, newDoc: Record<string, any>, options?: FindOneAndReplaceOptions) {
        if (options != null) {
            processSortOption(options);
        }
        filter = serialize(filter);
        newDoc = serialize(newDoc);
        setDefaultIdForUpsert(filter, newDoc, options, true);
        
        // Weirdness to work around TypeScript, otherwise TypeScript fails with
        // "Types of property 'includeResultMetadata' are incompatible: Type 'boolean | undefined' is not assignable to type 'false | undefined'."
        if (options == null) {
            return this.collection.findOneAndReplace(filter, newDoc);
        } else if (options.includeResultMetadata) {
            return this.collection.findOneAndReplace(filter, newDoc, { ...options, includeResultMetadata: true });
        } else {
            return this.collection.findOneAndReplace(filter, newDoc, { ...options, includeResultMetadata: false });
        }
    }

    /**
     * Delete one or more documents in a collection that match the given filter.
     * @param filter
     */
    deleteMany(filter: Record<string, any>) {
        if (filter == null || Object.keys(filter).length === 0) {
            return this.collection.deleteAll();
        }
        filter = serialize(filter);
        return this.collection.deleteMany(filter);
    }

    /**
     * Delete a single document in a collection that matches the given filter.
     * @param filter
     * @param options
     * @param callback
     */
    deleteOne(filter: Record<string, any>, options?: DeleteOneOptions, callback?: NodeCallback<DeleteOneResult>) {
        if (options != null) {
            processSortOption(options);
        }
    
        filter = serialize(filter);
        const promise = this.collection.deleteOne(filter, options);

        if (callback != null) {
            promise.then((res: DeleteOneResult) => callback(null, res), (err: Error) => callback(err, null));
        }

        return promise;
    }

    /**
     * Update a single document in a collection that matches the given filter.
     * @param filter
     * @param update
     * @param options
     */
    updateOne(filter: Record<string, any>, update: Record<string, any>, options?: UpdateOneOptions) {
        if (options != null) {
            processSortOption(options);
        }
        filter = serialize(filter);
        update = serialize(update);
        setDefaultIdForUpsert(filter, update, options, false);
        return this.collection.updateOne(filter, update, options);
    }

    /**
     * Update multiple documents in a collection that match the given filter.
     * @param filter
     * @param update
     * @param options
     */
    updateMany(filter: Record<string, any>, update: Record<string, any>, options?: UpdateManyOptions) {
        filter = serialize(filter);
        update = serialize(update);
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
    runCommand(command: Record<string, any>) {
        return (this.collection as any)._httpClient.executeCommand(command);
    }

    /**
     * Bulk write not supported.
     * @param ops
     * @param options
     */
    bulkWrite(ops: any[], options?: any) {
        throw new OperationNotSupportedError('bulkWrite() Not Implemented');
    }

    /**
     * Aggregate not supported.
     * @param pipeline
     * @param options
     */
    aggregate(pipeline: any[], options?: any) {
        throw new OperationNotSupportedError('aggregate() Not Implemented');
    }

    /**
     * Bulk Save not supported.
     * @param docs
     * @param options
     */
    bulkSave(docs: any[], options?: any) {
        throw new OperationNotSupportedError('bulkSave() Not Implemented');
    }

    /**
     * Clean indexes not supported.
     * @param options
     */
    cleanIndexes(options?: any) {
        throw new OperationNotSupportedError('cleanIndexes() Not Implemented');
    }

    /**
     * List indexes not supported.
     * @param options
     */
    listIndexes(options?: any) {
        throw new OperationNotSupportedError('listIndexes() Not Implemented');
    }

    /**
     * Create index not supported.
     * @param fieldOrSpec
     * @param options
     */
    createIndex(fieldOrSpec: any, options?: any) {
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

export function setDefaultIdForUpsert(filter: Record<string, any>, update: Record<string, any>, options?: Record<string, any>, replace?: boolean) {
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
        update._id = new Types.ObjectId();
    } else {
        if (update != null && _updateHasKey(update, '_id')) {
            return;
        }
        if (update.$setOnInsert == null) {
            update.$setOnInsert = {};
        }
        if (!('_id' in update.$setOnInsert)) {
            update.$setOnInsert._id = new Types.ObjectId();
        }
    }
}


function _updateHasKey(update: Record<string, any>, key: string) {
    for (const operator of Object.keys(update)) {
        if (update[operator] != null && typeof update[operator] === 'object' && key in update[operator]) {
            return true;
        }
    }
    return false;
}

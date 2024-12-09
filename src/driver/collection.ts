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
    Collection as AstraCollection,
    DeleteOneOptions as DeleteOneOptionsInternal,
    DeleteOneResult,
    FindCursor,
    FindOptions as FindOptionsInternal,
    FindOneAndDeleteOptions as FindOneAndDeleteOptionsInternal,
    FindOneAndReplaceOptions as FindOneAndReplaceOptionsInternal,
    FindOneAndUpdateOptions as FindOneAndUpdateOptionsInternal,
    FindOneOptions as FindOneOptionsInternal,
    UpdateManyOptions,
    UpdateOneOptions as UpdateOneOptionsInternal,
    InsertManyOptions,
    InsertManyResult,
    SortDirection,
    Sort as SortOptionInternal
} from '@datastax/astra-db-ts';
import { serialize } from '../serialize';
import { Types } from 'mongoose';

export type MongooseSortOption = Record<string, 1 | -1 | { $meta: Array<number> } | { $meta: string }>;

type FindOptions = Omit<FindOptionsInternal, 'sort'> & { sort?: MongooseSortOption };
type FindOneOptions = Omit<FindOneOptionsInternal, 'sort'> & { sort?: MongooseSortOption };
type FindOneAndUpdateOptions = Omit<FindOneAndUpdateOptionsInternal, 'sort'> & { sort?: MongooseSortOption };
type FindOneAndDeleteOptions = Omit<FindOneAndDeleteOptionsInternal, 'sort'> & { sort?: MongooseSortOption };
type FindOneAndReplaceOptions = Omit<FindOneAndReplaceOptionsInternal, 'sort'> & { sort?: MongooseSortOption };
type DeleteOneOptions = Omit<DeleteOneOptionsInternal, 'sort'> & { sort?: MongooseSortOption };
type UpdateOneOptions = Omit<UpdateOneOptionsInternal, 'sort'> & { sort?: MongooseSortOption };

type NodeCallback<ResultType = unknown> = (err: Error | null, res: ResultType | null) => unknown;

/**
 * Collection operations supported by the driver.
 */
export class Collection extends MongooseCollection {
    debugType = 'StargateMongooseCollection';
    _collection?: AstraCollection;
    _closed: boolean;

    constructor(name: string, conn: Connection, options?: { modelName?: string | null }) {
        super(name, conn, options);
        this._closed = false;
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
    countDocuments(filter: Record<string, unknown>) {
        filter = serialize(filter);
        return this.collection.countDocuments(filter, 1000);
    }

    /**
     * Find documents in the collection that match the given filter.
     * @param filter
     * @param options
     * @param callback
     */
    find(filter: Record<string, unknown>, options?: FindOptions, callback?: NodeCallback<FindCursor<unknown>>) {
        let requestOptions: FindOptionsInternal | undefined = undefined;
        if (options != null && options.sort != null) {
            requestOptions = { ...options, sort: processSortOption(options.sort) };
        } else if (options != null && options.sort == null) {
            requestOptions = { ...options, sort: undefined };
            delete requestOptions.sort;
        }
        filter = serialize(filter);
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
    findOne(filter: Record<string, unknown>, options?: FindOneOptions) {
        let requestOptions: FindOneOptionsInternal | undefined = undefined;
        if (options != null && options.sort != null) {
            requestOptions = { ...options, sort: processSortOption(options.sort) };
        } else if (options != null && options.sort == null) {
            requestOptions = { ...options, sort: undefined };
            delete requestOptions.sort;
        }
        filter = serialize(filter);
        return this.collection.findOne(filter, requestOptions);
    }

    /**
     * Insert a single document into the collection.
     * @param doc
     */
    insertOne(doc: Record<string, unknown>) {
        return this.collection.insertOne(serialize(doc));
    }

    /**
     * Insert multiple documents into the collection.
     * @param documents
     * @param options
     */
    async insertMany(documents: Record<string, unknown>[], options?: InsertManyOptions): Promise<InsertManyResult<Record<string, unknown>>> {
        documents = documents.map(doc => serialize(doc));
        return this.collection.insertMany(documents, options);
    }

    /**
     * Update a single document in a collection.
     * @param filter
     * @param update
     * @param options
     */
    async findOneAndUpdate(filter: Record<string, unknown>, update: Record<string, unknown>, options?: FindOneAndUpdateOptions) {
        let requestOptions: FindOneAndUpdateOptionsInternal | undefined = undefined;
        if (options != null && options.sort != null) {
            requestOptions = { ...options, sort: processSortOption(options.sort) };
        } else if (options != null && options.sort == null) {
            requestOptions = { ...options, sort: undefined };
            delete requestOptions.sort;
        }
        filter = serialize(filter);
        update = serialize(update);
        setDefaultIdForUpsert(filter, update, requestOptions, false);

        // Weirdness to work around TypeScript, otherwise TypeScript fails with
        // "Types of property 'includeResultMetadata' are incompatible: Type 'boolean | undefined' is not assignable to type 'false | undefined'."
        if (requestOptions == null) {
            return this.collection.findOneAndUpdate(filter, update);
        } else if (requestOptions.includeResultMetadata) {
            return this.collection.findOneAndUpdate(filter, update, { ...requestOptions, includeResultMetadata: true });
        } else {
            return this.collection.findOneAndUpdate(filter, update, { ...requestOptions, includeResultMetadata: false });
        }
    }

    /**
     * Find a single document in the collection and delete it.
     * @param filter
     * @param options
     */
    async findOneAndDelete(filter: Record<string, unknown>, options?: FindOneAndDeleteOptions) {
        let requestOptions: FindOneAndDeleteOptionsInternal | undefined = undefined;
        if (options != null && options.sort != null) {
            requestOptions = { ...options, sort: processSortOption(options.sort) };
        } else if (options != null && options.sort == null) {
            requestOptions = { ...options, sort: undefined };
            delete requestOptions.sort;
        }
        filter = serialize(filter);

        // Weirdness to work around TypeScript, otherwise TypeScript fails with
        // "Types of property 'includeResultMetadata' are incompatible: Type 'boolean | undefined' is not assignable to type 'false | undefined'."
        if (requestOptions == null) {
            return this.collection.findOneAndDelete(filter);
        } else if (requestOptions.includeResultMetadata) {
            return this.collection.findOneAndDelete(filter, { ...requestOptions, includeResultMetadata: true });
        } else {
            return this.collection.findOneAndDelete(filter, { ...requestOptions, includeResultMetadata: false });
        }
    }

    /**
     * Find a single document in the collection and replace it.
     * @param filter
     * @param newDoc
     * @param options
     */
    async findOneAndReplace(filter: Record<string, unknown>, newDoc: Record<string, unknown>, options?: FindOneAndReplaceOptions) {
        let requestOptions: FindOneAndReplaceOptionsInternal | undefined = undefined;
        if (options != null && options.sort != null) {
            requestOptions = { ...options, sort: processSortOption(options.sort) };
        } else if (options != null && options.sort == null) {
            requestOptions = { ...options, sort: undefined };
            delete requestOptions.sort;
        }
        filter = serialize(filter);
        newDoc = serialize(newDoc);
        setDefaultIdForUpsert(filter, newDoc, requestOptions, true);
        
        // Weirdness to work around TypeScript, otherwise TypeScript fails with
        // "Types of property 'includeResultMetadata' are incompatible: Type 'boolean | undefined' is not assignable to type 'false | undefined'."
        if (requestOptions == null) {
            return this.collection.findOneAndReplace(filter, newDoc);
        } else if (requestOptions.includeResultMetadata) {
            return this.collection.findOneAndReplace(filter, newDoc, { ...requestOptions, includeResultMetadata: true });
        } else {
            return this.collection.findOneAndReplace(filter, newDoc, { ...requestOptions, includeResultMetadata: false });
        }
    }

    /**
     * Delete one or more documents in a collection that match the given filter.
     * @param filter
     */
    deleteMany(filter: Record<string, unknown>) {
        filter = serialize(filter);
        return this.collection.deleteMany(filter);
    }

    /**
     * Delete a single document in a collection that matches the given filter.
     * @param filter
     * @param options
     * @param callback
     */
    deleteOne(filter: Record<string, unknown>, options?: DeleteOneOptions, callback?: NodeCallback<DeleteOneResult>) {
        let requestOptions: DeleteOneOptionsInternal | undefined = undefined;
        if (options != null && options.sort != null) {
            requestOptions = { ...options, sort: processSortOption(options.sort) };
        } else if (options != null && options.sort == null) {
            requestOptions = { ...options, sort: undefined };
            delete requestOptions.sort;
        } 
        filter = serialize(filter);
        const promise = this.collection.deleteOne(filter, requestOptions);
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
    updateOne(filter: Record<string, unknown>, update: Record<string, unknown>, options?: UpdateOneOptions) {
        let requestOptions: UpdateOneOptionsInternal | undefined = undefined;
        if (options != null && options.sort != null) {
            requestOptions = { ...options, sort: processSortOption(options.sort) };
        } else if (options != null && options.sort == null) {
            requestOptions = { ...options, sort: undefined };
            delete requestOptions.sort;
        }
        filter = serialize(filter);
        update = serialize(update);
        setDefaultIdForUpsert(filter, update, requestOptions, false);
        return this.collection.updateOne(filter, update, requestOptions);
    }

    /**
     * Update multiple documents in a collection that match the given filter.
     * @param filter
     * @param update
     * @param options
     */
    updateMany(filter: Record<string, unknown>, update: Record<string, unknown>, options?: UpdateManyOptions) {
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
    runCommand(command: Record<string, unknown>) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return (this.collection as any)._httpClient.executeCommand(command);
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

function processSortOption(sort: MongooseSortOption): SortOptionInternal {
    const result: SortOptionInternal = {};
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
            result[key] = $meta as unknown as SortDirection;
        }
    }
    
    return result;
}

export class OperationNotSupportedError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'OperationNotSupportedError';
    }
}

export function setDefaultIdForUpsert(filter: Record<string, unknown>, update: { $setOnInsert?: Record<string, unknown> } & Record<string, unknown>, options?: { upsert?: boolean }, replace?: boolean) {
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function _updateHasKey(update: Record<string, any>, key: string) {
    for (const operator of Object.keys(update)) {
        if (update[operator] != null && typeof update[operator] === 'object' && key in update[operator]) {
            return true;
        }
    }
    return false;
}

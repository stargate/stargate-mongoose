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
    DeleteOneOptions,
    DeleteOneOptionsForDataAPI,
    FindOneAndDeleteOptions,
    FindOneAndDeleteOptionsForDataAPI,
    FindOneAndReplaceOptions,
    FindOneAndReplaceOptionsForDataAPI,
    FindOneAndUpdateOptions,
    FindOneAndUpdateOptionsForDataAPI,
    FindOneOptions,
    FindOneOptionsForDataAPI,
    FindOptions,
    FindOptionsForDataAPI,
    InsertManyOptions,
    SortOption,
    SortOptionInternal,
    UpdateManyOptions,
    UpdateOneOptions,
    UpdateOneOptionsForDataAPI
} from '@/src/collections/options';
import { DataAPIDeleteResult } from '../collections/collection';

import { version } from 'mongoose';

const IS_MONGOOSE_7 = version.startsWith('7.');

type NodeCallback<ResultType = any> = (err: Error | null, res: ResultType | null) => unknown;

/**
 * Collection operations supported by the driver.
 */
export class Collection extends MongooseCollection {
    debugType = 'StargateMongooseCollection';

    constructor(name: string, conn: any, options?: any) {
        super(name, conn, options);
        if (options?.modelName != null) {
            this.modelName = options.modelName;
            delete options.modelName;
        }
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
    count(filter: Record<string, any>) {
        return this.collection.count(filter);
    }

    /**
     * Count documents in the collection that match the given filter.
     * @param filter
     */
    countDocuments(filter: Record<string, any>) {
        return this.collection.countDocuments(filter);
    }

    /**
     * Find documents in the collection that match the given filter.
     * @param filter
     * @param options
     * @param callback
     */
    find(filter: Record<string, any>, options?: FindOptions, callback?: NodeCallback<Record<string, any>[]>) {
        let requestOptions: FindOptionsForDataAPI | undefined = undefined;
        if (options != null && options.sort != null) {
            requestOptions = { ...options, sort: processSortOption(options.sort) };
        } else if (options != null && options.sort == null) {
            requestOptions = { ...options, sort: undefined };
            delete requestOptions.sort;
        }
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
    findOne(filter: Record<string, any>, options?: FindOneOptions) {
        let requestOptions: FindOneOptionsForDataAPI | undefined = undefined;
        if (options != null && options.sort != null) {
            requestOptions = { ...options, sort: processSortOption(options.sort) };
        } else if (options != null && options.sort == null) {
            requestOptions = { ...options, sort: undefined };
            delete requestOptions.sort;
        }
        return this.collection.findOne(filter, requestOptions);
    }

    /**
     * Insert a single document into the collection.
     * @param doc
     */
    insertOne(doc: Record<string, any>) {
        return this.collection.insertOne(doc);
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
                        ret.insertedIds = ret.insertedIds!.concat(insertedIds);
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
                        ret.insertedIds = ret.insertedIds!.concat(insertedIds);
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
    async findOneAndUpdate(filter: Record<string, any>, update: Record<string, any>, options?: FindOneAndUpdateOptions) {
        let requestOptions: FindOneAndUpdateOptionsForDataAPI | undefined = undefined;
        if (options != null && options.sort != null) {
            requestOptions = { ...options, sort: processSortOption(options.sort) };
        } else if (options != null && options.sort == null) {
            requestOptions = { ...options, sort: undefined };
            delete requestOptions.sort;
        }
        const res = await this.collection.findOneAndUpdate(filter, update, requestOptions);
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
    async findOneAndDelete(filter: Record<string, any>, options?: FindOneAndDeleteOptions) {
        let requestOptions: FindOneAndDeleteOptionsForDataAPI | undefined = undefined;
        if (options != null && options.sort != null) {
            requestOptions = { ...options, sort: processSortOption(options.sort) };
        } else if (options != null && options.sort == null) {
            requestOptions = { ...options, sort: undefined };
            delete requestOptions.sort;
        }
        const res = await this.collection.findOneAndDelete(filter, requestOptions);
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
    async findOneAndReplace(filter: Record<string, any>, newDoc: Record<string, any>, options?: FindOneAndReplaceOptions) {
        let requestOptions: FindOneAndReplaceOptionsForDataAPI | undefined = undefined;
        if (options != null && options.sort != null) {
            requestOptions = { ...options, sort: processSortOption(options.sort) };
        } else if (options != null && options.sort == null) {
            requestOptions = { ...options, sort: undefined };
            delete requestOptions.sort;
        }
        const res = await this.collection.findOneAndReplace(filter, newDoc, requestOptions);
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
    deleteMany(filter: Record<string, any>) {
        return this.collection.deleteMany(filter);
    }

    /**
     * Delete a single document in a collection that matches the given filter.
     * @param filter
     * @param options
     * @param callback
     */
    deleteOne(filter: Record<string, any>, options?: DeleteOneOptions, callback?: NodeCallback<DataAPIDeleteResult>) {    
        let requestOptions: DeleteOneOptionsForDataAPI | undefined = undefined;
        if (options != null && options.sort != null) {
            requestOptions = { ...options, sort: processSortOption(options.sort) };
        } else if (options != null && options.sort == null) {
            requestOptions = { ...options, sort: undefined };
            delete requestOptions.sort;
        }
        
        const promise = this.collection.deleteOne(filter, requestOptions);

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
    updateOne(filter: Record<string, any>, update: Record<string, any>, options?: UpdateOneOptions) {
        let requestOptions: UpdateOneOptionsForDataAPI | undefined = undefined;
        if (options != null && options.sort != null) {
            requestOptions = { ...options, sort: processSortOption(options.sort) };
        } else if (options != null && options.sort == null) {
            requestOptions = { ...options, sort: undefined };
            delete requestOptions.sort;
        }
        return this.collection.updateOne(filter, update, requestOptions);
    }

    /**
     * Update multiple documents in a collection that match the given filter.
     * @param filter
     * @param update
     * @param options
     */
    updateMany(filter: Record<string, any>, update: Record<string, any>, options?: UpdateManyOptions) {
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
        return this.collection.runCommand(command);
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

function processSortOption(sort: SortOption): SortOptionInternal {
    const result: SortOptionInternal = {};
    for (const key of Object.keys(sort)) {
        const sortValue = sort[key];
        if (sortValue == null || typeof sortValue !== 'object') {
            result[key] = sortValue;
            continue;
        }

        const $meta = typeof sortValue === 'object' && sortValue.$meta;
        if ($meta) {
            result[key] = $meta;
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

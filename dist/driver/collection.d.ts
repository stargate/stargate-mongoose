import { default as MongooseCollection } from 'mongoose/lib/collection';
import type { Connection } from './connection';
import { Collection as AstraCollection, DeleteOneOptions as DeleteOneOptionsInternal, DeleteOneResult, FindCursor, FindOptions as FindOptionsInternal, FindOneAndDeleteOptions as FindOneAndDeleteOptionsInternal, FindOneAndReplaceOptions as FindOneAndReplaceOptionsInternal, FindOneAndUpdateOptions as FindOneAndUpdateOptionsInternal, FindOneOptions as FindOneOptionsInternal, UpdateManyOptions, UpdateOneOptions as UpdateOneOptionsInternal, InsertManyOptions, InsertManyResult } from '@datastax/astra-db-ts';
export type MongooseSortOption = Record<string, 1 | -1 | {
    $meta: Array<number>;
} | {
    $meta: string;
}>;
type FindOptions = Omit<FindOptionsInternal, 'sort'> & {
    sort?: MongooseSortOption;
};
type FindOneOptions = Omit<FindOneOptionsInternal, 'sort'> & {
    sort?: MongooseSortOption;
};
type FindOneAndUpdateOptions = Omit<FindOneAndUpdateOptionsInternal, 'sort'> & {
    sort?: MongooseSortOption;
};
type FindOneAndDeleteOptions = Omit<FindOneAndDeleteOptionsInternal, 'sort'> & {
    sort?: MongooseSortOption;
};
type FindOneAndReplaceOptions = Omit<FindOneAndReplaceOptionsInternal, 'sort'> & {
    sort?: MongooseSortOption;
};
type DeleteOneOptions = Omit<DeleteOneOptionsInternal, 'sort'> & {
    sort?: MongooseSortOption;
};
type UpdateOneOptions = Omit<UpdateOneOptionsInternal, 'sort'> & {
    sort?: MongooseSortOption;
};
type NodeCallback<ResultType = unknown> = (err: Error | null, res: ResultType | null) => unknown;
/**
 * Collection operations supported by the driver.
 */
export declare class Collection extends MongooseCollection {
    debugType: string;
    constructor(name: string, conn: Connection, options?: {
        modelName?: string | null;
    });
    get collection(): AstraCollection;
    /**
     * Count documents in the collection that match the given filter.
     * @param filter
     */
    countDocuments(filter: Record<string, unknown>): Promise<number>;
    /**
     * Find documents in the collection that match the given filter.
     * @param filter
     * @param options
     * @param callback
     */
    find(filter: Record<string, unknown>, options?: FindOptions, callback?: NodeCallback<FindCursor<unknown>>): unknown;
    /**
     * Find a single document in the collection that matches the given filter.
     * @param filter
     * @param options
     */
    findOne(filter: Record<string, unknown>, options?: FindOneOptions): Promise<import("@datastax/astra-db-ts").FoundDoc<import("@datastax/astra-db-ts").SomeDoc> | null>;
    /**
     * Insert a single document into the collection.
     * @param doc
     */
    insertOne(doc: Record<string, unknown>): Promise<import("@datastax/astra-db-ts").InsertOneResult<import("@datastax/astra-db-ts").SomeDoc>>;
    /**
     * Insert multiple documents into the collection.
     * @param documents
     * @param options
     */
    insertMany(documents: Record<string, unknown>[], options?: InsertManyOptions): Promise<InsertManyResult<Record<string, unknown>>>;
    /**
     * Update a single document in a collection.
     * @param filter
     * @param update
     * @param options
     */
    findOneAndUpdate(filter: Record<string, unknown>, update: Record<string, unknown>, options?: FindOneAndUpdateOptions): Promise<import("@datastax/astra-db-ts").WithId<import("@datastax/astra-db-ts").SomeDoc> | import("@datastax/astra-db-ts").ModifyResult<import("@datastax/astra-db-ts").SomeDoc> | null>;
    /**
     * Find a single document in the collection and delete it.
     * @param filter
     * @param options
     */
    findOneAndDelete(filter: Record<string, unknown>, options?: FindOneAndDeleteOptions): Promise<import("@datastax/astra-db-ts").WithId<import("@datastax/astra-db-ts").SomeDoc> | import("@datastax/astra-db-ts").ModifyResult<import("@datastax/astra-db-ts").SomeDoc> | null>;
    /**
     * Find a single document in the collection and replace it.
     * @param filter
     * @param newDoc
     * @param options
     */
    findOneAndReplace(filter: Record<string, unknown>, newDoc: Record<string, unknown>, options?: FindOneAndReplaceOptions): Promise<import("@datastax/astra-db-ts").WithId<import("@datastax/astra-db-ts").SomeDoc> | import("@datastax/astra-db-ts").ModifyResult<import("@datastax/astra-db-ts").SomeDoc> | null>;
    /**
     * Delete one or more documents in a collection that match the given filter.
     * @param filter
     */
    deleteMany(filter: Record<string, unknown>): Promise<import("@datastax/astra-db-ts").DeleteManyResult>;
    /**
     * Delete a single document in a collection that matches the given filter.
     * @param filter
     * @param options
     * @param callback
     */
    deleteOne(filter: Record<string, unknown>, options?: DeleteOneOptions, callback?: NodeCallback<DeleteOneResult>): Promise<DeleteOneResult>;
    /**
     * Update a single document in a collection that matches the given filter.
     * @param filter
     * @param update
     * @param options
     */
    updateOne(filter: Record<string, unknown>, update: Record<string, unknown>, options?: UpdateOneOptions): Promise<import("@datastax/astra-db-ts").UpdateOneResult<import("@datastax/astra-db-ts").SomeDoc>>;
    /**
     * Update multiple documents in a collection that match the given filter.
     * @param filter
     * @param update
     * @param options
     */
    updateMany(filter: Record<string, unknown>, update: Record<string, unknown>, options?: UpdateManyOptions): Promise<import("@datastax/astra-db-ts").UpdateManyResult<import("@datastax/astra-db-ts").SomeDoc>>;
    /**
     * Get the estimated number of documents in a collection based on collection metadata
     */
    estimatedDocumentCount(): Promise<number>;
    /**
     * Run an arbitrary command against this collection's http client
     * @param command
     */
    runCommand(command: Record<string, unknown>): any;
    /**
     * Bulk write not supported.
     * @param ops
     * @param options
     */
    bulkWrite(_ops: Record<string, unknown>[], _options?: Record<string, unknown>): void;
    /**
     * Aggregate not supported.
     * @param pipeline
     * @param options
     */
    aggregate(_pipeline: Record<string, unknown>[], _options?: Record<string, unknown>): void;
    /**
     * Bulk Save not supported.
     * @param docs
     * @param options
     */
    bulkSave(_docs: Record<string, unknown>[], _options?: Record<string, unknown>): void;
    /**
     * Clean indexes not supported.
     * @param options
     */
    cleanIndexes(_options?: Record<string, unknown>): void;
    /**
     * List indexes not supported.
     * @param options
     */
    listIndexes(_options?: Record<string, unknown>): void;
    /**
     * Create index not supported.
     *
     * Async because Mongoose `createIndexes()` throws an unhandled error if `createIndex()` throws a sync error
     * See Automattic/mongoose#14995
     *
     * @param fieldOrSpec
     * @param options
     */
    createIndex(_fieldOrSpec: Record<string, unknown>, _options?: Record<string, unknown>): Promise<void>;
    /**
     * Drop indexes not supported.
     */
    dropIndexes(): void;
    /**
     * Watch operation not supported.
     */
    watch(): void;
    /**
     * Distinct operation not supported.
     */
    distinct(): void;
    /**
     * Replace one operation not supported.
     */
    replaceOne(): void;
}
export declare class OperationNotSupportedError extends Error {
    constructor(message: string);
}
export declare function setDefaultIdForUpsert(filter: Record<string, unknown>, update: {
    $setOnInsert?: Record<string, unknown>;
} & Record<string, unknown>, options?: {
    upsert?: boolean;
}, replace?: boolean): void;
export {};

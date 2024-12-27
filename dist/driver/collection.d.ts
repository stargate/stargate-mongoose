import { default as MongooseCollection } from 'mongoose/lib/collection';
import type { Connection } from './connection';
import { Collection as AstraCollection, CollectionDeleteOneOptions as DeleteOneOptionsInternal, CollectionFindOptions as FindOptionsInternal, CollectionFindOneAndDeleteOptions as FindOneAndDeleteOptionsInternal, CollectionFindOneAndReplaceOptions as FindOneAndReplaceOptionsInternal, CollectionFindOneAndUpdateOptions as FindOneAndUpdateOptionsInternal, CollectionFindOneOptions as FindOneOptionsInternal, CollectionReplaceOneOptions, CollectionUpdateManyOptions, CollectionUpdateOneOptions as UpdateOneOptionsInternal, CollectionInsertManyOptions, Table as AstraTable, CreateTableIndexOptions } from '@datastax/astra-db-ts';
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
    includeResultMetadata?: boolean;
};
type FindOneAndDeleteOptions = Omit<FindOneAndDeleteOptionsInternal, 'sort'> & {
    sort?: MongooseSortOption;
    includeResultMetadata?: boolean;
};
type FindOneAndReplaceOptions = Omit<FindOneAndReplaceOptionsInternal, 'sort'> & {
    sort?: MongooseSortOption;
    includeResultMetadata?: boolean;
};
type DeleteOneOptions = Omit<DeleteOneOptionsInternal, 'sort'> & {
    sort?: MongooseSortOption;
};
type ReplaceOneOptions = Omit<CollectionReplaceOneOptions, 'sort'> & {
    sort?: MongooseSortOption;
};
type UpdateOneOptions = Omit<UpdateOneOptionsInternal, 'sort'> & {
    sort?: MongooseSortOption;
};
/**
 * Collection operations supported by the driver. This class is called "Collection" for consistency with Mongoose, because
 * in Mongoose a Collection is the interface that Models and Queries use to communicate with the database. However, from
 * an Astra perspective, this class can be a wrapper around a Collection **or** a Table depending on the corresponding db's
 * `useTables` option.
 */
export declare class Collection extends MongooseCollection {
    static [x: string]: any;
    debugType: string;
    _collection?: AstraCollection | AstraTable<Record<string, unknown>>;
    _closed: boolean;
    constructor(name: string, conn: Connection, options?: {
        modelName?: string | null;
    });
    get collection(): AstraCollection | AstraTable<Record<string, unknown>>;
    get useTables(): any;
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
    find(filter: Record<string, unknown>, options: FindOptions): import("@datastax/astra-db-ts").FindCursor<Record<string, unknown> | null, Partial<import("@datastax/astra-db-ts").FoundRow<Record<string, unknown>>>> | import("@datastax/astra-db-ts").FindCursor<Record<string, unknown> | null, Partial<import("@datastax/astra-db-ts").FoundDoc<import("@datastax/astra-db-ts").SomeDoc>>>;
    /**
     * Find a single document in the collection that matches the given filter.
     * @param filter
     * @param options
     */
    findOne(filter: Record<string, unknown>, options?: FindOneOptions): Promise<Record<string, unknown> | null>;
    /**
     * Insert a single document into the collection.
     * @param doc
     */
    insertOne(doc: Record<string, unknown>): Promise<import("@datastax/astra-db-ts").CollectionInsertOneResult<import("@datastax/astra-db-ts").FoundDoc<import("@datastax/astra-db-ts").SomeDoc>>> | Promise<import("@datastax/astra-db-ts").TableInsertOneResult<Partial<import("@datastax/astra-db-ts").FoundRow<Record<string, unknown>>>>>;
    /**
     * Insert multiple documents into the collection.
     * @param documents
     * @param options
     */
    insertMany(documents: Record<string, unknown>[], options?: CollectionInsertManyOptions): Promise<import("@datastax/astra-db-ts").CollectionInsertManyResult<import("@datastax/astra-db-ts").FoundDoc<import("@datastax/astra-db-ts").SomeDoc>> | import("@datastax/astra-db-ts").TableInsertManyResult<Partial<import("@datastax/astra-db-ts").FoundRow<Record<string, unknown>>>>>;
    /**
     * Update a single document in a collection.
     * @param filter
     * @param update
     * @param options
     */
    findOneAndUpdate(filter: Record<string, unknown>, update: Record<string, unknown>, options: FindOneAndUpdateOptions): Promise<Record<string, unknown> | {
        value: Record<string, unknown> | null;
    } | null>;
    /**
     * Find a single document in the collection and delete it.
     * @param filter
     * @param options
     */
    findOneAndDelete(filter: Record<string, unknown>, options: FindOneAndDeleteOptions): Promise<Record<string, unknown> | {
        value: Record<string, unknown> | null;
    } | null>;
    /**
     * Find a single document in the collection and replace it.
     * @param filter
     * @param newDoc
     * @param options
     */
    findOneAndReplace(filter: Record<string, unknown>, newDoc: Record<string, unknown>, options: FindOneAndReplaceOptions): Promise<Record<string, unknown> | {
        value: Record<string, unknown> | null;
    } | null>;
    /**
     * Delete one or more documents in a collection that match the given filter.
     * @param filter
     */
    deleteMany(filter: Record<string, unknown>): Promise<void> | Promise<import("@datastax/astra-db-ts").GenericDeleteManyResult>;
    /**
     * Delete a single document in a collection that matches the given filter.
     * @param filter
     * @param options
     * @param callback
     */
    deleteOne(filter: Record<string, unknown>, options: DeleteOneOptions): Promise<void> | Promise<import("@datastax/astra-db-ts").CollectionDeleteOneResult>;
    /**
     * Update a single document in a collection that matches the given filter, replacing it with `replacement`.
     * Converted to a `findOneAndReplace()` under the hood.
     * @param filter
     * @param replacement
     * @param options
     */
    replaceOne(filter: Record<string, unknown>, replacement: Record<string, unknown>, options: ReplaceOneOptions): Promise<import("@datastax/astra-db-ts").CollectionReplaceOneResult<import("@datastax/astra-db-ts").FoundDoc<import("@datastax/astra-db-ts").SomeDoc>>>;
    /**
     * Update a single document in a collection that matches the given filter.
     * @param filter
     * @param update
     * @param options
     */
    updateOne(filter: Record<string, unknown>, update: Record<string, unknown>, options: UpdateOneOptions): Promise<{}>;
    /**
     * Update multiple documents in a collection that match the given filter.
     * @param filter
     * @param update
     * @param options
     */
    updateMany(filter: Record<string, unknown>, update: Record<string, unknown>, options: CollectionUpdateManyOptions): Promise<import("@datastax/astra-db-ts").CollectionUpdateManyResult<import("@datastax/astra-db-ts").FoundDoc<import("@datastax/astra-db-ts").SomeDoc>>>;
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
     * List indexes not supported.
     * @param options
     */
    listIndexes(): AsyncCursorPlaceholder<{
        name: string;
        key: Record<string, never>;
    }>;
    /**
     * Create a new index
     *
     * @param name
     * @param column
     * @param options
     */
    createIndex(indexSpec: Record<string, boolean>, options?: CreateTableIndexOptions & {
        name?: string;
    }): Promise<void>;
    /**
     * Drop an existin index
     *
     * @param name
     */
    dropIndex(name: string): Promise<void>;
    /**
     * Watch operation not supported.
     */
    watch(): void;
    /**
     * Distinct operation not supported.
     */
    distinct(): void;
}
export declare class OperationNotSupportedError extends Error {
    constructor(message: string);
}
export declare function setDefaultIdForUpsert(filter: Record<string, unknown>, update: {
    $setOnInsert?: Record<string, unknown>;
} & Record<string, unknown>, options: {
    upsert?: boolean;
}, replace?: boolean): void;
/**
 * Mongoose expects listIndexes() to return a cursor but Astra returns an array.
 */
declare class AsyncCursorPlaceholder<ValueType = unknown> {
    promise: Promise<Array<ValueType>>;
    constructor(promise: Promise<Array<ValueType>>);
    toArray(): Promise<ValueType[]>;
}
export {};

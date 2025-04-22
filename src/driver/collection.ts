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
    CollectionDeleteOneOptions,
    CollectionFindAndRerankOptions,
    CollectionFindOptions,
    CollectionFindOneAndDeleteOptions,
    CollectionFindOneAndReplaceOptions,
    CollectionFindOneAndUpdateOptions,
    CollectionFindOneOptions,
    CollectionReplaceOneOptions,
    CollectionUpdateManyOptions,
    CollectionUpdateOneOptions,
    CollectionInsertManyOptions,
    SortDirection,
    Sort as SortOptionInternal,
    Table as AstraTable,
    TableCreateIndexOptions,
    TableDeleteOneOptions,
    TableFilter,
    TableFindOneOptions,
    TableFindOptions,
    TableInsertManyOptions,
    TableOptions,
    TableIndexOptions,
    TableUpdateOneOptions,
    TableVectorIndexOptions,
    CollectionOptions,
    TableCreateVectorIndexOptions
} from '@datastax/astra-db-ts';
import { SchemaOptions } from 'mongoose';
import { serialize } from '../serialize';
import deserializeDoc from '../deserializeDoc';
import setDefaultIdForUpsert from '../setDefaultIdForUpsert';

export type MongooseSortOption = Record<string, 1 | -1 | { $meta: Array<number> } | { $meta: string }>;

type FindOptions = (Omit<CollectionFindOptions, 'sort'> | Omit<TableFindOptions, 'sort'>) & { sort?: MongooseSortOption };
type FindOneOptions = (Omit<CollectionFindOneOptions, 'sort'> | Omit<TableFindOneOptions, 'sort'>) & { sort?: MongooseSortOption };
type FindOneAndUpdateOptions = Omit<CollectionFindOneAndUpdateOptions, 'sort'>
    & { sort?: MongooseSortOption, includeResultMetadata?: boolean };
type FindOneAndDeleteOptions = Omit<CollectionFindOneAndDeleteOptions, 'sort'>
    & { sort?: MongooseSortOption, includeResultMetadata?: boolean };
type FindOneAndReplaceOptions = Omit<CollectionFindOneAndReplaceOptions, 'sort'>
    & { sort?: MongooseSortOption, includeResultMetadata?: boolean };
type DeleteOneOptions = (Omit<CollectionDeleteOneOptions, 'sort'> | Omit<TableDeleteOneOptions, 'sort'>)
    & { sort?: MongooseSortOption };
type ReplaceOneOptions = Omit<CollectionReplaceOneOptions, 'sort'> & { sort?: MongooseSortOption };
type UpdateOneOptions = (Omit<CollectionUpdateOneOptions, 'sort'> | Omit<TableUpdateOneOptions, 'sort'>)
    & { sort?: MongooseSortOption };

interface AstraMongooseIndexDescription {
    name: string,
    definition: { column: string, options?: TableIndexOptions | TableVectorIndexOptions },
    key: Record<string, 1>
}

interface AstraIndexDescription {
  name: string;
  definition: { column: string, options?: TableIndexOptions | TableVectorIndexOptions };
  indexType: string;
}

export interface MongooseCollectionOptions {
    schemaUserProvidedOptions?: SchemaOptions,
    capped?: boolean,
    modelName?: string,
    autoCreate?: boolean
}

/**
 * Collection operations supported by the driver. This class is called "Collection" for consistency with Mongoose, because
 * in Mongoose a Collection is the interface that Models and Queries use to communicate with the database. However, from
 * an Astra perspective, this class can be a wrapper around a Collection **or** a Table depending on the corresponding db's
 * `useTables` option. Needs to be a separate class because Mongoose only supports one collection class.
 */
export class Collection<DocType extends Record<string, unknown> = Record<string, unknown>> extends MongooseCollection {
    debugType = 'AstraMongooseCollection';
    _collection?: AstraCollection<DocType> | AstraTable<DocType>;
    _closed: boolean;
    connection: Connection;
    options?: (TableOptions | CollectionOptions) & MongooseCollectionOptions;
    name: string;

    constructor(name: string, conn: Connection, options?: (TableOptions | CollectionOptions) & MongooseCollectionOptions) {
        super(name, conn, options);
        this.connection = conn;
        this._closed = false;
        this.options = options;
        this.name = name;
    }

    // Get the collection or table. Cache the result so we don't recreate collection/table every time.
    get collection(): AstraCollection | AstraTable<DocType> {
        if (this._collection != null) {
            return this._collection;
        }

        const collectionOptions = this.options?.schemaUserProvidedOptions?.serdes
            // Type coercion because `collection<>` method below doesn't know whether we're creating a
            // Astra Table or Astra Collection until runtime
            ? { serdes: this.options.schemaUserProvidedOptions.serdes } as unknown as Record<string, never>
            : {};
        // Cache because @datastax/astra-db-ts doesn't
        const collection = this.connection.db!.collection<DocType>(this.name, collectionOptions);
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
    countDocuments(filter: Record<string, unknown>) {
        if (this.collection instanceof AstraTable) {
            throw new OperationNotSupportedError('Cannot use countDocuments() with tables');
        }
        filter = serialize(filter);
        return this.collection.countDocuments(filter, 1000);
    }

    /**
     * Find documents in the collection that match the given filter.
     * @param filter
     * @param options
     * @param callback
     */
    find(filter: Record<string, unknown>, options: FindOptions) {
        const requestOptions: CollectionFindOptions | TableFindOptions = options != null && options.sort != null
            ? { ...options, sort: processSortOption(options.sort) }
            : { ...options, sort: undefined };
        filter = serialize(filter, this.useTables);

        // Weirdness to work around astra-db-ts method overrides: `find()` with `projection: never` means we need a separate branch
        if (this.collection instanceof AstraTable) {
            return this.collection.find(filter as TableFilter<DocType>, requestOptions).map(doc => deserializeDoc<DocType>(doc) as DocType);
        } else {
            return this.collection.find(filter, requestOptions).map(doc => deserializeDoc<DocType>(doc) as DocType);
        }
    }

    /**
     * Find a single document in the collection that matches the given filter.
     * @param filter
     * @param options
     */
    async findOne(filter: Record<string, unknown>, options?: FindOneOptions) {
        // Weirdness to work around astra-db-ts method overrides
        if (options == null) {
            filter = serialize(filter, this.useTables);
            if (this.collection instanceof AstraTable) {
                return this.collection.findOne(filter as TableFilter<DocType>).then(doc => deserializeDoc<DocType>(doc));
            }
            return this.collection.findOne(filter).then(doc => deserializeDoc<DocType>(doc));
        }

        const requestOptions: CollectionFindOneOptions | TableFindOneOptions = options != null && options.sort != null
            ? { ...options, sort: processSortOption(options.sort) }
            : { ...options, sort: undefined };

        filter = serialize(filter, this.useTables);

        // Weirdness to work around astra-db-ts method overrides: `findOne()` with `projection: never` means we need a separate branch
        if (this.collection instanceof AstraTable) {
            return this.collection.findOne(filter as TableFilter<DocType>, requestOptions).then(doc => deserializeDoc<DocType>(doc));
        } else {
            return this.collection.findOne(filter, requestOptions).then(doc => deserializeDoc<DocType>(doc));
        }
    }

    /**
     * Insert a single document into the collection.
     * @param doc
     */
    insertOne(doc: Record<string, unknown>) {
        return this.collection.insertOne(serialize(doc, this.useTables) as DocType);
    }

    /**
     * Insert multiple documents into the collection.
     * @param documents
     * @param options
     */
    async insertMany(documents: Record<string, unknown>[], options?: CollectionInsertManyOptions | TableInsertManyOptions) {
        documents = documents.map(doc => serialize(doc, this.useTables));
        return this.collection.insertMany(documents as DocType[], options);
    }

    /**
     * Update a single document in a collection.
     * @param filter
     * @param update
     * @param options
     */
    async findOneAndUpdate(filter: Record<string, unknown>, update: Record<string, unknown>, options: FindOneAndUpdateOptions) {
        if (this.collection instanceof AstraTable) {
            throw new OperationNotSupportedError('Cannot use findOneAndUpdate() with tables');
        }
        const requestOptions: CollectionFindOneAndUpdateOptions = options.sort != null
            ? { ...options, sort: processSortOption(options.sort) }
            : { ...options, sort: undefined };

        filter = serialize(filter);
        setDefaultIdForUpsert(filter, update, requestOptions, false);
        update = serialize(update);

        // Weirdness to work around TypeScript, otherwise TypeScript fails with
        // "Types of property 'includeResultMetadata' are incompatible: Type 'boolean | undefined' is not assignable to type 'false | undefined'."
        if (options?.includeResultMetadata) {
            return this.collection.findOneAndUpdate(filter, update, requestOptions).then((value: Record<string, unknown> | null) => {
                return { value: deserializeDoc<DocType>(value) };
            });
        } else {
            return this.collection.findOneAndUpdate(filter, update, requestOptions).then((doc: Record<string, unknown>  | null) => deserializeDoc<DocType>(doc));
        }
    }

    /**
     * Find a single document in the collection and delete it.
     * @param filter
     * @param options
     */
    async findOneAndDelete(filter: Record<string, unknown>, options: FindOneAndDeleteOptions) {
        if (this.collection instanceof AstraTable) {
            throw new OperationNotSupportedError('Cannot use findOneAndDelete() with tables');
        }
        const requestOptions: CollectionFindOneAndDeleteOptions = options.sort != null
            ? { ...options, sort: processSortOption(options.sort) }
            : { ...options, sort: undefined };
        filter = serialize(filter);

        // Weirdness to work around TypeScript, otherwise TypeScript fails with
        // "Types of property 'includeResultMetadata' are incompatible: Type 'boolean | undefined' is not assignable to type 'false | undefined'."
        if (options?.includeResultMetadata) {
            return this.collection.findOneAndDelete(filter, requestOptions).then((value: Record<string, unknown>  | null) => {
                return { value: deserializeDoc<DocType>(value) };
            });
        } else {
            return this.collection.findOneAndDelete(filter, requestOptions).then((doc: Record<string, unknown>  | null) => deserializeDoc<DocType>(doc));
        }
    }

    /**
     * Find a single document in the collection and replace it.
     * @param filter
     * @param newDoc
     * @param options
     */
    async findOneAndReplace(filter: Record<string, unknown>, newDoc: Record<string, unknown>, options: FindOneAndReplaceOptions) {
        if (this.collection instanceof AstraTable) {
            throw new OperationNotSupportedError('Cannot use findOneAndReplace() with tables');
        }
        const requestOptions: CollectionFindOneAndReplaceOptions = options.sort != null
            ? { ...options, sort: processSortOption(options.sort) }
            : { ...options, sort: undefined };
        filter = serialize(filter);
        setDefaultIdForUpsert(filter, newDoc, requestOptions, true);
        newDoc = serialize(newDoc);

        // Weirdness to work around TypeScript, otherwise TypeScript fails with
        // "Types of property 'includeResultMetadata' are incompatible: Type 'boolean | undefined' is not assignable to type 'false | undefined'."
        if (options?.includeResultMetadata) {
            return this.collection.findOneAndReplace(filter, newDoc, requestOptions).then((value: Record<string, unknown> | null) => {
                return { value: deserializeDoc<DocType>(value) };
            });
        } else {
            return this.collection.findOneAndReplace(filter, newDoc, requestOptions).then((doc: Record<string, unknown> | null) => deserializeDoc<DocType>(doc));
        }
    }

    /**
     * Delete one or more documents in a collection that match the given filter.
     * @param filter
     */
    deleteMany(filter: Record<string, unknown>) {
        filter = serialize(filter, this.useTables);
        return this.collection.deleteMany(filter as TableFilter<DocType>);
    }

    /**
     * Delete a single document in a collection that matches the given filter.
     * @param filter
     * @param options
     * @param callback
     */
    deleteOne(filter: Record<string, unknown>, options: DeleteOneOptions) {
        const requestOptions: CollectionDeleteOneOptions | TableDeleteOneOptions = options.sort != null
            ? { ...options, sort: processSortOption(options.sort) }
            : { ...options, sort: undefined };
        filter = serialize(filter, this.useTables);
        return this.collection.deleteOne(filter as TableFilter<DocType>, requestOptions);
    }

    /**
     * Update a single document in a collection that matches the given filter, replacing it with `replacement`.
     * Converted to a `findOneAndReplace()` under the hood.
     * @param filter
     * @param replacement
     * @param options
     */
    replaceOne(filter: Record<string, unknown>, replacement: Record<string, unknown>, options: ReplaceOneOptions) {
        if (this.collection instanceof AstraTable) {
            throw new OperationNotSupportedError('Cannot use replaceOne() with tables');
        }
        const requestOptions: CollectionReplaceOneOptions = options.sort != null
            ? { ...options, sort: processSortOption(options.sort) }
            : { ...options, sort: undefined };
        filter = serialize(filter);
        setDefaultIdForUpsert(filter, replacement, requestOptions, true);
        replacement = serialize(replacement);
        return this.collection.replaceOne(filter, replacement, requestOptions);
    }

    /**
     * Update a single document in a collection that matches the given filter.
     * @param filter
     * @param update
     * @param options
     */
    updateOne(filter: Record<string, unknown>, update: Record<string, unknown>, options: UpdateOneOptions) {
        const requestOptions: CollectionUpdateOneOptions | TableUpdateOneOptions = options.sort != null
            ? { ...options, sort: processSortOption(options.sort) }
            : { ...options, sort: undefined };
        filter = serialize(filter, this.useTables);
        setDefaultIdForUpsert(filter, update, requestOptions, false);
        update = serialize(update, this.useTables);
        return this.collection.updateOne(filter as TableFilter<DocType>, update, requestOptions).then(res => {
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
    updateMany(filter: Record<string, unknown>, update: Record<string, unknown>, options: CollectionUpdateManyOptions) {
        if (this.collection instanceof AstraTable) {
            throw new OperationNotSupportedError('Cannot use updateMany() with tables');
        }
        filter = serialize(filter, this.useTables);
        setDefaultIdForUpsert(filter, update, options, false);
        update = serialize(update, this.useTables);
        return this.collection.updateMany(filter, update, options);
    }

    /**
     * Get the estimated number of documents in a collection based on collection metadata
     */
    estimatedDocumentCount() {
        if (this.collection instanceof AstraTable) {
            throw new OperationNotSupportedError('Cannot use estimatedDocumentCount() with tables');
        }
        return this.collection.estimatedDocumentCount();
    }

    /**
     * Run an arbitrary command against this collection
     * @param command
     */
    runCommand(command: Record<string, unknown>) {
        return this.connection.db!.astraDb.command(command, this.useTables ? { table: this.name } : { collection: this.name });
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
     * Returns a list of all indexes on the collection. Returns a pseudo-cursor for Mongoose compatibility.
     * Only works in tables mode, throws an error in collections mode.
     */
    listIndexes(): { toArray: () => Promise<AstraMongooseIndexDescription[]> } {
        if (this.collection instanceof AstraCollection) {
            throw new OperationNotSupportedError('Cannot use listIndexes() with collections');
        }

        /**
         * Mongoose expects listIndexes() to return a cursor but Astra returns an array. Mongoose itself doesn't support
         * returning a cursor from Model.listIndexes(), so all we need to return is an object with a toArray() function.
         */
        return {
            toArray: () => this.runCommand({ listIndexes: { options: { explain: true } } })
                .then(res => {
                    const indexes = (res as { status: { indexes: AstraIndexDescription[] } }).status.indexes;
                    // Mongoose uses the `key` property of an index for index diffing in `cleanIndexes()` and `syncIndexes()`.
                    return indexes.map((index) => ({ ...index, key: { [index.definition.column]: 1 } }));
                })
        };
    }

    /**
     * Create a new index. Only works in tables mode, throws an error in collections mode.
     *
     * @param indexSpec MongoDB-style index spec for Mongoose compatibility
     * @param options
     */
    async createIndex(indexSpec: Record<string, boolean>, options: TableCreateVectorIndexOptions & { name?: string, vector: true }): Promise<void>;
    async createIndex(indexSpec: Record<string, boolean>, options?: TableCreateIndexOptions & { name?: string, vector?: false }): Promise<void>;

    async createIndex(indexSpec: Record<string, boolean | 1 | -1>, options?: (TableCreateVectorIndexOptions | TableCreateIndexOptions) & { name?: string, vector?: boolean }): Promise<void> {
        if (this.collection instanceof AstraCollection) {
            throw new OperationNotSupportedError('Cannot use createIndex() with collections');
        }
        if (Object.keys(indexSpec).length !== 1) {
            throw new TypeError('createIndex indexSpec must have exactly 1 key');
        }
        const [column] = Object.keys(indexSpec);
        if (options?.vector) {
            return this.collection.createVectorIndex(
                options?.name ?? column,
                column,
                { ifNotExists: true, ...(options as TableCreateVectorIndexOptions) }
            );
        }

        return this.collection.createIndex(
            options?.name ?? column,
            column,
            { ifNotExists: true, ...(options as TableCreateIndexOptions) }
        );
    }

    /**
     * Drop an existing index by name. Only works in tables mode, throws an error in collections mode.
     *
     * @param name
     */
    async dropIndex(name: string) {
        if (this.collection instanceof AstraCollection) {
            throw new OperationNotSupportedError('Cannot use dropIndex() with collections');
        }
        await this.connection.db!.astraDb.dropTableIndex(name);
    }

    async findAndRerank(filter: Record<string, unknown>, options?: CollectionFindAndRerankOptions) {
        if (this.collection instanceof AstraTable) {
            throw new OperationNotSupportedError('Cannot use findAndRerank() with tables');
        }
        return this.collection.findAndRerank(filter, options);
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
            // for vector sort and vectorize sort, but that works in tables. astra-mongoose added
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

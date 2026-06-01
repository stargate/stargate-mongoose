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

import { AstraMongooseError } from '../astraMongooseError';
import { BaseCollection as MongooseCollection } from 'mongoose';
import type { BaseConnection as MongooseConnection } from 'mongoose';
import type { Connection } from './connection';
import {
    Collection as AstraCollection,
    CollectionCountDocumentsOptions,
    CollectionDeleteManyOptions,
    CollectionDeleteOneOptions,
    CollectionEstimatedDocumentCountOptions,
    CollectionFindAndRerankOptions,
    CollectionFindOptions,
    CollectionFindOneAndDeleteOptions,
    CollectionFindOneAndReplaceOptions,
    CollectionFindOneAndUpdateOptions,
    CollectionFindOneOptions,
    CollectionInsertManyOptions,
    CollectionInsertOneOptions,
    CollectionOptions,
    CollectionReplaceOneOptions,
    CollectionUpdateFilter,
    CollectionUpdateManyOptions,
    CollectionUpdateOneOptions,
    CreateTableDefinition,
    CreateTableOptions,
    Filter,
    RunCommandOptions,
    SortDirection,
    Sort as SortOptionInternal,
    StrictCreateTableColumnDefinition,
    Table as AstraTable,
    TableDeleteManyOptions,
    TableDeleteOneOptions,
    TableDropIndexOptions,
    TableFilter,
    TableFindOneOptions,
    TableFindOptions,
    TableIndexColumn,
    TableInsertManyOptions,
    TableInsertOneOptions,
    TableOptions,
    TableIndexOptions,
    TableTextIndexOptions,
    TableUpdateFilter,
    TableUpdateOneOptions,
    TableVectorIndexOptions
} from '@datastax/astra-db-ts';
import { OperationNotSupportedError } from '../operationNotSupportedError';
import { SchemaOptions } from 'mongoose';
import { Writable } from 'stream';
import deserializeDoc from '../deserializeDoc';
import { IndexSpecification, Sort as MongoDBSort, WithId, InferIdType } from 'mongodb';
import { inspect } from 'util';
import { serialize } from '../serialize';
import { setDefaultIdForUpdate, setDefaultIdForReplace } from '../setDefaultIdForUpsert';

export type MongooseSortOption = MongoDBSort | Record<string, 1 | -1 | { $meta: Array<number> }>;

type DeleteManyOptions = (Omit<CollectionDeleteManyOptions, 'maxTimeMS'> | Omit<TableDeleteManyOptions, 'maxTimeMS'>) & { maxTimeMS?: number };
type DeleteOneOptions = (Omit<CollectionDeleteOneOptions, 'sort' | 'maxTimeMS'> | Omit<TableDeleteOneOptions, 'sort' | 'maxTimeMS'>)
    & { sort?: MongooseSortOption, maxTimeMS?: number };
type FindOptions = (Omit<CollectionFindOptions, 'sort'> | Omit<TableFindOptions, 'sort' | 'timeout' | 'maxTimeMS'>)
  & { sort?: MongooseSortOption, maxTimeMS?: number, timeout?: boolean };
type FindOneOptions = (Omit<CollectionFindOneOptions, 'sort'> | Omit<TableFindOneOptions, 'sort' | 'timeout' | 'maxTimeMS'>)
  & { sort?: MongooseSortOption, maxTimeMS?: number, timeout?: boolean };
type FindOneAndUpdateOptions = Omit<CollectionFindOneAndUpdateOptions, 'sort'>
    & { sort?: MongooseSortOption, includeResultMetadata?: boolean };
type FindOneAndDeleteOptions = Omit<CollectionFindOneAndDeleteOptions, 'sort' | 'maxTimeMS'>
    & { sort?: MongooseSortOption, includeResultMetadata?: boolean, maxTimeMS?: number };
type FindOneAndReplaceOptions = Omit<CollectionFindOneAndReplaceOptions, 'sort' | 'maxTimeMS'>
    & { sort?: MongooseSortOption, includeResultMetadata?: boolean, maxTimeMS?: number };
type CountDocumentsOptions = Omit<CollectionCountDocumentsOptions, 'maxTimeMS'> & { maxTimeMS?: number };
type InsertOneOptions = (Omit<CollectionInsertOneOptions, 'maxTimeMS'> | Omit<TableInsertOneOptions, 'maxTimeMS'>)
    & { maxTimeMS?: number };
type ReplaceOneOptions = Omit<CollectionReplaceOneOptions, 'sort' | 'maxTimeMS'> & { sort?: MongooseSortOption, maxTimeMS?: number };
type UpdateOneOptions = (Omit<CollectionUpdateOneOptions, 'sort' | 'maxTimeMS'> | Omit<TableUpdateOneOptions, 'sort' | 'maxTimeMS'>)
    & { sort?: MongooseSortOption, maxTimeMS?: number };

interface AstraMongooseIndexDescription {
    name: string,
    definition: {
      column: string | ({ [key: string]: '$keys' | '$values' }),
      options?: TableIndexOptions | TableVectorIndexOptions | TableTextIndexOptions;
    },
    key: Record<string, 1 | -1 | '$keys' | '$values'>
}

interface AstraIndexDescription {
  name: string;
  definition: {
    column: string | ({ [key: string]: '$keys' | '$values' }),
    options?: TableIndexOptions | TableVectorIndexOptions | TableTextIndexOptions;
  };
  indexType: string;
}

export interface MongooseCollectionOptions {
    schemaUserProvidedOptions?: SchemaOptions,
    capped?: boolean,
    modelName?: string,
    autoCreate?: boolean
}

const DEFAULT_DEBUG_INSPECT_DEPTH = 3;

/**
 * Collection operations supported by the driver. This class is called "Collection" for consistency with Mongoose, because
 * in Mongoose a Collection is the interface that Models and Queries use to communicate with the database. However, from
 * an Astra perspective, this class can be a wrapper around a Collection **or** a Table depending on the corresponding db's
 * `isTable` option. Needs to be a separate class because Mongoose only supports one collection class.
 */
export class Collection<DocType extends Record<string, unknown> = Record<string, unknown>> extends MongooseCollection<DocType> {
    debugType = 'AstraMongooseCollection';
    _collection?: AstraCollection<DocType> | AstraTable<DocType>;
    _closed: boolean;
    connection: Connection;
    // @ts-expect-error options is technically a function on Mongoose collections
    options?: (TableOptions | CollectionOptions) & MongooseCollectionOptions;
    name: string;

    constructor(name: string, conn: Connection, options?: (TableOptions | CollectionOptions) & MongooseCollectionOptions) {
        // Astra-mongoose connection does inherit from MongooseConnection, but in a slightly incompatible way currently,
        // so we need an `as`.
        super(name, conn as unknown as MongooseConnection, options);
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

        // Bubble up collection-level events from astra-db-ts to the main connection
        collection.on('commandStarted', (ev) => this.connection.emit('commandStarted', ev));
        collection.on('commandFailed', (ev) => this.connection.emit('commandFailed', ev));
        collection.on('commandSucceeded', (ev) => this.connection.emit('commandSucceeded', ev));
        collection.on('commandWarnings', (ev) => this.connection.emit('commandWarnings', ev));

        return collection;
    }

    // Get whether the underlying Astra store is a table or a collection. `connection.db` may be `null` if
    // the connection has never been opened (`mongoose.connect()` or `openUri()` never called), so in that
    // case we default to `isTable: false`.
    get isTable() {
        return this.connection.db?.isTable;
    }

    /**
     * Count documents in the collection that match the given filter.
     * @param filter
     */
    async countDocuments(filter: Filter, options?: CountDocumentsOptions) {
        // eslint-disable-next-line prefer-rest-params
        _logFunctionCall(this, this.connection.debug, this.name, 'countDocuments', arguments);
        if (this.collection instanceof AstraTable) {
            throw new OperationNotSupportedError('Cannot use countDocuments() with tables');
        }
        const remainingOptions = options == null ? {} : checkForMaxTimeMS(options);
        filter = serialize(filter);
        return await this.collection.countDocuments(filter, 1000, remainingOptions);
    }

    /**
     * Find documents in the collection that match the given filter.
     * @param filter
     * @param options
     * @param callback
     */

    // @ts-expect-error Astra cursor is not fully compatible with MongoDB cursor
    find(filter?: Filter, options?: FindOptions) {
        // eslint-disable-next-line prefer-rest-params
        _logFunctionCall(this, this.connection.debug, this.name, 'find', arguments);

        const remainingOptions = options == null ? {} : checkForTimeoutOption(checkForMaxTimeMS(options));
        const requestOptions: CollectionFindOptions | TableFindOptions = remainingOptions.sort != null
            ? { ...remainingOptions, sort: processSortOption(remainingOptions.sort) }
            : { ...remainingOptions, sort: undefined };
        filter = serialize(filter ?? {}, this.isTable);

        return this.collection.find(filter, requestOptions).map(doc => deserializeDoc<DocType>(doc) as DocType);
    }

    /**
     * Find a single document in the collection that matches the given filter.
     * @param filter
     * @param options
     */
    async findOne(filter?: Filter, options?: FindOneOptions) {
        // eslint-disable-next-line prefer-rest-params
        _logFunctionCall(this, this.connection.debug, this.name, 'findOne', arguments);

        const remainingOptions = options == null ? {} : checkForTimeoutOption(checkForMaxTimeMS(options));
        const requestOptions: CollectionFindOneOptions | TableFindOneOptions = remainingOptions.sort != null
            ? { ...remainingOptions, sort: processSortOption(remainingOptions.sort) }
            : { ...remainingOptions, sort: undefined };

        filter = serialize(filter ?? {}, this.isTable);

        return await this.collection.findOne(filter, requestOptions).then(doc => deserializeDoc<WithId<DocType>>(doc));
    }

    /**
     * Insert a single document into the collection.
     * @param doc
     */
    async insertOne(doc: Record<string, unknown>, options?: InsertOneOptions) {
        // eslint-disable-next-line prefer-rest-params
        _logFunctionCall(this, this.connection.debug, this.name, 'insertOne', arguments);
        const remainingOptions = options == null ? {} : checkForMaxTimeMS(options);
        return await this.collection.insertOne(serialize(doc, this.isTable) as DocType, remainingOptions).then(res => ({
            ...res,
            // make insertedIds match the MongoDB driver collection's return type
            insertedId: res.insertedId as unknown as WithId<DocType>['_id'],
            acknowledged: true
        }));
    }

    /**
     * Insert multiple documents into the collection.
     * @param documents
     * @param options
     */
    async insertMany(documents: readonly Record<string, unknown>[], options?: CollectionInsertManyOptions | TableInsertManyOptions | { ordered?: boolean }) {
        // eslint-disable-next-line prefer-rest-params
        _logFunctionCall(this, this.connection.debug, this.name, 'insertMany', arguments);
        documents = documents.map(doc => serialize(doc, this.isTable));
        return await this.collection.insertMany(documents as DocType[], options).then(res => ({
            ...res,
            // make insertedIds match the MongoDB driver collection's return type
            insertedIds: res.insertedIds as unknown as WithId<DocType>['_id'][],
            acknowledged: true
        }));
    }

    /**
     * Update a single document in a collection.
     * @param filter
     * @param update
     * @param options
     */

    // @ts-expect-error CollectionUpdateFilter not compatible with MongoDB UpdateFilter due to $inc inconsistencies and other issues
    async findOneAndUpdate(
        filter: Filter,
        update: CollectionUpdateFilter<DocType> | Record<string, unknown>[],
        options: FindOneAndUpdateOptions
    ) {
        if (Array.isArray(update)) {
            throw new AstraMongooseError('Astra-mongoose does not support update pipelines', { update });
        }

        // eslint-disable-next-line prefer-rest-params
        _logFunctionCall(this, this.connection.debug, this.name, 'findOneAndUpdate', arguments);
        if (this.collection instanceof AstraTable) {
            throw new OperationNotSupportedError('Cannot use findOneAndUpdate() with tables');
        }
        const requestOptions: CollectionFindOneAndUpdateOptions = options.sort != null
            ? { ...options, sort: processSortOption(options.sort) }
            : { ...options, sort: undefined };

        filter = serialize(filter);
        setDefaultIdForUpdate<DocType>(filter, update, requestOptions);
        update = serialize(update);

        return await this.collection.findOneAndUpdate(filter, update, requestOptions).then((value: Record<string, unknown> | null) => {
            if (options?.includeResultMetadata) {
                return { value: deserializeDoc<DocType>(value) };
            }
            return deserializeDoc<DocType>(value);
        });
    }

    /**
     * Find a single document in the collection and delete it.
     * @param filter
     * @param options
     */

    async findOneAndDelete(
      filter: Filter,
      options: (FindOneAndDeleteOptions & { includeResultMetadata: true })
    ): Promise<{ value: WithId<DocType> | null, ok: 1 }>;

    async findOneAndDelete(
      filter: Filter,
      options: (FindOneAndDeleteOptions & { includeResultMetadata: false })
    ): Promise<WithId<DocType> | null>;

    async findOneAndDelete(
      filter: Filter,
      options?: FindOneAndDeleteOptions
    ): Promise<WithId<DocType> | null>;

    async findOneAndDelete(filter: Filter, options?: FindOneAndDeleteOptions) {
        // eslint-disable-next-line prefer-rest-params
        _logFunctionCall(this, this.connection.debug, this.name, 'findOneAndDelete', arguments);
        if (this.collection instanceof AstraTable) {
            throw new OperationNotSupportedError('Cannot use findOneAndDelete() with tables');
        }
        const remainingOptions = options == null ? {} : checkForMaxTimeMS(options);
        const requestOptions: CollectionFindOneAndDeleteOptions = remainingOptions.sort != null
            ? { ...remainingOptions, sort: processSortOption(remainingOptions.sort) }
            : { ...remainingOptions, sort: undefined };
        filter = serialize(filter);

        return await this.collection.findOneAndDelete(filter, requestOptions).then((value: Record<string, unknown> | null) => {
            if (options?.includeResultMetadata) {
                return { value: deserializeDoc<WithId<DocType>>(value), ok: 1 };
            }
            return deserializeDoc<WithId<DocType>>(value);
        });
    }

    /**
     * Find a single document in the collection and replace it.
     * @param filter
     * @param newDoc
     * @param options
     */

    async findOneAndReplace(
      filter: Filter,
      newDoc: Record<string, unknown>,
      options: (FindOneAndReplaceOptions & { includeResultMetadata: true })
    ): Promise<{ value: WithId<DocType> | null, ok: 1 }>;

    async findOneAndReplace(
      filter: Filter,
      newDoc: Record<string, unknown>,
      options: (FindOneAndReplaceOptions & { includeResultMetadata: false })
    ): Promise<WithId<DocType> | null>;

    async findOneAndReplace(
      filter: Filter,
      newDoc: Record<string, unknown>,
      options?: (FindOneAndReplaceOptions & { includeResultMetadata?: boolean })
    ): Promise<WithId<DocType> | null>;

    async findOneAndReplace(
        filter: Filter,
        newDoc: Record<string, unknown>,
        options?: FindOneAndReplaceOptions
    ) {
        // eslint-disable-next-line prefer-rest-params
        _logFunctionCall(this, this.connection.debug, this.name, 'findOneAndReplace', arguments);
        if (this.collection instanceof AstraTable) {
            throw new OperationNotSupportedError('Cannot use findOneAndReplace() with tables');
        }
        const remainingOptions = options == null ? {} : checkForMaxTimeMS(options);
        const requestOptions: CollectionFindOneAndReplaceOptions = remainingOptions.sort != null
            ? { ...remainingOptions, sort: processSortOption(remainingOptions.sort) }
            : { ...remainingOptions, sort: undefined };
        filter = serialize(filter);
        setDefaultIdForReplace(filter, newDoc, requestOptions);
        newDoc = serialize(newDoc);

        return await this.collection.findOneAndReplace(filter, newDoc, requestOptions).then((value: Record<string, unknown> | null) => {
            if (options?.includeResultMetadata) {
                return { value: deserializeDoc<WithId<DocType>>(value), ok: 1 };
            }
            return deserializeDoc<WithId<DocType>>(value);
        });
    }

    /**
     * Delete one or more documents in a collection that match the given filter.
     * @param filter
     */
    async deleteMany(filter: Filter, options?: DeleteManyOptions) {
        // eslint-disable-next-line prefer-rest-params
        _logFunctionCall(this, this.connection.debug, this.name, 'deleteMany', arguments);
        filter = serialize(filter, this.isTable);
        const remainingOptions = options == null ? {} : checkForMaxTimeMS(options);
        const res = await this.collection.deleteMany(filter, remainingOptions);
        if (res == null) {
            return { acknowledged: true, deletedCount: -1 };
        }
        return { ...res, acknowledged: true };
    }

    /**
     * Delete a single document in a collection that matches the given filter.
     * @param filter
     * @param options
     * @param callback
     */
    async deleteOne(filter: Filter, options?: DeleteOneOptions) {
        // eslint-disable-next-line prefer-rest-params
        _logFunctionCall(this, this.connection.debug, this.name, 'deleteOne', arguments);
        const remainingOptions = options == null ? {} : checkForMaxTimeMS(options);
        const requestOptions: CollectionDeleteOneOptions | TableDeleteOneOptions = remainingOptions?.sort != null
            ? { ...remainingOptions, sort: processSortOption(remainingOptions?.sort) }
            : { ...remainingOptions, sort: undefined };
        filter = serialize(filter, this.isTable);
        const res = await this.collection.deleteOne(filter as TableFilter<DocType>, requestOptions);
        if (res == null) {
            return { acknowledged: true, deletedCount: -1 };
        }
        return { ...res, acknowledged: true };
    }

    /**
     * Update a single document in a collection that matches the given filter, replacing it with `replacement`.
     * Converted to a `findOneAndReplace()` under the hood.
     * @param filter
     * @param replacement
     * @param options
     */
    async replaceOne(
        filter: Filter,
        replacement: Record<string, unknown>,
        options?: ReplaceOneOptions
    ) {
        // eslint-disable-next-line prefer-rest-params
        _logFunctionCall(this, this.connection.debug, this.name, 'replaceOne', arguments);
        if (this.collection instanceof AstraTable) {
            throw new OperationNotSupportedError('Cannot use replaceOne() with tables');
        }

        const remainingOptions = options == null ? {} : checkForMaxTimeMS(options);
        const requestOptions: CollectionReplaceOneOptions = remainingOptions?.sort != null
            ? { ...remainingOptions, sort: processSortOption(remainingOptions.sort) }
            : { ...remainingOptions, sort: undefined };
        filter = serialize(filter);
        setDefaultIdForReplace(filter, replacement, requestOptions);
        replacement = serialize(replacement);
        return await this.collection.replaceOne(filter, replacement, requestOptions)
            .then(res => ({ ...res, acknowledged: true, upsertedId: null }));
    }

    /**
     * Update a single document in a collection that matches the given filter.
     * @param filter
     * @param update
     * @param options
     */

    async updateOne(
        filter: Filter,
        update: CollectionUpdateFilter<DocType> | TableUpdateFilter<DocType> | Record<string, unknown>[],
        options?: UpdateOneOptions
    ) {
        if (Array.isArray(update)) {
            throw new AstraMongooseError('Astra-mongoose does not support update pipelines', { update });
        }

        // eslint-disable-next-line prefer-rest-params
        _logFunctionCall(this, this.connection.debug, this.name, 'updateOne', arguments);
        const remainingOptions = checkForMaxTimeMS(options ?? {});
        const requestOptions: CollectionUpdateOneOptions | TableUpdateOneOptions = remainingOptions.sort != null
            ? { ...remainingOptions, sort: processSortOption(remainingOptions.sort) }
            : { ...remainingOptions, sort: undefined };
        filter = serialize(filter, this.isTable);
        // `setDefaultIdForUpdate` currently would not work with tables because tables don't support `$setOnInsert`.
        // But `setDefaultIdForUpdate` would also never use `$setOnInsert` if `updateOne` is used correctly because tables
        // require `_id` in filter. So safe to avoid this for tables.
        if (!this.isTable) {
            setDefaultIdForUpdate(filter, update as CollectionUpdateFilter<DocType>, requestOptions);
        }
        update = serialize(update, this.isTable);
        return await this.collection.updateOne(filter as TableFilter<DocType>, update, requestOptions).then(res => {
            // Mongoose currently has a bug where null response from updateOne() throws an error that we can't
            // catch here for unknown reasons. See Automattic/mongoose#15126. Tables API returns null here.
            return res ?
                { ...res, acknowledged: true, upsertedId: res.upsertedId as InferIdType<DocType> | null } :
                { acknowledged: true, matchedCount: 1, upsertedId: null, modifiedCount: -1, upsertedCount: -1 };
        });
    }

    /**
     * Update multiple documents in a collection that match the given filter.
     * @param filter
     * @param update
     * @param options
     */

    // @ts-expect-error CollectionUpdateFilter not compatible with MongoDB UpdateFilter due to $inc inconsistencies and other issues
    async updateMany(filter: Filter, update: CollectionUpdateFilter<DocType> | Record<string, unknown>[], options: CollectionUpdateManyOptions) {
        if (Array.isArray(update)) {
            throw new AstraMongooseError('Astra-mongoose does not support update pipelines', { update });
        }

        // eslint-disable-next-line prefer-rest-params
        _logFunctionCall(this, this.connection.debug, this.name, 'updateMany', arguments);
        if (this.collection instanceof AstraTable) {
            throw new OperationNotSupportedError('Cannot use updateMany() with tables');
        }
        filter = serialize(filter, this.isTable);
        setDefaultIdForUpdate(filter, update, options);
        update = serialize(update, this.isTable);
        return await this.collection.updateMany(filter, update, options).then(res => ({ ...res, acknowledged: true }));
    }

    /**
     * Get the estimated number of documents in a collection based on collection metadata
     */
    async estimatedDocumentCount(options?: CollectionEstimatedDocumentCountOptions & { maxTimeMS: never }) {
        // eslint-disable-next-line prefer-rest-params
        _logFunctionCall(this, this.connection.debug, this.name, 'estimatedDocumentCount', arguments);
        if (this.collection instanceof AstraTable) {
            throw new OperationNotSupportedError('Cannot use estimatedDocumentCount() with tables');
        }
        return await this.collection.estimatedDocumentCount(options);
    }

    /**
     * Sync the underlying table schema with the specified definition: creates a new
     * table if one doesn't exist, or alters the existing table to match the definition
     * by adding or dropping columns as necessary.
     *
     * Note that modifying an existing column is NOT supported and will throw an error.
     *
     * @param definition new table definition (strict only)
     * @param createTableOptions passed to createTable if the table doesn't exist
     * @param dryRun if true, don't actually perform the operation, just return info on what would happen
     * @returns An object with details of the planned or applied changes, including columnsToAdd, columnsToDrop, and createdNewTable.
     */
    async syncTable<DocType extends Record<string, unknown> = Record<string, unknown>>(
        definition: Pick<CreateTableDefinition, 'primaryKey'> & { columns: Record<string, StrictCreateTableColumnDefinition> },
        createTableOptions?: CreateTableOptions,
        dryRun?: boolean
    ) {
        const name = this.name;
        const existingTables = await this.connection.listTables({ nameOnly: false });
        const existingTable = existingTables.find(table => table.name === name);
        // Create new table with the specified definition if it doesn't exist
        if (!existingTable) {
            if (!dryRun) {
                await this.connection.createTable<DocType>(name, definition, createTableOptions);
            }
            return { columnsToAdd: Object.keys(definition.columns), columnsToDrop: [], createdNewTable: true };
        }

        const existingColumnNames = Object.keys(existingTable.definition.columns);
        const newColumnNames = Object.keys(definition.columns);
        const columnsToAdd = Object.keys(definition.columns)
            .filter(column => !existingColumnNames.includes(column));
        const columnsToDrop = existingColumnNames
            .filter(column => !newColumnNames.includes(column));

        const overlappingColumnNames = existingColumnNames.filter(column => newColumnNames.includes(column));
        const columnsToModify = overlappingColumnNames.filter(column => {
            const existingColumn = { ...existingTable.definition.columns[column] };
            if (existingColumn.apiSupport != null) {
                delete existingColumn.apiSupport;
            }
            return JSON.stringify(existingColumn) !== JSON.stringify(definition.columns[column]);
        });
        if (columnsToModify.length > 0) {
            throw new AstraMongooseError('syncTable cannot modify existing columns, found modified columns: ' + columnsToModify.join(', '));
        }

        const add = Object.fromEntries(
            columnsToAdd.map(name => [name, definition.columns[name]])
        );

        if (!dryRun) {
            if (columnsToAdd.length > 0) {
                await this.alterTable({
                    add: { columns: add }
                });
            }
            if (columnsToDrop.length > 0) {
                await this.alterTable({
                    drop: { columns: columnsToDrop }
                });
            }
        }

        return { columnsToAdd, columnsToDrop, createdNewTable: false };
    }

    /**
     * Alter the underlying table with the specified name and operation - can add or drop columns
     * @param operation add/drop
     */
    async alterTable(
        operation: { add: { columns: Record<string, StrictCreateTableColumnDefinition> } } |
          { drop: { columns: string[] } }
    ) {
        return this.runCommand({ alterTable: { operation } });
    }

    /**
     * Run an arbitrary command against this collection
     * @param command
     */
    async runCommand(command: Record<string, unknown>, options?: Omit<RunCommandOptions, 'table' | 'collection' | 'keyspace'>) {
        // eslint-disable-next-line prefer-rest-params
        _logFunctionCall(this, this.connection.debug, this.name, 'runCommand', arguments);
        return await this.connection.db!.astraDb.command(
            command,
            this.isTable ? { table: this.name, ...options } : { collection: this.name, ...options }
        );
    }

    /**
     * Bulk write not supported.
     * @param ops
     * @param options
     */
    bulkWrite(): never {
        // eslint-disable-next-line prefer-rest-params
        _logFunctionCall(this, this.connection.debug, this.name, 'bulkWrite', arguments);
        throw new OperationNotSupportedError('bulkWrite() Not Implemented');
    }

    /**
     * Aggregate not supported.
     * @param pipeline
     * @param options
     */
    aggregate(): never {
        // eslint-disable-next-line prefer-rest-params
        _logFunctionCall(this, this.connection.debug, this.name, 'aggregate', arguments);
        throw new OperationNotSupportedError('aggregate() Not Implemented');
    }

    /**
     * Returns a list of all indexes on the collection. Returns a pseudo-cursor for Mongoose compatibility.
     * Only works in tables mode, throws an error in collections mode.
     */

    // @ts-expect-error Returns a pseudo-cursor, which isn't fully compatible with MongoDB cursors.
    listIndexes(): { toArray: () => Promise<AstraMongooseIndexDescription[]> } {
        // eslint-disable-next-line prefer-rest-params
        _logFunctionCall(this, this.connection.debug, this.name, 'listIndexes', arguments);
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
                    return indexes.map((index) => ({ ...index, key: typeof index.definition.column === 'string' ? { [index.definition.column]: 1 } : index.definition.column }));
                })
        };
    }

    /**
     * Create a new index. Only works in tables mode, throws an error in collections mode.
     *
     * @param indexSpec MongoDB-style index spec for Mongoose compatibility
     * @param options
     */
    async createIndex(
        indexSpec: Record<string, boolean | 1 | -1 | '$keys' | '$values' | 'text'> | IndexSpecification,
        options?: (TableTextIndexOptions | TableIndexOptions | TableVectorIndexOptions) & { name?: string, vector?: boolean }
    ) {
        // eslint-disable-next-line prefer-rest-params
        _logFunctionCall(this, this.connection.debug, this.name, 'createIndex', arguments);
        if (this.collection instanceof AstraCollection) {
            throw new OperationNotSupportedError('Cannot use createIndex() with collections');
        }
        if (Object.keys(indexSpec).length !== 1) {
            throw new TypeError('createIndex indexSpec must have exactly 1 key');
        }

        const [[column, indexModifier]] = Object.entries(indexSpec);
        const indexName = options?.name ?? `${column}_index`;
        if (options?.vector) {
            // Vector index: `myVector: { type: [Number], index: { vector: true } }`
            await this.collection.createVectorIndex(
                indexName,
                column,
                { ifNotExists: true, options: options as TableVectorIndexOptions }
            );
        } else if (indexModifier === 'text') {
            // Text index: `content: { type: String, index: { text: true, analyzer: ... } }`
            // Checks `indexModifier` rather than `options?.text` because Mongoose has special handling for `index: { text: true }`
            // due to MongoDB index definitions.
            await this.collection.createTextIndex(
                indexName,
                column,
                { ifNotExists: true, options: options as TableTextIndexOptions }
            );
        } else {
            // Standard index: `test: { type: Number, index: true }`
            await this.collection.createIndex(
                indexName,
                indexModifier === '$keys' || indexModifier === '$values'
                    ? { [column]: indexModifier } as TableIndexColumn<unknown>
                    : column,
                { ifNotExists: true, options: options as TableIndexOptions }
            );
        }

        return indexName;
    }

    /**
     * Drop an existing index by name. Only works in tables mode, throws an error in collections mode.
     *
     * @param name
     */
    async dropIndex(name: string, options?: TableDropIndexOptions & { maxTimeMS: undefined }) {
        // eslint-disable-next-line prefer-rest-params
        _logFunctionCall(this, this.connection.debug, this.name, 'dropIndex', arguments);
        if (this.collection instanceof AstraCollection) {
            throw new OperationNotSupportedError('Cannot use dropIndex() with collections');
        }
        await this.connection.db!.astraDb.dropTableIndex(name, options);
        return {};
    }

    /**
     * Finds documents that match the filter and reranks them based on the provided options.
     * @param filter
     * @param options
     */
    async findAndRerank(filter: Filter, options?: CollectionFindAndRerankOptions) {
        // eslint-disable-next-line prefer-rest-params
        _logFunctionCall(this, this.connection.debug, this.name, 'findAndRerank', arguments);
        if (this.collection instanceof AstraTable) {
            throw new OperationNotSupportedError('Cannot use findAndRerank() with tables');
        }
        filter = serialize(filter, false);
        return this.collection.findAndRerank(filter, options)
            .map(result => ({ ...result, document: deserializeDoc(result.document) }));
    }

    /**
     * Watch operation not supported.
     *
     * @ignore
     */
    watch(): never {
        // eslint-disable-next-line prefer-rest-params
        _logFunctionCall(this, this.connection.debug, this.name, 'watch', arguments);
        throw new OperationNotSupportedError('watch() Not Implemented');
    }

    /**
     * Distinct operation not supported.
     *
     * @ignore
     */
    distinct(): never {
        // eslint-disable-next-line prefer-rest-params
        _logFunctionCall(this, this.connection.debug, this.name, 'distinct', arguments);
        throw new OperationNotSupportedError('distinct() Not Implemented');
    }
}

function processSortOption(sort: MongooseSortOption): SortOptionInternal {
    const result: SortOptionInternal = {};
    if (typeof sort === 'object' && sort != null && !Array.isArray(sort) && !(sort instanceof Map)) {
        const sortObj = sort as Record<string, SortDirection | { $meta: number[] | string }>;
        for (const key of Object.keys(sortObj)) {
            const sortValue = sortObj[key];
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
    } else {
        throw new Error('Sort must be an object');
    }


    return result;
}

/*!
 * Compatibility wrapper for Mongoose's `debug` mode
 *
 * @param functionName the name of the function being called, like `find` or `updateOne`
 * @param args arguments passed to the function
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function _logFunctionCall<CollectionType extends Collection<any>>(
    collection: CollectionType,
    debug: boolean | { color?: boolean, shell?: boolean } | Writable | ((name: string, fn: string, ...args: unknown[]) => void) | null | undefined,
    collectionName: string,
    functionName: string,
    args: IArguments
) {
    if (typeof debug === 'function') {
        debug(collectionName, functionName, ...args);
    } else if (debug instanceof Writable) {
        debug.write(`${collectionName}.${functionName}(${Array.from(args).map(arg => inspect(arg)).join(', ')})`, 'utf8');
    } else if (typeof debug === 'boolean' && debug) {
        console.info(`${collectionName}.${functionName}(${Array.from(args).map(arg => inspect(arg, undefined, DEFAULT_DEBUG_INSPECT_DEPTH, true)).join(', ')})`);
    } else if (typeof debug === 'object' && debug && !(debug instanceof Writable)) {
        console.info(`${collectionName}.${functionName}(${Array.from(args).map(arg => inspect(arg, undefined, DEFAULT_DEBUG_INSPECT_DEPTH, debug.color)).join(', ')})`);
    }
}

function checkForTimeoutOption<T extends { timeout?: unknown }>(options: T): Omit<T, 'timeout'> {
    const { timeout, ...remainingOptions } = options;
    if (timeout != null) {
        throw new OperationNotSupportedError('Cannot use timeout');
    }
    return remainingOptions;
}

function checkForMaxTimeMS<T extends { maxTimeMS?: unknown }>(options: T): Omit<T, 'maxTimeMS'> {
    const { maxTimeMS, ...remainingOptions } = options;
    if (maxTimeMS != null) {
        throw new OperationNotSupportedError('Cannot use maxTimeMS');
    }
    return remainingOptions;
}

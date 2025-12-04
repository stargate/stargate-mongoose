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

import {
    AlterTypeOptions,
    Collection,
    Collection as AstraCollection,
    CollectionDescriptor,
    CollectionOptions,
    CreateCollectionOptions,
    CreateTableDefinition,
    CreateTableOptions,
    CreateTypeDefinition,
    Db as AstraDb,
    DropCollectionOptions,
    DropTableOptions,
    DropTypeOptions,
    ListCollectionsOptions,
    ListTablesOptions,
    ListTypesOptions,
    RawDataAPIResponse,
    SomeRow,
    Table as AstraTable,
    TableDescriptor,
    TableOptions,
    TypeDescriptor
} from '@datastax/astra-db-ts';
import { AstraMongooseError } from '../astraMongooseError';
import assert from 'assert';

/**
 * Defines the base database class for interacting with Astra DB. Responsible for creating collections and tables.
 * This class abstracts the operations for both collections mode and tables mode. There is a separate TablesDb class
 * for tables and CollectionsDb class for collections.
 */
export abstract class BaseDb {
    astraDb: AstraDb;
    /**
     * Whether we're using "tables mode" or "collections mode". If tables mode, then `collection()` returns
     * a Table instance, **not** a Collection instance. Also, if tables mode, `createCollection()` throws an
     * error for Mongoose `syncIndexes()` compatibility reasons.
     */
    isTable: boolean;
    name: string;

    constructor(astraDb: AstraDb, keyspaceName: string, isTable?: boolean) {
        this.astraDb = astraDb;
        astraDb.useKeyspace(keyspaceName);
        this.isTable = !!isTable;
        this.name = keyspaceName;
    }

    /**
     * Get a collection by name.
     * @param name The name of the collection.
     */
    abstract collection<DocType extends Record<string, unknown> = Record<string, unknown>>(name: string, options: Record<string, unknown>): AstraCollection<DocType> | AstraTable<DocType>;

    /**
     * Create a new collection with the specified name and options.
     * @param name The name of the collection to be created.
     * @param options Additional options for creating the collection.
     */
    abstract createCollection<DocType extends Record<string, unknown> = Record<string, unknown>>(
        name: string,
        options?: CreateCollectionOptions<DocType>
    ): Promise<Collection<DocType>>;

    /**
     * Create a new table with the specified name and definition
     * @param name
     * @param definition
     */

    async createTable<DocType extends Record<string, unknown> = Record<string, unknown>>(
        name: string,
        definition: CreateTableDefinition,
        options?: Omit<CreateTableOptions, 'definition'>
    ) {
        const result = await this.astraDb.createTable<DocType>(name, { ...options, definition });
        return result;
    }

    /**
     * Drop a collection by name.
     * @param name The name of the collection to be dropped.
     */
    async dropCollection(name: string, options?: DropCollectionOptions) {
        const result = await this.astraDb.dropCollection(name, options);
        return result;
    }

    /**
     * Drop a table by name. This function does **not** throw an error if the table does not exist.
     * @param name
     */
    async dropTable(name: string, options?: DropTableOptions) {
        const result = await this.astraDb.dropTable(name, {
            ifExists: true,
            ...options
        });
        return result;
    }

    /**
     * List all collections in the database.
     * @param options Additional options for listing collections.
     */

    async listCollections(options: ListCollectionsOptions & { nameOnly: true }): Promise<string[]>;
    async listCollections(options?: ListCollectionsOptions & { nameOnly?: false }): Promise<CollectionDescriptor[]>;

    async listCollections(options?: ListCollectionsOptions) {
        if (options?.nameOnly) {
            const result = await this.astraDb.listCollections({ ...options, nameOnly: true });
            return result;
        }
        const result = await this.astraDb.listCollections({ ...options, nameOnly: false });
        return result;
    }

    /**
     * List all tables in the database.
     */
    async listTables(options: ListTablesOptions & { nameOnly: true }): Promise<string[]>;
    async listTables(options?: ListTablesOptions & { nameOnly?: false }): Promise<TableDescriptor[]>;

    async listTables(options?: ListTablesOptions) {
        if (options?.nameOnly) {
            const result = await this.astraDb.listTables({ ...options, nameOnly: true });
            return result;
        }
        const result = await this.astraDb.listTables({ ...options, nameOnly: false });
        return result;
    }

    /**
     * List all user-defined types (UDTs) in the database.
     * @returns An array of type descriptors.
     */
    async listTypes(options: { nameOnly: true }): Promise<string[]>;
    async listTypes(options?: { nameOnly?: false }): Promise<TypeDescriptor[]>;
    async listTypes(options?: ListTypesOptions) {
        if (options?.nameOnly) {
            const result = await this.astraDb.listTypes({ ...options, nameOnly: true });
            return result;
        }
        const result = await this.astraDb.listTypes({ ...options, nameOnly: false });
        return result;
    }

    /**
     * Create a new user-defined type (UDT) with the specified name and fields definition.
     * @param name The name of the type to create.
     * @param definition The definition of the fields for the type.
     * @returns The result of the createType command.
     */
    async createType(name: string, definition: CreateTypeDefinition) {
        const result = await this.astraDb.createType(name, { definition });
        return result;
    }

    /**
     * Drop (delete) a user-defined type (UDT) by name.
     * @param name The name of the type to drop.
     * @returns The result of the dropType command.
     */
    async dropType(name: string, options?: DropTypeOptions) {
        const result = await this.astraDb.dropType(name, options);
        return result;
    }

    /**
     * Alter a user-defined type (UDT) by renaming or adding fields.
     * @param name The name of the type to alter.
     * @param update The alterations to be made: renaming or adding fields.
     * @returns The result of the alterType command.
     */
    async alterType<UDTSchema extends SomeRow = SomeRow>(name: string, update: AlterTypeOptions<UDTSchema>) {
        const result = await this.astraDb.alterType(name, update);
        return result;
    }

    /**
     * Synchronizes the set of user-defined types (UDTs) in the database. It makes existing types in the database
     * match the list provided by `types`. New types that are missing are created, and types that exist in the database
     * but are not in the input list are dropped. If a type is present in both, we add all the new type's fields to the existing type.
     *
     * @param types An array of objects each specifying the name and CreateTypeDefinition for a UDT to synchronize.
     * @returns An object describing which types were created, updated, or dropped.
     * @throws {AstraMongooseError} If an error occurs during type synchronization, with partial progress information in the error.
     */
    async syncTypes(types: { name: string, definition: CreateTypeDefinition }[]) {
        const existingTypes = await this.listTypes({ nameOnly: false });
        const existingTypeNames = existingTypes.map(type => type.name);
        const inputTypeNames = types.map(type => type.name);

        const toCreate = types
            .filter(type => !existingTypeNames.includes(type.name))
            .map(type => type.name);

        const toUpdate = types
            .filter(type => existingTypeNames.includes(type.name))
            .map(type => type.name);

        const toDrop = existingTypeNames.filter(typeName => !inputTypeNames.includes(typeName));

        // We'll perform these in series and track progress
        const created: string[] = [];
        const updated: string[] = [];
        const dropped: string[] = [];

        try {
            for (const type of types) {
                if (toCreate.includes(type.name)) {
                    await this.createType(type.name, type.definition);
                    created.push(type.name);
                }
            }
            for (const typeName of toDrop) {
                await this.dropType(typeName);
                dropped.push(typeName);
            }
            for (const type of types) {
                if (toUpdate.includes(type.name)) {
                    const existingType = existingTypes.find(t => t.name === type.name);
                    // This cannot happen, but add a guard for TypeScript
                    assert.ok(existingType);
                    const existingFields = existingType.definition!.fields;
                    const fieldsToAdd: CreateTypeDefinition = { fields: {} };
                    for (const [field, newField] of Object.entries(type.definition.fields)) {
                        if (existingFields?.[field] != null) {
                            const existingFieldType = existingFields[field];
                            // Compare type as string since Astra DB types may be represented in string form
                            const newFieldType = typeof newField === 'string' ? newField : newField.type;
                            if (existingFieldType.type !== newFieldType) {
                                throw new AstraMongooseError(
                                    `Field '${field}' in type '${type.name}' exists with different type. (current: ${existingFieldType.type}, new: ${newFieldType})`
                                );
                            }
                        } else {
                            fieldsToAdd.fields[field] = newField;
                        }
                    }

                    if (Object.keys(fieldsToAdd.fields).length > 0) {
                        await this.alterType(type.name, { operation: { add: fieldsToAdd } });
                        updated.push(type.name);
                    }
                }
            }
        } catch (err) {
            throw new AstraMongooseError(`Error in syncTypes: ${err instanceof Error ? err.message : err}`, { created, updated, dropped });
        }

        return { created, updated, dropped };
    }

    /**
     * Execute a command against the database.
     * @param command The command to be executed.
     */
    async command(command: Record<string, unknown>): Promise<RawDataAPIResponse> {
        const result = await this.astraDb.command(command);
        return result;
    }
}

/**
 * Db instance that creates and manages collections.
 * @extends BaseDb
 */
export class CollectionsDb extends BaseDb {
    /**
     * Creates an instance of CollectionsDb. Do not instantiate this class directly.
     * @param astraDb The AstraDb instance to interact with the database.
     * @param keyspaceName The name of the keyspace to use.
     */
    constructor(astraDb: AstraDb, keyspaceName: string) {
        super(astraDb, keyspaceName, false);
    }

    /**
     * Get a collection by name.
     * @param name The name of the collection.
     */
    collection<DocType extends Record<string, unknown> = Record<string, unknown>>(name: string, options: CollectionOptions) {
        return this.astraDb.collection<DocType>(name, options);
    }

    /**
     * Send a CreateCollection command to Data API.
     */
    async createCollection<DocType extends Record<string, unknown> = Record<string, unknown>>(name: string, options?: CreateCollectionOptions<DocType>) {
        const result = await this.astraDb.createCollection<DocType>(name, options);
        return result;
    }
}

/**
 * Db instance that creates and manages tables.
 * @extends BaseDb
 */
export class TablesDb extends BaseDb {
    /**
     * Creates an instance of TablesDb. Do not instantiate this class directly.
     * @param astraDb The AstraDb instance to interact with the database.
     * @param keyspaceName The name of the keyspace to use.
     */
    constructor(astraDb: AstraDb, keyspaceName: string) {
        super(astraDb, keyspaceName, true);
    }

    /**
     * Get a table by name. This method is called `collection()` for compatibility with Mongoose, which calls
     * this method for getting a Mongoose Collection instance, which may map to a table in Astra DB when using tables mode.
     * @param name The name of the table.
     */
    collection<DocType extends Record<string, unknown> = Record<string, unknown>>(name: string, options: TableOptions) {
        return this.astraDb.table<DocType>(name, options);
    }

    /**
     * Throws an error, astra-mongoose does not support creating collections in tables mode.
     */
    async createCollection<DocType extends Record<string, unknown> = Record<string, unknown>>(
        name: string,
        options?: CreateCollectionOptions<DocType>
    ): Promise<Collection<DocType>> {
        throw new AstraMongooseError('Cannot createCollection in tables mode; use createTable instead', { name, options });
    }
}

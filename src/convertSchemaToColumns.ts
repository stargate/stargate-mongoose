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

import { CreateTableColumnDefinitions } from '@datastax/astra-db-ts';
import { Schema, SchemaType } from 'mongoose';
import { AstraMongooseError } from './astraMongooseError';
import getUDTNameFromSchemaType from './udt/getUDTNameFromSchemaType';

type AllowedDataAPITypes = 'text' | 'double' | 'timestamp' | 'boolean' | 'decimal' | 'varint' | 'blob' | 'uuid' | 'int';

/**
 * Given a Mongoose schema, create an equivalent Data API table definition for use with `createTable()`
 */
export default function convertSchemaToColumns(schema: Schema, udtName?: string): CreateTableColumnDefinitions {
    const versionKey = schema.options.versionKey;
    const columns: CreateTableColumnDefinitions = {};
    if (schema.options._id !== false) {
        columns._id = { type: 'text' };
    }
    if (typeof versionKey === 'string') {
        columns[versionKey] = { type: 'int' };
    }
    const schemaTypesForNestedPath: Record<string, SchemaType[]> = {};
    udtName = udtName ?? schema.options?.udtName;
    for (const path of Object.keys(schema.paths)) {
        const schemaType = schema.paths[path];

        const type = mongooseTypeToDataAPIType(schemaType.instance);
        const isNestedOrMap = path.indexOf('.') !== -1;
        if (isNestedOrMap) {
            const split = schemaType.path.split('.');
            if (split.length > 2) {
                throw new AstraMongooseError(`Cannot convert schema to Data API table definition: schemas with paths that are more than 2 levels deep are not supported (found ${path})`, {
                    path,
                    type,
                    schema
                });
            }

            // Nested paths aren't listed in `schema.paths`, so store their subpaths to process them later on a
            // per-nested-path basis.
            if (schema.pathType(split[0]) === 'nested') {
                const nestedPath = split[0];
                if (schemaTypesForNestedPath[nestedPath] == null) {
                    schemaTypesForNestedPath[nestedPath] = [];
                }
                schemaTypesForNestedPath[nestedPath].push(schemaType);
            }
        } else if (type) {
            columns[path] = { type };
        } else if (schemaType.instance === 'Array' || schemaType.instance === 'Vectorize') {
            if (udtName != null) {
                throw new AstraMongooseError(
                    'Cannot convert schema to Data API table definition: cannot store an array in a UDT',
                    { path, type }
                );
            }
            if (schemaType.schema) {
                // If `schema` is set, this is a DocumentArray
                const schemaTypeUDTName = getUDTNameFromSchemaType(schemaType);

                if (schemaTypeUDTName) {
                    columns[path] = {
                        type: 'list',
                        valueType: { type: 'userDefined', udtName: schemaTypeUDTName }
                    };
                } else {
                    throw new AstraMongooseError(`Cannot convert schema to Data API table definition: DocumentArray "${path}" is not supported`, {
                        path,
                        type,
                        schema
                    });
                }
            } else {
                // Arrays always have an embedded schema type
                const embeddedSchemaType = schemaType.getEmbeddedSchemaType() as SchemaType;
                if (schemaType.options.dimension != null) {
                    // If dimension, assume we're creating a vector column
                    if (embeddedSchemaType.instance !== 'Number') {
                        throw new AstraMongooseError(`Cannot convert schema to Data API table definition: vector column at "${path}" must be an array of numbers`, {
                            path,
                            type,
                            schema
                        });
                    }
                    columns[path] = { type: 'vector', dimension: schemaType.options.dimension };
                    if (schemaType.instance === 'Vectorize' && schemaType.options.service != null) {
                        columns[path].service = schemaType.options.service;
                    }
                } else {
                    const valueType = mongooseTypeToDataAPIType(embeddedSchemaType.instance);
                    if (valueType == null) {
                        throw new AstraMongooseError(`Cannot convert schema to Data API table definition: unsupported array type at path "${path}"`, {
                            path,
                            valueType,
                            type,
                            schema
                        });
                    }
                    columns[path] = { type: 'list', valueType };
                }
            }
        } else if (schemaType.instance === 'Embedded') {
            if (udtName != null) {
                throw new AstraMongooseError('Cannot convert schema to Data API table definition: cannot store a subdocument in a UDT', {
                    path,
                    type
                });
            }
            const schemaTypeUDTName = getUDTNameFromSchemaType(schemaType);
            if (schemaTypeUDTName) {
                columns[path] = { type: 'userDefined', udtName: schemaTypeUDTName };
            } else {
                columns[path] = {
                    type: 'map',
                    keyType: 'text',
                    valueType: getValueTypeFromNestedSchemaTypes(path, Object.values(schemaType.schema!.paths), true)
                };
            }
        } else if (schemaType.instance === 'Map') {
            if (udtName != null) {
                throw new AstraMongooseError('Cannot convert schema to Data API table definition: cannot store a map in a UDT', {
                    path,
                    type
                });
            }
            const embeddedSchemaType = schemaType.getEmbeddedSchemaType() as SchemaType;
            if (!isSchemaTypeRequired(embeddedSchemaType)) {
                throw new AstraMongooseError(
                    `Cannot convert schema to Data API table definition: values for map path "${path}" must be required`,
                    { path, type }
                );
            }
            const valueType = mongooseTypeToDataAPIType(embeddedSchemaType!.instance);
            const schemaTypeUDTName = getUDTNameFromSchemaType(schemaType);
            if (valueType != null) {
                columns[path] = { type: 'map', keyType: 'text', valueType };
            } else if (schemaTypeUDTName) {
                // Special handling for maps of UDTs
                columns[path] = {
                    type: 'map',
                    keyType: 'text',
                    valueType: {
                        type: 'userDefined',
                        udtName: schemaTypeUDTName
                    }
                };
            } else {
                throw new AstraMongooseError(
                    `Cannot convert schema to Data API table definition: unsupported type at path "${schemaType.path}"`,
                    { path, type }
                );
            }
        } else if (schemaType.instance === 'Set') {
            if (udtName != null) {
                throw new AstraMongooseError('Cannot convert schema to Data API table definition: cannot store a set in a UDT', {
                    path,
                    type
                });
            }
            const embeddedSchemaType = schemaType.getEmbeddedSchemaType() as SchemaType;
            if (!embeddedSchemaType) {
                throw new AstraMongooseError(
                    `Cannot convert schema to Data API table definition: set path "${path}" must have an 'of' option`,
                    { path, type }
                );
            }
            if (!isSchemaTypeRequired(embeddedSchemaType)) {
                throw new AstraMongooseError(
                    `Cannot convert schema to Data API table definition: values for set path "${path}" must be required`,
                    { path, type }
                );
            }
            const valueType = mongooseTypeToDataAPIType(embeddedSchemaType.instance);
            const schemaTypeUDTName = getUDTNameFromSchemaType(schemaType);
            if (valueType != null) {
                columns[path] = { type: 'set', valueType };
            } else if (schemaTypeUDTName) {
                // Special handling for sets of UDTs
                columns[path] = {
                    type: 'set',
                    valueType: {
                        type: 'userDefined',
                        udtName: schemaTypeUDTName
                    }
                };
            } else {
                throw new AstraMongooseError(
                    `Cannot convert schema to Data API table definition: unsupported type at path "${schemaType.path}"`,
                    { path, type }
                );
            }
        } else {
            throw new AstraMongooseError(`Cannot convert schema to Data API table definition: unsupported type at path "${path}"`, {
                path,
                schema
            });
        }
    }

    for (const nestedPath of Object.keys(schemaTypesForNestedPath)) {
        columns[nestedPath] = {
            type: 'map',
            keyType: 'text',
            valueType: getValueTypeFromNestedSchemaTypes(nestedPath, schemaTypesForNestedPath[nestedPath], false)
        };
    }

    return columns;
}

function getValueTypeFromNestedSchemaTypes(nestedPath: string, schemaTypes: SchemaType[], isSubdocument: boolean): AllowedDataAPITypes {
    const dataAPITypes: Set<AllowedDataAPITypes> = new Set();
    for (const schemaType of schemaTypes) {
        const hasNested = schemaType.path.indexOf('.') !== -1;
        if (hasNested && isSubdocument) {
            throw new AstraMongooseError(`Cannot convert schema to Data API table definition: unsupported nested path underneath subdocument at path "${nestedPath}.${schemaType.path}"`, {
                nestedPath
            });
        }
        const type = mongooseTypeToDataAPIType(schemaType.instance);
        const fullPath = isSubdocument ? `${nestedPath}.${schemaType.path}` : schemaType.path;
        if (type == null) {
            throw new AstraMongooseError(
                `Cannot convert schema to Data API table definition: unsupported type at path "${fullPath}"`,
                { nestedPath, type }
            );
        }
        if (!isSchemaTypeRequired(schemaType)) {
            throw new AstraMongooseError(
                `Cannot convert schema to Data API table definition: nested path "${fullPath}" must be required`,
                { nestedPath, type }
            );
        }
        dataAPITypes.add(type);
    }
    if (dataAPITypes.has('blob')) {
        throw new AstraMongooseError(`Cannot convert schema to Data API table definition: nested Buffer at "${nestedPath}" is not supported`, {
            nestedPath
        });
    }
    // If all keys have same data type, then we can use that data type
    if (dataAPITypes.size === 1) {
        return Array.from(dataAPITypes)[0];
    } else {
        throw new AstraMongooseError(`Cannot convert schema to Data API table definition: nested paths with different data types "${nestedPath}" are not supported`, {
            nestedPath
        });
    }
}

function mongooseTypeToDataAPIType(type: string): AllowedDataAPITypes | null {
    if (type === 'String') {
        return 'text';
    } else if (type === 'Number') {
        return 'double';
    } else if (type === 'Date') {
        return 'timestamp';
    } else if (type === 'Boolean') {
        return 'boolean';
    } else if (type === 'Decimal128') {
        return 'decimal';
    } else if (type === 'BigInt') {
        return 'varint';
    } else if (type === 'Buffer') {
        return 'blob';
    } else if (type === 'ObjectId') {
        return 'text';
    } else if (type === 'UUID') {
        return 'uuid';
    } else if (type === 'Int32') {
        return 'int';
    } else if (type === 'Double') {
        return 'double';
    }
    return null;
}

function isSchemaTypeRequired(schemaType: SchemaType): boolean {
    const requiredOption = schemaType.options.required;
    if (typeof requiredOption === 'boolean') {
        return requiredOption;
    }
    if (typeof requiredOption === 'function') {
        return false;
    }
    if (Array.isArray(requiredOption)) {
        return requiredOption[0];
    }
    return false;
}

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

import { CreateTableDefinition } from '@datastax/astra-db-ts';
import { Schema, SchemaType } from 'mongoose';
import { AstraMongooseError } from './astraMongooseError';

type AllowedDataAPITypes = 'text' | 'double' | 'timestamp' | 'boolean' | 'decimal' | 'varint' | 'blob' | 'uuid' | 'int';

/**
 * Given a Mongoose schema, create an equivalent Data API table definition for use with `createTable()`
 */
export default function tableDefinitionFromSchema(schema: Schema): CreateTableDefinition {
    const tableDefinition: CreateTableDefinition = {
        primaryKey: '_id',
        columns: {
            _id: { type: 'text' },
            __v: { type: 'int' }
        }
    };
    const schemaTypesForNestedPath: Record<string, SchemaType[]> = {};
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
            const nestedPath = split[0];
            if (schemaTypesForNestedPath[nestedPath] == null) {
                schemaTypesForNestedPath[nestedPath] = [];
            }
            schemaTypesForNestedPath[nestedPath].push(schemaType);
        } else if (type) {
            tableDefinition.columns[path] = { type };
        } else if (schemaType.instance === 'Array' || schemaType.instance === 'Vectorize') {
            if (schemaType.schema) {
                throw new AstraMongooseError(`Cannot convert schema to Data API table definition: DocumentArray "${path}" is not supported`, {
                    path,
                    type,
                    schema
                });
            }
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
                tableDefinition.columns[path] = { type: 'vector', dimension: schemaType.options.dimension };
                if (schemaType.instance === 'Vectorize' && schemaType.options.service != null) {
                    tableDefinition.columns[path].service = schemaType.options.service;
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
                tableDefinition.columns[path] = { type: 'list', valueType };
            }
        } else if (schemaType.instance === 'Embedded') {
            const dataAPITypes: Set<AllowedDataAPITypes> = new Set();
            for (const subpath of Object.keys(schemaType.schema.paths)) {
                const isNested = subpath.indexOf('.') !== -1;
                if (isNested) {
                    throw new AstraMongooseError(`Cannot convert schema to Data API table definition: unsupported nested path underneath subdocument at path "${path}.${subpath}"`, {
                        path,
                        subpath,
                        schema
                    });
                }
                const type = mongooseTypeToDataAPIType(schemaType.schema.paths[subpath].instance);
                if (type == null) {
                    throw new AstraMongooseError(`Cannot convert schema to Data API table definition: unsupported type in subdocument at path "${path}.${subpath}"`, {
                        path,
                        subpath,
                        type,
                        schema
                    });
                }
                dataAPITypes.add(type);
            }
            // If all keys have same data type, then can just make map of that data type
            if (dataAPITypes.size === 1) {
                tableDefinition.columns[path] = { type: 'map', keyType: 'text', valueType: [...dataAPITypes][0] };
            } else {
                if (dataAPITypes.has('blob')) {
                    throw new AstraMongooseError(`Cannot convert schema to Data API table definition: subdocuments with Buffer at "${path}" are not supported`, {
                        path,
                        type,
                        schema
                    });
                }
                tableDefinition.columns[path] = { type: 'map', keyType: 'text', valueType: 'text' };
            }
        } else if (schemaType.instance === 'Map') {
            // Maps are handled by the isNestedOrMap code path
            continue;
        } else {
            throw new AstraMongooseError(`Cannot convert schema to Data API table definition: unsupported type at path "${path}"`, {
                path,
                schema
            });
        }
    }

    // Also handles maps
    for (const nestedPath of Object.keys(schemaTypesForNestedPath)) {
        const dataAPITypes: Set<AllowedDataAPITypes> = new Set();
        for (const schemaType of schemaTypesForNestedPath[nestedPath]) {
            const type = mongooseTypeToDataAPIType(schemaType.instance);
            if (type == null) {
                throw new AstraMongooseError(`Cannot convert schema to Data API table definition: unsupported type at path "${schemaType.path}"`, {
                    nestedPath,
                    type,
                    schema
                });
            }
            dataAPITypes.add(type);
        }
        if (dataAPITypes.has('blob')) {
            throw new AstraMongooseError(`Cannot convert schema to Data API table definition: nested paths with Buffer at "${nestedPath}" are not supported`, {
                nestedPath,
                schema
            });
        }
        // If all keys have same data type, then can just make map of that data type
        if (dataAPITypes.size === 1) {
            tableDefinition.columns[nestedPath] = { type: 'map', keyType: 'text', valueType: [...dataAPITypes][0] };
        } else {
            tableDefinition.columns[nestedPath] = { type: 'map', keyType: 'text', valueType: 'text' };
        }
    }

    return tableDefinition;
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

"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = tableDefinitionFromSchema;
function tableDefinitionFromSchema(schema) {
    const tableDefinition = {
        primaryKey: '_id',
        columns: {
            _id: { type: 'text' },
            __v: { type: 'int' }
        }
    };
    const schemaTypesForNestedPath = {};
    for (const path of Object.keys(schema.paths)) {
        const schemaType = schema.paths[path];
        const type = mongooseTypeToDataAPIType(schemaType.instance);
        const isNestedOrMap = path.indexOf('.') !== -1;
        if (isNestedOrMap) {
            const split = schemaType.path.split('.');
            if (split.length > 2) {
                throw new Error(`Cannot convert schema to Data API table definition: schemas with 3-level deep nested path ${path} are not supported`);
            }
            const nestedPath = split[0];
            if (schemaTypesForNestedPath[nestedPath] == null) {
                schemaTypesForNestedPath[nestedPath] = [];
            }
            schemaTypesForNestedPath[nestedPath].push(schemaType);
        }
        else if (type) {
            tableDefinition.columns[path] = { type };
        }
        else if (schemaType.instance === 'Array') {
            if (schemaType.schema) {
                throw new Error(`Cannot convert schema to Data API table definition: DocumentArray ${path} is not supported`);
            }
            const valueType = mongooseTypeToDataAPIType(schemaType.getEmbeddedSchemaType()?.instance ?? '');
            if (valueType == null) {
                throw new Error(`Cannot convert schema to Data API table definition: unsupported array type at path ${path}`);
            }
            tableDefinition.columns[path] = { type: 'list', valueType };
        }
        else if (schemaType.instance === 'Embedded') {
            const dataAPITypes = new Set();
            for (const path of Object.keys(schemaType.schema.paths)) {
                const isNested = path.indexOf('.') !== -1;
                if (isNested) {
                    throw new Error(`Cannot convert schema to Data API table definition: unsupported nested path underneath subdocument at path ${path}`);
                }
                const type = mongooseTypeToDataAPIType(schemaType.schema.paths[path].instance);
                if (type == null) {
                    throw new Error(`Cannot convert schema to Data API table definition: unsupported type in subdocument at path ${path}`);
                }
                dataAPITypes.add(type);
            }
            // If all keys have same data type, then can just make map of that data type
            if (dataAPITypes.size === 1) {
                tableDefinition.columns[path] = { type: 'map', keyType: 'text', valueType: [...dataAPITypes][0] };
            }
            else {
                if (dataAPITypes.has('blob')) {
                    throw new Error(`Cannot convert schema to Data API table definition: subdocuments with Buffer at ${path} are not supported`);
                }
                tableDefinition.columns[path] = { type: 'map', keyType: 'text', valueType: 'text' };
            }
        }
        else if (schemaType.instance === 'Map') {
            // Maps are handled by the isNestedOrMap code path
            continue;
        }
        else {
            throw new Error(`Unknown type at path ${path}`);
        }
    }
    // Also handles maps
    for (const nestedPath of Object.keys(schemaTypesForNestedPath)) {
        const dataAPITypes = new Set();
        for (const schemaType of schemaTypesForNestedPath[nestedPath]) {
            const type = mongooseTypeToDataAPIType(schemaType.instance);
            if (type == null) {
                throw new Error(`Cannot convert schema to Data API table definition: unsupported type at path ${schemaType.path}`);
            }
            dataAPITypes.add(type);
        }
        // If all keys have same data type, then can just make map of that data type
        if (dataAPITypes.size === 1) {
            tableDefinition.columns[nestedPath] = { type: 'map', keyType: 'text', valueType: [...dataAPITypes][0] };
        }
        else {
            if (dataAPITypes.has('blob')) {
                throw new Error(`Cannot convert schema to Data API table definition: nested paths with Buffer at ${nestedPath} are not supported`);
            }
            tableDefinition.columns[nestedPath] = { type: 'map', keyType: 'text', valueType: 'text' };
        }
    }
    return tableDefinition;
}
function mongooseTypeToDataAPIType(type) {
    if (type === 'String') {
        return 'text';
    }
    else if (type === 'Number') {
        return 'double';
    }
    else if (type === 'Date') {
        return 'timestamp';
    }
    else if (type === 'Boolean') {
        return 'boolean';
    }
    else if (type === 'Decimal128') {
        return 'decimal';
    }
    else if (type === 'BigInt') {
        return 'varint';
    }
    else if (type === 'Buffer') {
        return 'blob';
    }
    else if (type === 'ObjectId') {
        return 'text';
    }
    else if (type === 'UUID') {
        return 'uuid';
    }
    return null;
}
//# sourceMappingURL=tableDefinitionFromSchema.js.map
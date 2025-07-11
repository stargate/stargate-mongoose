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

import { Schema } from 'mongoose';
import assert from 'assert';
import convertSchemaToColumns from '../src/convertSchemaToColumns';

describe('convertSchemaToColumns', () => {
    it('generates table definition from schema with all data types', () => {
        const testSchema = new Schema({
            name: String,
            age: Number,
            createdAt: Date,
            enabled: Boolean,
            decimal: 'Decimal128',
            counter: BigInt,
            binData: Buffer,
            testId: 'UUID',
            myint: 'Int32',
            mydouble: 'Double'
        });

        const result = convertSchemaToColumns(testSchema);

        assert.deepStrictEqual(result, {
            '_id': { type: 'text' },
            '__v': { type: 'int' },
            'name': { type: 'text' },
            'age': { type: 'double' },
            'createdAt': { type: 'timestamp' },
            'enabled': { type: 'boolean' },
            'decimal': { type: 'decimal' },
            'counter': { type: 'varint' },
            'binData': { type: 'blob' },
            'testId': { type: 'uuid' },
            'myint': { type: 'int' },
            'mydouble': { type: 'double' }
        });
    });

    it('generates table definition from schema with array of primitives', () => {
        const testSchema = new Schema({
            tags: [String]
        });

        const result = convertSchemaToColumns(testSchema);

        assert.deepStrictEqual(result, {
            '_id': { type: 'text' },
            '__v': { type: 'int' },
            'tags': { type: 'list', valueType: 'text' }
        });
    });

    it('handles subdocuments with paths that are all the same type', () => {
        const testSchema = new Schema({
            subdoc: new Schema({
                num1: Number,
                num2: Number
            }, { _id: false })
        });

        const result = convertSchemaToColumns(testSchema);

        assert.deepStrictEqual(result, {
            '_id': { type: 'text' },
            '__v': { type: 'int' },
            'subdoc': { type: 'map', keyType: 'text', valueType: 'double' }
        });
    });

    it('throws on subdocument with multiple different path types', () => {
        const testSchema = new Schema({
            subdoc: new Schema({
                name: String,
                age: Number
            }, { _id: false })
        });

        assert.throws(() => {
            convertSchemaToColumns(testSchema);
        }, {
            message: 'Cannot convert schema to Data API table definition: nested paths with different data types "subdoc" are not supported'
        });
    });

    it('handles nested paths with paths that are all the same type', () => {
        const testSchema = new Schema({
            numbers: {
                favorite: Number,
                age: Number
            }
        });

        const result = convertSchemaToColumns(testSchema);

        assert.deepStrictEqual(result, {
            '_id': { type: 'text' },
            '__v': { type: 'int' },
            'numbers': { type: 'map', keyType: 'text', valueType: 'double' }
        });
    });

    it('throws on nested paths with multiple different path types', () => {
        const testSchema = new Schema({
            user: {
                name: String,
                age: Number
            }
        });

        assert.throws(() => {
            convertSchemaToColumns(testSchema);
        }, {
            message: 'Cannot convert schema to Data API table definition: nested paths with different data types "user" are not supported'
        });
    });

    it('handles Mongoose maps', () => {
        const testSchema = new Schema({
            myMap: {
                type: Map,
                of: 'Decimal128'
            }
        });

        const result = convertSchemaToColumns(testSchema);

        assert.deepStrictEqual(result, {
            '_id': { type: 'text' },
            '__v': { type: 'int' },
            'myMap': { type: 'map', keyType: 'text', valueType: 'decimal' }
        });
    });

    it('creates vector column if array of numbers has dimension property', () => {
        const testSchema = new Schema({
            arr: { type: [Number], dimension: 2 }
        });

        const result = convertSchemaToColumns(testSchema);

        assert.deepStrictEqual(result, {
            '_id': { type: 'text' },
            '__v': { type: 'int' },
            'arr': { type: 'vector', dimension: 2 }
        });
    });

    it('throws on 3 level deep nested path', () => {
        const testSchema = new Schema({
            foo: {
                bar: {
                    baz: String
                }
            }
        });

        assert.throws(() => {
            convertSchemaToColumns(testSchema);
        }, {
            message: 'Cannot convert schema to Data API table definition: schemas with paths that are more than 2 levels deep are not supported (found foo.bar.baz)'
        });
    });

    it('throws on document array', () => {
        const testSchema = new Schema({
            documents: [new Schema({
                name: String
            })]
        });

        assert.throws(() => {
            convertSchemaToColumns(testSchema);
        }, {
            message: 'Cannot convert schema to Data API table definition: DocumentArray "documents" is not supported'
        });
    });

    it('throws on array of custom schematype', () => {
        const testSchema = new Schema({
            arr: ['Mixed']
        });

        assert.throws(() => {
            convertSchemaToColumns(testSchema);
        }, {
            message: 'Cannot convert schema to Data API table definition: unsupported array type at path "arr"'
        });
    });

    it('throws on map of custom schematype', () => {
        const testSchema = new Schema({
            myMap: { type: 'Map', of: 'Mixed' }
        });

        assert.throws(() => {
            convertSchemaToColumns(testSchema);
        }, {
            message: 'Cannot convert schema to Data API table definition: unsupported type at path "myMap"'
        });
    });

    it('throws on nested paths in subdocuments', () => {
        const testSchema = new Schema({
            subdoc: new Schema({
                nested: {
                    field: String
                }
            }, { _id: false })
        });

        assert.throws(() => {
            convertSchemaToColumns(testSchema);
        }, {
            message: 'Cannot convert schema to Data API table definition: unsupported nested path underneath subdocument at path "subdoc.nested.field"'
        });
    });

    it('throws on subdoc with mixed subpath', () => {
        const testSchema = new Schema({
            subdoc: new Schema({
                test: 'Mixed'
            })
        });

        assert.throws(() => {
            convertSchemaToColumns(testSchema);
        }, {
            message: 'Cannot convert schema to Data API table definition: unsupported type at path "subdoc.test"'
        });
    });

    it('throws on subdoc with buffer', () => {
        const testSchema = new Schema({
            subdoc: new Schema({
                test: Buffer
            })
        });

        assert.throws(() => {
            convertSchemaToColumns(testSchema);
        }, {
            message: 'Cannot convert schema to Data API table definition: nested Buffer at "subdoc" is not supported'
        });
    });

    it('throws on Mixed path', () => {
        const testSchema = new Schema({
            test: 'Mixed'
        });

        assert.throws(() => {
            convertSchemaToColumns(testSchema);
        }, {
            message: 'Cannot convert schema to Data API table definition: unsupported type at path "test"'
        });
    });

    it('throws on nested Mixed path', () => {
        const testSchema = new Schema({
            nested: {
                test: 'Mixed'
            }
        });

        assert.throws(() => {
            convertSchemaToColumns(testSchema);
        }, {
            message: 'Cannot convert schema to Data API table definition: unsupported type at path "nested.test"'
        });
    });

    it('throws on nested Buffer path', () => {
        const testSchema = new Schema({
            nested: {
                test: 'Buffer'
            }
        });

        assert.throws(() => {
            convertSchemaToColumns(testSchema);
        }, {
            message: 'Cannot convert schema to Data API table definition: nested Buffer at "nested" is not supported'
        });
    });

    it('throws on non-number array with dimension option', () => {
        const testSchema = new Schema({
            arr: { type: [String], dimension: 2 }
        });

        assert.throws(() => {
            convertSchemaToColumns(testSchema);
        }, {
            message: 'Cannot convert schema to Data API table definition: vector column at "arr" must be an array of numbers'
        });
    });

    it('handles UDT', () => {
        const subschema = new Schema({
            line1: String,
            line2: String,
            city: String,
            state: String,
            zip: String,
            country: String
        }, { udtName: 'Address' });

        const udtType = convertSchemaToColumns(subschema);
        assert.deepStrictEqual(udtType, {
            _id: { type: 'text' },
            __v: { type: 'int' },
            line1: { type: 'text' },
            line2: { type: 'text' },
            city: { type: 'text' },
            state: { type: 'text' },
            zip: { type: 'text' },
            country: { type: 'text' }
        });

        const testSchema = new Schema({
            address: { type: subschema },
            savedAddresses: [subschema],
            addressesByName: {
                type: Map,
                of: subschema
            }
        });
        assert.deepStrictEqual(convertSchemaToColumns(testSchema), {
            _id: { type: 'text' },
            __v: { type: 'int' },
            address: { type: 'userDefined', udtName: 'Address' },
            savedAddresses: { type: 'list', valueType: { type: 'userDefined', udtName: 'Address' } },
            addressesByName: { type: 'map', keyType: 'text', valueType: { type: 'userDefined', udtName: 'Address' } }
        });
    });

    it('handles UDT in schematype options', () => {
        const subschema = new Schema({
            line1: String,
            line2: String,
            city: String,
            state: String,
            zip: String,
            country: String
        });

        const testSchema = new Schema({
            address: { type: subschema, udtName: 'Address' },
            savedAddresses: [{ type: subschema, udtName: 'Address' }],
            addressesByName: {
                type: Map,
                of: {
                    type: subschema,
                    udtName: 'Address'
                }
            }
        });
        assert.deepStrictEqual(convertSchemaToColumns(testSchema), {
            _id: { type: 'text' },
            __v: { type: 'int' },
            address: { type: 'userDefined', udtName: 'Address' },
            savedAddresses: { type: 'list', valueType: { type: 'userDefined', udtName: 'Address' } },
            addressesByName: { type: 'map', keyType: 'text', valueType: { type: 'userDefined', udtName: 'Address' } }
        });
    });

    it('creates vector column with service if array of numbers has dimension and service property (Vectorize)', () => {
        const testSchema = new Schema({
            arr: { type: 'Vectorize', dimension: 3, service: { provider: 'openai' } }
        });

        const result = convertSchemaToColumns(testSchema);

        assert.deepStrictEqual(result, {
            '_id': { type: 'text' },
            '__v': { type: 'int' },
            'arr': { type: 'vector', dimension: 3, service: { provider: 'openai' } }
        });
    });
});

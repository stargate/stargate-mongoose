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
import tableDefinitionFromSchema from '../src/tableDefinitionFromSchema';

describe('tableDefinitionFromSchema', () => {
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

        const result = tableDefinitionFromSchema(testSchema);

        assert.deepStrictEqual(result, {
            primaryKey: '_id',
            columns: {
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
            }
        });
    });

    it('generates table definition from schema with array of primitives', () => {
        const testSchema = new Schema({
            tags: [String]
        });

        const result = tableDefinitionFromSchema(testSchema);

        assert.deepStrictEqual(result, {
            primaryKey: '_id',
            columns: {
                '_id': { type: 'text' },
                '__v': { type: 'int' },
                'tags': { type: 'list', valueType: 'text' }
            }
        });
    });

    it('handles subdocuments with paths that are all the same type', () => {
        const testSchema = new Schema({
            subdoc: new Schema({
                num1: Number,
                num2: Number
            }, { _id: false })
        });

        const result = tableDefinitionFromSchema(testSchema);

        assert.deepStrictEqual(result, {
            primaryKey: '_id',
            columns: {
                '_id': { type: 'text' },
                '__v': { type: 'int' },
                'subdoc': { type: 'map', keyType: 'text', valueType: 'double' }
            }
        });
    });

    it('stores subdocument with multiple different path types as map of text', () => {
        const testSchema = new Schema({
            subdoc: new Schema({
                name: String,
                age: Number
            }, { _id: false })
        });

        const result = tableDefinitionFromSchema(testSchema);

        assert.deepStrictEqual(result, {
            primaryKey: '_id',
            columns: {
                '_id': { type: 'text' },
                '__v': { type: 'int' },
                'subdoc': { type: 'map', keyType: 'text', valueType: 'text' }
            }
        });
    });

    it('handles nested paths with paths that are all the same type', () => {
        const testSchema = new Schema({
            numbers: {
                favorite: Number,
                age: Number
            }
        });

        const result = tableDefinitionFromSchema(testSchema);

        assert.deepStrictEqual(result, {
            primaryKey: '_id',
            columns: {
                '_id': { type: 'text' },
                '__v': { type: 'int' },
                'numbers': { type: 'map', keyType: 'text', valueType: 'double' }
            }
        });
    });

    it('stores nested paths with multiple different path types as map of text', () => {
        const testSchema = new Schema({
            user: {
                name: String,
                age: Number
            }
        });

        const result = tableDefinitionFromSchema(testSchema);

        assert.deepStrictEqual(result, {
            primaryKey: '_id',
            columns: {
                '_id': { type: 'text' },
                '__v': { type: 'int' },
                'user': { type: 'map', keyType: 'text', valueType: 'text' }
            }
        });
    });

    it('handles Mongoose maps', () => {
        const testSchema = new Schema({
            myMap: {
                type: Map,
                of: 'Decimal128'
            }
        });

        const result = tableDefinitionFromSchema(testSchema);

        assert.deepStrictEqual(result, {
            primaryKey: '_id',
            columns: {
                '_id': { type: 'text' },
                '__v': { type: 'int' },
                'myMap': { type: 'map', keyType: 'text', valueType: 'decimal' }
            }
        });
    });

    it('creates vector column if array of numbers has dimension property', () => {
        const testSchema = new Schema({
            arr: { type: [Number], dimension: 2 }
        });

        const result = tableDefinitionFromSchema(testSchema);

        assert.deepStrictEqual(result, {
            primaryKey: '_id',
            columns: {
                '_id': { type: 'text' },
                '__v': { type: 'int' },
                'arr': { type: 'vector', dimension: 2 }
            }
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
            tableDefinitionFromSchema(testSchema);
        }, {
            message: 'Cannot convert schema to Data API table definition: schemas with 3-level deep nested path foo.bar.baz are not supported'
        });
    });

    it('throws on document array', () => {
        const testSchema = new Schema({
            documents: [new Schema({
                name: String
            })]
        });

        assert.throws(() => {
            tableDefinitionFromSchema(testSchema);
        }, {
            message: 'Cannot convert schema to Data API table definition: DocumentArray "documents" is not supported'
        });
    });

    it('throws on array of custom schematype', () => {
        const testSchema = new Schema({
            arr: ['Mixed']
        });

        assert.throws(() => {
            tableDefinitionFromSchema(testSchema);
        }, {
            message: 'Cannot convert schema to Data API table definition: unsupported array type at path "arr"'
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
            tableDefinitionFromSchema(testSchema);
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
            tableDefinitionFromSchema(testSchema);
        }, {
            message: 'Cannot convert schema to Data API table definition: unsupported type in subdocument at path "subdoc.test"'
        });
    });

    it('throws on subdoc with buffer', () => {
        const testSchema = new Schema({
            subdoc: new Schema({
                test: Buffer
            })
        });

        assert.throws(() => {
            tableDefinitionFromSchema(testSchema);
        }, {
            message: 'Cannot convert schema to Data API table definition: subdocuments with Buffer at "subdoc" are not supported'
        });
    });

    it('throws on Mixed path', () => {
        const testSchema = new Schema({
            test: 'Mixed'
        });

        assert.throws(() => {
            tableDefinitionFromSchema(testSchema);
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
            tableDefinitionFromSchema(testSchema);
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
            tableDefinitionFromSchema(testSchema);
        }, {
            message: 'Cannot convert schema to Data API table definition: nested paths with Buffer at "nested" are not supported'
        });
    });

    it('throws on non-number array with dimension option', () => {
        const testSchema = new Schema({
            arr: { type: [String], dimension: 2 }
        });

        assert.throws(() => {
            tableDefinitionFromSchema(testSchema);
        }, {
            message: 'Cannot convert schema to Data API table definition: vector column at "arr" must be an array of numbers'
        });
    });
});

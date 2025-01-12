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
    it('generates table definition from schema with number, string and date fields', () => {
        const testSchema = new Schema({
            name: String,
            age: Number,
            createdAt: Date
        });

        const result = tableDefinitionFromSchema(testSchema);

        assert.deepStrictEqual(result, {
            primaryKey: '_id',
            columns: {
                '_id': { type: 'text' },
                '__v': { type: 'int' },
                'name': { type: 'text' },
                'age': { type: 'double' },
                'createdAt': { type: 'timestamp' }
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
});

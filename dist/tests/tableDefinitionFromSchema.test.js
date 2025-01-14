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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const assert_1 = __importDefault(require("assert"));
const tableDefinitionFromSchema_1 = __importDefault(require("../src/tableDefinitionFromSchema"));
describe('tableDefinitionFromSchema', () => {
    it('generates table definition from schema with number, string and date fields', () => {
        const testSchema = new mongoose_1.Schema({
            name: String,
            age: Number,
            createdAt: Date
        });
        const result = (0, tableDefinitionFromSchema_1.default)(testSchema);
        assert_1.default.deepStrictEqual(result, {
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
        const testSchema = new mongoose_1.Schema({
            tags: [String]
        });
        const result = (0, tableDefinitionFromSchema_1.default)(testSchema);
        assert_1.default.deepStrictEqual(result, {
            primaryKey: '_id',
            columns: {
                '_id': { type: 'text' },
                '__v': { type: 'int' },
                'tags': { type: 'list', valueType: 'text' }
            }
        });
    });
    it('handles subdocuments with paths that are all the same type', () => {
        const testSchema = new mongoose_1.Schema({
            subdoc: new mongoose_1.Schema({
                num1: Number,
                num2: Number
            }, { _id: false })
        });
        const result = (0, tableDefinitionFromSchema_1.default)(testSchema);
        assert_1.default.deepStrictEqual(result, {
            primaryKey: '_id',
            columns: {
                '_id': { type: 'text' },
                '__v': { type: 'int' },
                'subdoc': { type: 'map', keyType: 'text', valueType: 'double' }
            }
        });
    });
    it('stores subdocument with multiple different path types as map of text', () => {
        const testSchema = new mongoose_1.Schema({
            subdoc: new mongoose_1.Schema({
                name: String,
                age: Number
            }, { _id: false })
        });
        const result = (0, tableDefinitionFromSchema_1.default)(testSchema);
        assert_1.default.deepStrictEqual(result, {
            primaryKey: '_id',
            columns: {
                '_id': { type: 'text' },
                '__v': { type: 'int' },
                'subdoc': { type: 'map', keyType: 'text', valueType: 'text' }
            }
        });
    });
    it('handles nested paths with paths that are all the same type', () => {
        const testSchema = new mongoose_1.Schema({
            numbers: {
                favorite: Number,
                age: Number
            }
        });
        const result = (0, tableDefinitionFromSchema_1.default)(testSchema);
        assert_1.default.deepStrictEqual(result, {
            primaryKey: '_id',
            columns: {
                '_id': { type: 'text' },
                '__v': { type: 'int' },
                'numbers': { type: 'map', keyType: 'text', valueType: 'double' }
            }
        });
    });
    it('stores nested paths with multiple different path types as map of text', () => {
        const testSchema = new mongoose_1.Schema({
            user: {
                name: String,
                age: Number
            }
        });
        const result = (0, tableDefinitionFromSchema_1.default)(testSchema);
        assert_1.default.deepStrictEqual(result, {
            primaryKey: '_id',
            columns: {
                '_id': { type: 'text' },
                '__v': { type: 'int' },
                'user': { type: 'map', keyType: 'text', valueType: 'text' }
            }
        });
    });
});
//# sourceMappingURL=tableDefinitionFromSchema.test.js.map
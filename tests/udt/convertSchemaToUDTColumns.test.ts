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
import convertSchemaToUDTColumns from '../../src/udt/convertSchemaToUDTColumns';

describe('convertSchemaToUDTColumns', () => {
    it('generates columns from schema with all primitive data types', () => {
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

        const result = convertSchemaToUDTColumns(testSchema);

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

    it('throws an error for maps', async () => {
        const testSchema = new Schema({
            myMap: { type: Map, of: { type: String, required: true } }
        });

        assert.throws(() => {
            convertSchemaToUDTColumns(testSchema);
        }, /map is not supported for UDT columns/);
    });

    it('throws an error for arrays', async () => {
        const testSchema = new Schema({
            myArray: [String]
        });

        assert.throws(() => {
            convertSchemaToUDTColumns(testSchema);
        }, /list is not supported for UDT columns/);
    });

    it('throws an error for udts', async () => {
        const testSchema = new Schema({
            myTest: new Schema({ foo: String }, { udtName: 'myUDT' })
        });

        assert.throws(() => {
            convertSchemaToUDTColumns(testSchema);
        }, /userDefined is not supported for UDT columns/);
    });

    it('throws an error for vectors', async () => {
        const testSchema = new Schema({
            myVector: { type: [Number], dimension: 2 }
        });

        assert.throws(() => {
            convertSchemaToUDTColumns(testSchema);
        }, /vector is not supported for UDT columns/);
    });
});

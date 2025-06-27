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
});

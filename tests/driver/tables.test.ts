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

import assert from 'assert';
import { mongooseInstance } from '../mongooseFixtures';
import { Schema, Types } from 'mongoose';
import { randomUUID } from 'crypto';
import { UUID } from 'bson';

const TEST_TABLE_NAME = 'table1';

describe('tables', function() {
    it('createTable() and dropTable()', async function() {
        await mongooseInstance.connection.dropTable(TEST_TABLE_NAME);

        await mongooseInstance.connection.createTable(TEST_TABLE_NAME, { primaryKey: '_id', columns: { _id: 'text' } });
        const tableNames = await mongooseInstance.connection.listTables().then(tables => tables.map(t => t.name));
        assert.ok(tableNames.includes(TEST_TABLE_NAME));
        await mongooseInstance.connection.dropTable(TEST_TABLE_NAME);

        // Dropping non-existent table is a no-op
        await mongooseInstance.connection.dropTable(TEST_TABLE_NAME);

        await assert.rejects(mongooseInstance.connection.dropTable(''), /^DataAPI.*Error/);
    });
    it('Data type tests', async function() {
        if (!process.env.DATA_API_TABLES) {
            this.skip();
            return;
        }
        const modelName = 'User';
        const userSchema = new Schema({
            name: String,
            age: Number,
            dob: Date,
            isCertified: Boolean,
            employee: Schema.Types.ObjectId,
            friends: [String],
            salary: Schema.Types.Decimal128,
            favorites: Map,
            uniqueId: Schema.Types.UUID,
            category: BigInt,
            buf: Buffer,
            long: BigInt,
            willBeNull: String
        }, { versionKey: false });
        await mongooseInstance.connection.dropTable(TEST_TABLE_NAME);
        await mongooseInstance.connection.createTable(TEST_TABLE_NAME, {
            primaryKey: '_id',
            columns: {
                _id: 'text',
                name: 'text',
                age: 'int',
                dob: 'timestamp',
                isCertified: 'boolean',
                employee: 'text',
                friends: { type: 'list', valueType: 'text' },
                salary: 'decimal',
                favorites: { type: 'map', keyType: 'text', valueType: 'text' },
                uniqueId: { type: 'uuid' },
                buf: { type: 'blob' },
                willBeNull: { type: 'text' }
            }
        });
        const User = mongooseInstance.model(modelName, userSchema, TEST_TABLE_NAME);
        
        const employeeIdVal = new Types.ObjectId();
        //generate a random uuid
        const uniqueIdVal = randomUUID();
        const dobVal = new Date();
        const saveResponse = await new User({
            name: 'User 1',
            age: 10,
            dob: dobVal,
            isCertified: true,
            mixedData: {a: 1, b: 'test'},
            employee: employeeIdVal,
            friends: ['friend 1', 'friend 2'],
            salary: Types.Decimal128.fromString('100.25'),
            favorites: new Map([['food', 'pizza'], ['drink', 'cola']]),
            nestedSchema: {
                address: {
                    street: 'street 1',
                    city: 'city 1',
                    state: 'state 1'
                }
            },
            uniqueId: new UUID(uniqueIdVal),
            documentArray: [{ name: 'test document array' }],
            buf: Buffer.from('hello', 'utf8'),
            willBeNull: null
        }).save();
        assert.strictEqual(saveResponse.name, 'User 1');
        assert.strictEqual(saveResponse.age, 10);
        assert.strictEqual(saveResponse.dob!.toISOString(), dobVal.toISOString());
        assert.strictEqual(saveResponse.isCertified, true);
        assert.strictEqual(saveResponse.employee!.toString(), employeeIdVal.toString());
        assert.strictEqual(saveResponse.friends[0], 'friend 1');
        assert.strictEqual(saveResponse.friends[1], 'friend 2');
        assert.strictEqual(saveResponse.salary!.toString(), '100.25');
        assert.strictEqual(saveResponse.favorites!.get('food'), 'pizza');
        assert.strictEqual(saveResponse.favorites!.get('drink'), 'cola');
        assert.strictEqual(saveResponse.uniqueId!.toString(), uniqueIdVal.toString());
        assert.strictEqual(saveResponse.buf!.toString('utf8'), 'hello');
        assert.strictEqual(saveResponse.willBeNull, null);
        //get record using findOne and verify results
        const findOneResponse = await User.findOne({name: 'User 1'}).orFail();
        assert.strictEqual(findOneResponse.name, 'User 1');
        assert.strictEqual(findOneResponse.age, 10);
        assert.strictEqual(findOneResponse.dob!.toISOString(), dobVal.toISOString());
        assert.strictEqual(findOneResponse.isCertified, true);
        assert.strictEqual(findOneResponse.employee!.toString(), employeeIdVal.toString());
        assert.strictEqual(findOneResponse.friends[0], 'friend 1');
        assert.strictEqual(findOneResponse.friends[1], 'friend 2');
        assert.strictEqual(findOneResponse.salary!.toString(), '100.25');
        assert.strictEqual(findOneResponse.favorites!.get('food'), 'pizza');
        assert.strictEqual(findOneResponse.favorites!.get('drink'), 'cola');
        assert.strictEqual(findOneResponse.uniqueId!.toString(), uniqueIdVal.toString());
        assert.strictEqual(findOneResponse.buf!.toString('utf8'), 'hello');
        assert.strictEqual(findOneResponse.willBeNull, null);
    });
});
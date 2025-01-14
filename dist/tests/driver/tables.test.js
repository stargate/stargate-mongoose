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
const assert_1 = __importDefault(require("assert"));
const mongooseFixtures_1 = require("../mongooseFixtures");
const mongoose_1 = require("mongoose");
const crypto_1 = require("crypto");
const bson_1 = require("bson");
const tableDefinitionFromSchema_1 = __importDefault(require("../../src/tableDefinitionFromSchema"));
const TEST_TABLE_NAME = 'table1';
describe('tables', function () {
    it('createTable() and dropTable()', async function () {
        await mongooseFixtures_1.mongooseInstance.connection.dropTable(TEST_TABLE_NAME);
        await mongooseFixtures_1.mongooseInstance.connection.createTable(TEST_TABLE_NAME, { primaryKey: '_id', columns: { _id: 'text' } });
        const tableNames = await mongooseFixtures_1.mongooseInstance.connection.listTables({ nameOnly: false }).then(tables => tables.map(t => t.name));
        assert_1.default.ok(tableNames.includes(TEST_TABLE_NAME));
        await mongooseFixtures_1.mongooseInstance.connection.dropTable(TEST_TABLE_NAME);
        // Dropping non-existent table is a no-op
        await mongooseFixtures_1.mongooseInstance.connection.dropTable(TEST_TABLE_NAME);
        await assert_1.default.rejects(mongooseFixtures_1.mongooseInstance.connection.dropTable(''), /^DataAPI.*Error/);
    });
    it('schema indexes', async function () {
        if (!process.env.DATA_API_TABLES) {
            this.skip();
            return;
        }
        await mongooseFixtures_1.mongooseInstance.connection.dropTable(TEST_TABLE_NAME);
        const testSchema = new mongoose_1.Schema({ testProperty: { type: String, index: true } });
        await mongooseFixtures_1.mongooseInstance.connection.createTable(TEST_TABLE_NAME, (0, tableDefinitionFromSchema_1.default)(testSchema));
        const TestModel = mongooseFixtures_1.mongooseInstance.model('Test', testSchema, TEST_TABLE_NAME);
        await TestModel.createIndexes();
        let indexes = await mongooseFixtures_1.mongooseInstance.connection.collection(TEST_TABLE_NAME).listIndexes().toArray();
        assert_1.default.ok(indexes.find(index => index.name === 'testProperty'));
        await mongooseFixtures_1.mongooseInstance.connection.collection(TEST_TABLE_NAME).dropIndex('testProperty');
        mongooseFixtures_1.mongooseInstance.deleteModel(/Test/);
        const testSchema2 = new mongoose_1.Schema({ testProperty: { type: String } });
        testSchema2.index({ testProperty: 1 }, { name: 'my_index_2' });
        const TestModel2 = mongooseFixtures_1.mongooseInstance.model('Test', testSchema2, TEST_TABLE_NAME);
        await TestModel2.createIndexes();
        indexes = await mongooseFixtures_1.mongooseInstance.connection.collection(TEST_TABLE_NAME).listIndexes().toArray();
        assert_1.default.ok(indexes.find(index => index.name === 'my_index_2'));
        await mongooseFixtures_1.mongooseInstance.connection.collection(TEST_TABLE_NAME).dropIndex('my_index_2');
        await mongooseFixtures_1.mongooseInstance.connection.dropTable(TEST_TABLE_NAME);
    });
    it('Data type tests', async function () {
        if (!process.env.DATA_API_TABLES) {
            this.skip();
            return;
        }
        const modelName = 'User';
        const userSchema = new mongoose_1.Schema({
            name: String,
            age: Number,
            dob: Date,
            isCertified: Boolean,
            employee: mongoose_1.Schema.Types.ObjectId,
            friends: [String],
            salary: mongoose_1.Schema.Types.Decimal128,
            favorites: { type: Map, of: String },
            uniqueId: mongoose_1.Schema.Types.UUID,
            category: BigInt,
            buf: Buffer,
            willBeNull: String
        }, { versionKey: false });
        await mongooseFixtures_1.mongooseInstance.connection.dropTable(TEST_TABLE_NAME);
        const tableDefinition = (0, tableDefinitionFromSchema_1.default)(userSchema);
        assert_1.default.deepStrictEqual(tableDefinition, {
            primaryKey: '_id',
            columns: {
                _id: { type: 'text' },
                __v: { type: 'int' },
                name: { type: 'text' },
                age: { type: 'double' },
                dob: { type: 'timestamp' },
                isCertified: { type: 'boolean' },
                employee: { type: 'text' },
                friends: { type: 'list', valueType: 'text' },
                salary: { type: 'decimal' },
                favorites: { type: 'map', keyType: 'text', valueType: 'text' },
                uniqueId: { type: 'uuid' },
                category: { type: 'varint' },
                buf: { type: 'blob' },
                willBeNull: { type: 'text' }
            }
        });
        await mongooseFixtures_1.mongooseInstance.connection.createTable(TEST_TABLE_NAME, tableDefinition);
        const User = mongooseFixtures_1.mongooseInstance.model(modelName, userSchema, TEST_TABLE_NAME);
        const employeeIdVal = new mongoose_1.Types.ObjectId();
        //generate a random uuid
        const uniqueIdVal = (0, crypto_1.randomUUID)();
        const dobVal = new Date();
        const saveResponse = await new User({
            name: 'User 1',
            age: 10,
            dob: dobVal,
            isCertified: true,
            mixedData: { a: 1, b: 'test' },
            employee: employeeIdVal,
            friends: ['friend 1', 'friend 2'],
            salary: mongoose_1.Types.Decimal128.fromString('100.25'),
            favorites: new Map([['food', 'pizza'], ['drink', 'cola']]),
            nestedSchema: {
                address: {
                    street: 'street 1',
                    city: 'city 1',
                    state: 'state 1'
                }
            },
            uniqueId: new bson_1.UUID(uniqueIdVal),
            category: 42n,
            buf: Buffer.from('hello', 'utf8'),
            willBeNull: null
        }).save();
        assert_1.default.strictEqual(saveResponse.name, 'User 1');
        assert_1.default.strictEqual(saveResponse.age, 10);
        assert_1.default.strictEqual(saveResponse.dob.toISOString(), dobVal.toISOString());
        assert_1.default.strictEqual(saveResponse.isCertified, true);
        assert_1.default.strictEqual(saveResponse.employee.toString(), employeeIdVal.toString());
        assert_1.default.strictEqual(saveResponse.friends[0], 'friend 1');
        assert_1.default.strictEqual(saveResponse.friends[1], 'friend 2');
        assert_1.default.strictEqual(saveResponse.salary.toString(), '100.25');
        assert_1.default.strictEqual(saveResponse.favorites.get('food'), 'pizza');
        assert_1.default.strictEqual(saveResponse.favorites.get('drink'), 'cola');
        assert_1.default.strictEqual(saveResponse.uniqueId.toString(), uniqueIdVal.toString());
        assert_1.default.strictEqual(saveResponse.category, 42n);
        assert_1.default.strictEqual(saveResponse.buf.toString('utf8'), 'hello');
        assert_1.default.strictEqual(saveResponse.willBeNull, null);
        //get record using findOne and verify results
        const findOneResponse = await User.findOne({ name: 'User 1' }).orFail();
        assert_1.default.strictEqual(findOneResponse.name, 'User 1');
        assert_1.default.strictEqual(findOneResponse.age, 10);
        assert_1.default.strictEqual(findOneResponse.dob.toISOString(), dobVal.toISOString());
        assert_1.default.strictEqual(findOneResponse.isCertified, true);
        assert_1.default.strictEqual(findOneResponse.employee.toString(), employeeIdVal.toString());
        assert_1.default.strictEqual(findOneResponse.friends[0], 'friend 1');
        assert_1.default.strictEqual(findOneResponse.friends[1], 'friend 2');
        assert_1.default.strictEqual(findOneResponse.salary.toString(), '100.25');
        assert_1.default.strictEqual(findOneResponse.favorites.get('food'), 'pizza');
        assert_1.default.strictEqual(findOneResponse.favorites.get('drink'), 'cola');
        assert_1.default.strictEqual(findOneResponse.uniqueId.toString(), uniqueIdVal.toString());
        assert_1.default.strictEqual(findOneResponse.category, 42n);
        assert_1.default.strictEqual(findOneResponse.buf.toString('utf8'), 'hello');
        assert_1.default.strictEqual(findOneResponse.willBeNull, null);
    });
});
//# sourceMappingURL=tables.test.js.map
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
import { mongooseInstanceTables as mongooseInstance, createMongooseCollections, testDebug } from '../mongooseFixtures';
import { Schema, Types } from 'mongoose';
import { randomUUID } from 'crypto';
import { UUID } from 'bson';
import tableDefinitionFromSchema from '../../src/tableDefinitionFromSchema';
import { DataAPIDuration, DataAPIInet, DataAPIDate, DataAPITime } from '@datastax/astra-db-ts';
import convertSchemaToColumns from '../../src/convertSchemaToColumns';

const TEST_TABLE_NAME = 'table1';

describe('TABLES: basic operations and data types', function() {
    before(async () => {
        await createMongooseCollections(true);
    });

    it('createTable() and dropTable()', async function() {
        await mongooseInstance.connection.dropTable(TEST_TABLE_NAME);

        await mongooseInstance.connection.createTable(TEST_TABLE_NAME, { primaryKey: '_id', columns: { _id: 'text' } });
        const tableNames = await mongooseInstance.connection.listTables({ nameOnly: false }).then(tables => tables.map(t => t.name));
        assert.ok(tableNames.includes(TEST_TABLE_NAME));
        await mongooseInstance.connection.dropTable(TEST_TABLE_NAME);

        // Dropping non-existent table is a no-op
        await mongooseInstance.connection.dropTable(TEST_TABLE_NAME);

        await assert.rejects(mongooseInstance.connection.dropTable(''), /^DataAPI.*Error/);
    });
    it('schema indexes', async function() {
        await mongooseInstance.connection.dropTable(TEST_TABLE_NAME);

        const testSchema = new Schema({ testProperty: { type: String, index: true } });
        await mongooseInstance.connection.createTable(TEST_TABLE_NAME, tableDefinitionFromSchema(testSchema));

        const TestModel = mongooseInstance.model('Test', testSchema, TEST_TABLE_NAME);
        await TestModel.createIndexes();
        let indexes = await mongooseInstance.connection.collection(TEST_TABLE_NAME).listIndexes().toArray();
        assert.ok(indexes.find(index => index.name === 'testProperty_index'));

        await mongooseInstance.connection.collection(TEST_TABLE_NAME).dropIndex('testProperty_index');

        mongooseInstance.deleteModel(/Test/);
        const testSchema2 = new Schema({ testProperty: { type: String } });
        testSchema2.index({ testProperty: 1 }, { name: 'my_index_2' });
        const TestModel2 = mongooseInstance.model('Test', testSchema2, TEST_TABLE_NAME);
        await TestModel2.createIndexes();
        indexes = await mongooseInstance.connection.collection(TEST_TABLE_NAME).listIndexes().toArray();
        assert.ok(indexes.find(index => index.name === 'my_index_2'));

        await mongooseInstance.connection.collection(TEST_TABLE_NAME).dropIndex('my_index_2');
    });
    it('fails to create compound index', async function() {
        const testSchema = new Schema({ testProperty: String, otherTestProperty: String });
        testSchema.index({ testProperty: 1, otherTestProperty: 1 });

        mongooseInstance.connection.deleteModel(/Test/);
        const TestModel = mongooseInstance.model('Test', testSchema, TEST_TABLE_NAME);
        await assert.rejects(
            TestModel.createIndexes(),
            { message: 'createIndex indexSpec must have exactly 1 key' }
        );
    });
    it('Data type tests', async function() {
        const modelName = 'User';
        const userSchema = new Schema({
            name: String,
            age: Number,
            dob: Date,
            isCertified: Boolean,
            employee: Schema.Types.ObjectId,
            friends: [String],
            salary: Schema.Types.Decimal128,
            favorites: { type: Map, of: { type: String, required: true } },
            uniqueId: Schema.Types.UUID,
            category: BigInt,
            buf: Buffer,
            willBeNull: String,
            count: 'Int32',
            walletBalance: 'Double'
        }, { versionKey: false });
        await mongooseInstance.connection.dropTable(TEST_TABLE_NAME);
        const tableDefinition = tableDefinitionFromSchema(userSchema);
        assert.deepStrictEqual(tableDefinition, {
            primaryKey: '_id',
            columns: {
                _id: { type: 'text' },
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
                willBeNull: { type: 'text' },
                count: { type: 'int' },
                walletBalance: { type: 'double' }
            }
        });

        tableDefinition.columns.timeSinceStart = { type: 'duration' };
        tableDefinition.columns.hostIP = { type: 'inet' };
        tableDefinition.columns.startDate = { type: 'date' };
        tableDefinition.columns.timeOfDay = { type: 'time' };
        userSchema.add({
            timeSinceStart: String,
            hostIP: String,
            startDate: String,
            timeOfDay: String
        });

        await mongooseInstance.connection.createTable(TEST_TABLE_NAME, tableDefinition);
        mongooseInstance.deleteModel(/User/);
        const User = mongooseInstance.model(modelName, userSchema, TEST_TABLE_NAME);
        if (testDebug) {
            mongooseInstance.connection.collection(TEST_TABLE_NAME).collection.on('commandStarted', ev => {
                console.log(ev.target.url, JSON.stringify(ev.command, null, '    '));
            });
        }

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
            category: 42n,
            buf: Buffer.from('hello', 'utf8'),
            willBeNull: null,
            count: 12,
            walletBalance: 100.50
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
        assert.strictEqual(saveResponse.category, 42n);
        assert.strictEqual(saveResponse.buf!.toString('utf8'), 'hello');
        assert.strictEqual(saveResponse.willBeNull, null);
        assert.strictEqual(saveResponse.count, 12);
        assert.ok(saveResponse.walletBalance instanceof Types.Double);
        assert.strictEqual(saveResponse.walletBalance.valueOf(), 100.50);

        await mongooseInstance.connection.collection(TEST_TABLE_NAME).collection.updateOne(
            { _id: saveResponse._id.toString() },
            {
                $set: {
                    timeSinceStart: new DataAPIDuration('2w'),
                    hostIP: new DataAPIInet('192.168.1.1', 4),
                    startDate: new DataAPIDate('2022-01-01'),
                    timeOfDay: new DataAPITime('12:00:00')
                }
            }
        );

        //get record using findOne and verify results
        let findOneResponse = await User.findOne({name: 'User 1'}).orFail();
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
        assert.strictEqual(findOneResponse.category, 42n);
        assert.strictEqual(findOneResponse.buf!.toString('utf8'), 'hello');
        assert.strictEqual(findOneResponse.willBeNull, null);
        assert.strictEqual(findOneResponse.count, 12);
        assert.ok(findOneResponse.walletBalance instanceof Types.Double);
        assert.strictEqual(findOneResponse.walletBalance.valueOf(), 100.50);

        assert.strictEqual(findOneResponse.get('hostIP'), '192.168.1.1');
        assert.strictEqual(findOneResponse.get('timeSinceStart'), '14d');
        assert.strictEqual(findOneResponse.get('startDate'), '2022-01-01');
        assert.strictEqual(findOneResponse.get('timeOfDay'), '12:00:00.000000000');

        findOneResponse.set('hostIP', '192.168.1.2');
        findOneResponse.set('timeSinceStart', '15d');
        findOneResponse.set('startDate', '2022-01-02');
        findOneResponse.set('timeOfDay', '13:00:00.000000000');
        await findOneResponse.save();
        findOneResponse = await User.findOne({name: 'User 1'}).orFail();
        assert.strictEqual(findOneResponse.get('hostIP'), '192.168.1.2');
        assert.strictEqual(findOneResponse.get('timeSinceStart'), '15d');
        assert.strictEqual(findOneResponse.get('startDate'), '2022-01-02');
        assert.strictEqual(findOneResponse.get('timeOfDay'), '13:00:00.000000000');
    });

    describe('UDTs', () => {
        beforeEach(async () => {
            await mongooseInstance.connection.dropTable(TEST_TABLE_NAME);
            const db = mongooseInstance.connection.db;
            assert.ok(db);
            const types = await db.listTypes();
            for (const type of types) {
                await db.dropType(type);
            }

            mongooseInstance.deleteModel(/Test/);
        });

        afterEach(async () => {
            await mongooseInstance.connection.dropTable(TEST_TABLE_NAME);
            const db = mongooseInstance.connection.db;
            assert.ok(db);
            const types = await db.listTypes();
            for (const type of types) {
                await db.dropType(type);
            }
        });

        it('supports creating and altering UDTs', async () => {
            const db = mongooseInstance.connection.db;
            assert.ok(db);

            await db.createType('ProductType', {
                fields: {
                    name: { type: 'text' },
                    price: { type: 'int' }
                }
            });

            const typeNames = await db.listTypes();
            assert.deepStrictEqual(typeNames, ['ProductType']);

            const typeDefs = await db.listTypes({ explain: true });
            assert.deepStrictEqual(typeDefs.map((def) => def.definition.fields), [{
                name: { type: 'text' },
                price: { type: 'int' }
            }]);

            // Test altering the type to add a new "category" field
            await db.alterType('ProductType', {
                add: { fields: { category: { type: 'text' } } }
            });

            // Verify the field is present after alteration
            const typeDefsAfterAlter = await db.listTypes({ explain: true });
            assert.deepStrictEqual(typeDefsAfterAlter.map((def) => def.definition.fields), [{
                name: { type: 'text' },
                price: { type: 'int' },
                category: { type: 'text' }
            }]);
        });

        it('handles UDTs created from a schema definition', async () => {
            const db = mongooseInstance.connection.db;
            assert.ok(db);

            const productSchema = new Schema(
                {
                    name: { type: String },
                    price: { type: Number },
                    category: { type: String }
                },
                { udtName: 'Product', versionKey: false, _id: false }
            );

            await db.createType('Product', { fields: convertSchemaToColumns(productSchema) });
            const typeDefs = await db.listTypes({ explain: true });
            assert.deepStrictEqual(typeDefs.map((def) => def.definition.fields), [{
                name: { type: 'text' },
                price: { type: 'double' },
                category: { type: 'text' }
            }]);

            const clickedEventSchema = new Schema({
                product: productSchema,
                url: String
            });

            await mongooseInstance.connection.createTable(TEST_TABLE_NAME, tableDefinitionFromSchema(clickedEventSchema));

            const TestModel = mongooseInstance.model('Test', clickedEventSchema, TEST_TABLE_NAME);
            const doc = await TestModel.create({
                url: 'https://example.com',
                product: { name: 'Test Product', price: 100, category: 'Test Category' }
            });
            assert.ok(doc);
            assert.strictEqual(doc.product!.name, 'Test Product');
            assert.strictEqual(doc.product!.price, 100);
            assert.strictEqual(doc.product!.category, 'Test Category');
            assert.strictEqual(doc.url, 'https://example.com');

            const rawDoc = await TestModel.collection.findOne({ _id: doc._id });
            assert.ok(rawDoc);
            assert.strictEqual(rawDoc.product!.name, 'Test Product');
            assert.strictEqual(rawDoc.product!.price, 100);
            assert.strictEqual(rawDoc.product!.category, 'Test Category');
            assert.strictEqual(rawDoc.url, 'https://example.com');
        });

        it('handles UDTs created from a schema definition with udtName', async () => {
            const db = mongooseInstance.connection.db;
            assert.ok(db);

            const productSchema = new Schema(
                {
                    name: { type: String },
                    price: { type: Number },
                    category: { type: String }
                },
                { versionKey: false, _id: false }
            );

            await db.createType('Product', { fields: convertSchemaToColumns(productSchema) });
            const typeDefs = await db.listTypes({ explain: true });
            assert.deepStrictEqual(typeDefs.map((def) => def.definition.fields), [{
                name: { type: 'text' },
                price: { type: 'double' },
                category: { type: 'text' }
            }]);

            const clickedEventSchema = new Schema({
                product: { type: productSchema, udtName: 'Product' },
                url: String
            });

            await mongooseInstance.connection.createTable(TEST_TABLE_NAME, tableDefinitionFromSchema(clickedEventSchema));

            const TestModel = mongooseInstance.model('Test', clickedEventSchema, TEST_TABLE_NAME);
            const doc = await TestModel.create({
                url: 'https://example.com',
                product: { name: 'Test Product', price: 100, category: 'Test Category' }
            });
            assert.ok(doc);
            assert.strictEqual(doc.product!.name, 'Test Product');
            assert.strictEqual(doc.product!.price, 100);
            assert.strictEqual(doc.product!.category, 'Test Category');
            assert.strictEqual(doc.url, 'https://example.com');

            const rawDoc = await TestModel.collection.findOne({ _id: doc._id });
            assert.ok(rawDoc);
            assert.strictEqual(rawDoc.product!.name, 'Test Product');
            assert.strictEqual(rawDoc.product!.price, 100);
            assert.strictEqual(rawDoc.product!.category, 'Test Category');
            assert.strictEqual(rawDoc.url, 'https://example.com');
        });

        it('handles set of UDTs created from a schema definition', async () => {
            const db = mongooseInstance.connection.db;
            assert.ok(db);

            const productSchema = new Schema(
                {
                    name: { type: String },
                    price: { type: Number },
                    category: { type: String }
                },
                { udtName: 'Product', versionKey: false, _id: false }
            );

            await db.createType('Product', { fields: convertSchemaToColumns(productSchema) });
            const typeDefs = await db.listTypes({ explain: true });
            assert.deepStrictEqual(typeDefs.map((def) => def.definition.fields), [{
                name: { type: 'text' },
                price: { type: 'double' },
                category: { type: 'text' }
            }]);

            const cartSchema = new Schema({
                products: [productSchema]
            });

            await mongooseInstance.connection.createTable(TEST_TABLE_NAME, tableDefinitionFromSchema(cartSchema));

            const TestModel = mongooseInstance.model('Test', cartSchema, TEST_TABLE_NAME);
            const doc = await TestModel.create({
                products: [
                    { name: 'Test Product', price: 100, category: 'Test Category' },
                    { name: 'Test Product 2', price: 200, category: 'Test Category 2' }
                ]
            });
            assert.ok(doc);
            assert.strictEqual(doc.products[0].name, 'Test Product');
            assert.strictEqual(doc.products[0].price, 100);
            assert.strictEqual(doc.products[0].category, 'Test Category');
            assert.strictEqual(doc.products[1].name, 'Test Product 2');
            assert.strictEqual(doc.products[1].price, 200);
            assert.strictEqual(doc.products[1].category, 'Test Category 2');

            const rawDoc = await TestModel.collection.findOne({ _id: doc._id });
            assert.ok(rawDoc);
            assert.strictEqual(rawDoc.products[0].name, 'Test Product');
            assert.strictEqual(rawDoc.products[0].price, 100);
            assert.strictEqual(rawDoc.products[0].category, 'Test Category');
            assert.strictEqual(rawDoc.products[1].name, 'Test Product 2');
            assert.strictEqual(rawDoc.products[1].price, 200);
            assert.strictEqual(rawDoc.products[1].category, 'Test Category 2');
        });

        it('handles map of UDTs created from a schema definition', async () => {
            const db = mongooseInstance.connection.db;
            assert.ok(db);

            const productSchema = new Schema(
                {
                    name: { type: String },
                    price: { type: Number },
                    category: { type: String }
                },
                { udtName: 'Product', versionKey: false, _id: false }
            );

            await db.createType('Product', { fields: convertSchemaToColumns(productSchema) });
            const typeDefs = await db.listTypes({ explain: true });
            assert.deepStrictEqual(typeDefs.map((def) => def.definition.fields), [{
                name: { type: 'text' },
                price: { type: 'double' },
                category: { type: 'text' }
            }]);

            const cartSchema = new Schema({
                productsByCategory: { type: Map, of: { type: productSchema, required: true } }
            });

            await mongooseInstance.connection.createTable(TEST_TABLE_NAME, tableDefinitionFromSchema(cartSchema));

            const TestModel = mongooseInstance.model('Test', cartSchema, TEST_TABLE_NAME);
            const doc = await TestModel.create({
                productsByCategory: {
                    'Test Category': { name: 'Test Product', price: 100, category: 'Test Category' },
                    'Test Category 2': { name: 'Test Product 2', price: 200, category: 'Test Category 2' }
                }
            });
            assert.ok(doc);
            assert.strictEqual(doc.productsByCategory!.get('Test Category')!.name, 'Test Product');
            assert.strictEqual(doc.productsByCategory!.get('Test Category')!.price, 100);
            assert.strictEqual(doc.productsByCategory!.get('Test Category')!.category, 'Test Category');
            assert.strictEqual(doc.productsByCategory!.get('Test Category 2')!.name, 'Test Product 2');
            assert.strictEqual(doc.productsByCategory!.get('Test Category 2')!.price, 200);
            assert.strictEqual(doc.productsByCategory!.get('Test Category 2')!.category, 'Test Category 2');

            const rawDoc = await TestModel.collection.findOne({ _id: doc._id });
            assert.ok(rawDoc);
            assert.strictEqual(rawDoc.productsByCategory!['Test Category']!.name, 'Test Product');
            assert.strictEqual(rawDoc.productsByCategory!['Test Category']!.price, 100);
            assert.strictEqual(rawDoc.productsByCategory!['Test Category']!.category, 'Test Category');
            assert.strictEqual(rawDoc.productsByCategory!['Test Category 2']!.name, 'Test Product 2');
            assert.strictEqual(rawDoc.productsByCategory!['Test Category 2']!.price, 200);
            assert.strictEqual(rawDoc.productsByCategory!['Test Category 2']!.category, 'Test Category 2');
        });
    });
});

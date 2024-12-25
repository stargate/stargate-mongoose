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
import mongoose from 'mongoose';
import * as StargateMongooseDriver from '../../src/driver';
import { testClient, TEST_COLLECTION_NAME } from '../fixtures';
import { Product, Cart, mongooseInstance } from '../mongooseFixtures';

describe('Driver based tests', async () => {
    let dbUri: string;
    let isAstra: boolean;
    before(async function () {
        if (testClient == null) {
            return this.skip();
        }
        dbUri = testClient.uri;
        isAstra = testClient.isAstra;
    });
    describe('StargateMongoose - index', () => {
        it('should leverage astradb', async function () {
            await Promise.all([Product.deleteMany({}), Cart.deleteMany({})]);
            const product1 = new Product({
                name: 'Product 1',
                price: 10,
                expiryDate: new Date('2024-04-20T00:00:00.000Z'),
                isCertified: true
            });
            await product1.save();

            const product2 = new Product({
                name: 'Product 2',
                price: 10,
                expiryDate: new Date('2024-11-20T00:00:00.000Z'),
                isCertified: false
            });
            await product2.save();

            const cart = new Cart({
                name: 'My Cart',
                cartName: 'wewson',
                products: [product1._id, product2._id]
            });
            await cart.save();
            assert.strictEqual(await Cart.findOne({cartName: 'wewson'}).select('name').orFail().exec().then((doc) => doc.name), cart.name);
            //compare if product expiryDate is same as saved
            assert.strictEqual(
                await Product.findOne({name: 'Product 1'}).select('expiryDate').orFail().exec().then((doc) => doc.expiryDate!.toISOString()),
                product1.expiryDate!.toISOString()
            );

            if (!process.env.DATA_API_TABLES) {
                const findOneAndReplaceResp = await Cart.findOneAndReplace({cartName: 'wewson'}, {
                    name: 'My Cart 2',
                    cartName: 'wewson1'
                }, {returnDocument: 'after'}).exec();
                assert.strictEqual(findOneAndReplaceResp!.name, 'My Cart 2');
                assert.strictEqual(findOneAndReplaceResp!.cartName, 'wewson1');
            } else {
                await Cart.updateOne({_id: cart._id}, {
                    name: 'My Cart 2',
                    cartName: 'wewson1',
                    products: null
                });
                const doc = await Cart.findOne({cartName: 'wewson1'}).orFail();
                assert.strictEqual(doc!.name, 'My Cart 2');
                assert.strictEqual(doc!.cartName, 'wewson1');
            }

            const productNames: string[] = [];
            const cursor = await Product.find().cursor();
            await cursor.eachAsync(p => productNames.push(p.name!));
            assert.deepEqual(productNames.sort(), ['Product 1', 'Product 2']);

            await cart.deleteOne();
            assert.strictEqual(await Cart.findOne({cartName: 'wewson'}), null);
        });
    });
    describe('Mongoose API', () => {
        const personSchema = new mongooseInstance.Schema({
            name: { type: String, required: true }
        });
        const Person = mongooseInstance.model('Person', personSchema, TEST_COLLECTION_NAME);
        before(async function () {
            const tables = await mongooseInstance.connection.listTables();
            const tableNames = tables.map(t => t.name);

            if (process.env.DATA_API_TABLES) {
                await mongooseInstance.connection.dropTable(TEST_COLLECTION_NAME);
                await mongooseInstance.connection.createTable(TEST_COLLECTION_NAME, {
                    primaryKey: '_id',
                    columns: {
                        _id: { type: 'text' },
                        __v: { type: 'int' },
                        name: { type: 'text' }
                    }
                });
            } else {
                if (tableNames.includes(TEST_COLLECTION_NAME)) {
                    await mongooseInstance.connection.dropTable(TEST_COLLECTION_NAME);
                }

                const collections = await mongooseInstance.connection.listCollections();
                const collectionNames = collections.map(({ name }) => name);
                if (!collectionNames.includes(TEST_COLLECTION_NAME)) {
                    await Person.createCollection();
                }
            }
            
        });

        after(async () => {
            await Person.deleteMany({});
            if (!process.env.DATA_API_TABLES) {
                await mongooseInstance.connection.dropCollection(TEST_COLLECTION_NAME);
            }
        });

        it('handles find cursors', async () => {
            const Person = mongooseInstance!.model('Person');
            await Person.deleteMany({});
            await Person.create([{name: 'John'}, {name: 'Bill'}]);

            const names: string[] = [];
            const cursor = await Person.find().cursor();
            await cursor.eachAsync(doc => names.push(doc.name));
            assert.deepEqual(names.sort(), ['Bill', 'John']);
        });

        it('handles document deleteOne() and updateOne()', async () => {
            const Person = mongooseInstance!.model('Person');
            await Person.deleteMany({});
            const [person1] = await Person.create([{name: 'John'}, {name: 'Bill'}]);

            await person1.updateOne({name: 'Joe'});
            let names = await Person.find();
            assert.deepEqual(names.map(doc => doc.name).sort(), ['Bill', 'Joe']);

            await person1.deleteOne();
            names = await Person.find();
            assert.deepEqual(names.map(doc => doc.name).sort(), ['Bill']);
        });

        it('handles updating existing document with save()', async () => {
            const Person = mongooseInstance!.model('Person');
            await Person.deleteMany({});
            const [person] = await Person.create([{name: 'John'}]);

            person.name = 'Joe';
            await person.save();
            const names = await Person.find();
            assert.deepEqual(names.map(doc => doc.name).sort(), ['Joe']);
        });

        it('handles populate()', async () => {
            const Product = mongooseInstance!.model('Product');
            await Promise.all([Cart!.deleteMany({}), Product.deleteMany({})]);
            const [{ _id: productId }] = await Product.create([
                { name: 'iPhone 12', price: 500 },
                { name: 'MacBook Air', price: 1400 }
            ]);
            const { _id: cartId } = await Cart!.create({ name: 'test', products: [productId] });

            const cart = await Cart!.findById(cartId).populate<{ products: (typeof Product)[] }>('products').orFail();
            assert.deepEqual(cart.products.map(p => p.name), ['iPhone 12']);
        });

        it('handles exists()', async () => {
            const Person = mongooseInstance!.model('Person');
            await Person.deleteMany({});
            await Person.create([{name: 'John'}]);

            assert.ok(await Person.exists({name: 'John'}));
            assert.ok(!(await Person.exists({name: 'James'})));
        });

        it('handles insertMany()', async () => {
            const Person = mongooseInstance!.model('Person');
            await Person.deleteMany({});
            await Person.insertMany([{ name: 'John' }, { name: 'Bill' }]);

            const docs = await Person.find();
            assert.deepEqual(docs.map(doc => doc.name).sort(), ['Bill', 'John']);
        });

        it('throws readable error on bulkWrite()', async () => {
            const Person = mongooseInstance!.model('Person');
            await Person.deleteMany({});
            await assert.rejects(
                Person.bulkWrite([{insertOne: {document: {name: 'John'}}}]),
                /bulkWrite\(\) Not Implemented/
            );
        });

        it('throws readable error on aggregate()', async () => {
            const Person = mongooseInstance!.model('Person');
            await Person.deleteMany({});
            await assert.rejects(
                Person.aggregate([{$match: {name: 'John'}}]),
                /aggregate\(\) Not Implemented/
            );
        });

        it('throws readable error on change stream', async () => {
            const Person = mongooseInstance!.model('Person');
            await Person.init();
            await Person.deleteMany({});
            await assert.throws(
                () => Person.watch([{$match: {name: 'John'}}]),
                /watch\(\) Not Implemented/
            );
        });

        it('handles reconnecting after disconnecting', async () => {
            const mongooseInstance = await createMongooseInstance();
            const TestModel = mongooseInstance.model('Person', Person.schema, TEST_COLLECTION_NAME);
            if (process.env.DATA_API_TABLES) {
                const tableNames = await mongooseInstance.connection.listTables().then(t => t.map(t => t.name));
                if (!tableNames.includes(TEST_COLLECTION_NAME)) {
                    await mongooseInstance.connection.createTable(TEST_COLLECTION_NAME, {
                        primaryKey: '_id',
                        columns: {
                            _id: { type: 'text' },
                            name: { type: 'text' }
                        }
                    });
                }
            } else {
                const collectionNames = await mongooseInstance.connection.listCollections().then(collections => collections.map(c => c.name));
                if (!collectionNames.includes(TEST_COLLECTION_NAME)) {
                    await TestModel.createCollection();
                }
            }
            await TestModel.findOne();

            await mongooseInstance.disconnect();

            const options = isAstra
                ? { isAstra: true, useTables: !!process.env.DATA_API_TABLES }
                : { username: process.env.STARGATE_USERNAME, password: process.env.STARGATE_PASSWORD, useTables: !!process.env.DATA_API_TABLES };
            await mongooseInstance.connect(dbUri, options);

            // Should be able to execute query after reconnecting
            await TestModel.findOne();

            await mongooseInstance.disconnect();
        });
          
        it('handles listCollections()', async function() {
            if (process.env.DATA_API_TABLES) {
                this.skip();
                return;
            }
            const collections = await mongooseInstance!.connection.listCollections();
            const collectionNames = collections.map(({ name }) => name);
            assert.ok(typeof collectionNames[0] === 'string', collectionNames.join(','));
        });

        async function createMongooseInstance() {
            const mongooseInstance = new mongoose.Mongoose() as unknown as Omit<mongoose.Mongoose, 'connection'> & { connection: StargateMongooseDriver.Connection };
            mongooseInstance.setDriver(StargateMongooseDriver);
            mongooseInstance.set('autoCreate', false);
            mongooseInstance.set('autoIndex', false);

            const options = isAstra ? { isAstra: true } : { username: process.env.STARGATE_USERNAME, password: process.env.STARGATE_PASSWORD };
            await mongooseInstance.connect(dbUri, options);

            return mongooseInstance;
        }
    });
    describe('namespace management tests', () => {
        it('should fail when dropDatabase is called', async () => {
            const mongooseInstance = new mongoose.Mongoose();
            mongooseInstance.setDriver(StargateMongooseDriver);
            mongooseInstance.set('autoCreate', false);
            mongooseInstance.set('autoIndex', false);
            const options = isAstra ? { isAstra: true } : { username: process.env.STARGATE_USERNAME, password: process.env.STARGATE_PASSWORD };
            
            await mongooseInstance.connect(dbUri, options);

            await assert.rejects(
                () => mongooseInstance.connection.dropDatabase(),
                { message: 'dropDatabase() Not Implemented' }
            );
            mongooseInstance.connection.getClient().close();
        });
    });
});

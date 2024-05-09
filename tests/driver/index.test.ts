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
import * as StargateMongooseDriver from '@/src/driver';
import { testClient } from '@/tests/fixtures';
import { logger } from '@/src/logger';
import { parseUri } from '@/src/collections/utils';
import { HTTPClient } from '@/src/client';
import { Client } from '@/src/collections';
import { Product, Cart, mongooseInstance } from '@/tests/mongooseFixtures';

describe('Driver based tests', async () => {
    let dbUri: string;
    let isAstra: boolean;
    before(async function () {
        if (testClient == null) {
            return this.skip();
        }
        const astraClient = await testClient.client;
        if (astraClient === null) {
            logger.info('Skipping tests for client: %s', testClient);
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
            assert.strictEqual(await Cart.findOne({cartName: 'wewson'}).select('name').exec().then((doc: any) => doc.name), cart.name);
            //compare if product expiryDate is same as saved
            assert.strictEqual(await Product.findOne({name: 'Product 1'}).select('expiryDate').exec().then((doc: any) => doc.expiryDate.toISOString()), product1.expiryDate!.toISOString());

            const findOneAndReplaceResp = await Cart.findOneAndReplace({cartName: 'wewson'}, {
                name: 'My Cart 2',
                cartName: 'wewson1'
            }, {returnDocument: 'after'}).exec();
            assert.strictEqual(findOneAndReplaceResp!.name, 'My Cart 2');
            assert.strictEqual(findOneAndReplaceResp!.cartName, 'wewson1');

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
        const Person = mongooseInstance.model('Person', personSchema);
        before(async function () {
            await Person.createCollection();
        });

        after(async () => {
            await Person.db.dropCollection(Person.collection.collectionName);
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
            // @ts-ignore
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

        it('disconnect() closes all httpClients', async () => {
            const mongooseInstance = await createMongooseInstance();
            const client: Client = mongooseInstance.connection.getClient() as any as Client;
            const httpClient: HTTPClient = client.httpClient;
            assert.ok(!httpClient.closed);
            await mongooseInstance.disconnect();

            assert.ok(httpClient.closed);
        });

        it('close() close underlying httpClient', async () => {
            const mongooseInstance = await createMongooseInstance();
            const client: Client = mongooseInstance.connection.getClient() as any as Client;
            const httpClient: HTTPClient = client.httpClient;
            assert.ok(!httpClient.closed);
            await client.close();

            assert.ok(httpClient.closed);
        });

        it('handles reconnecting after disconnecting', async () => {
            const mongooseInstance = await createMongooseInstance();
            const TestModel = mongooseInstance.model('Person', Person.schema);
            await TestModel.init();
            await TestModel.findOne();

            await mongooseInstance.disconnect();

            const options = isAstra ? { isAstra: true } : { username: process.env.STARGATE_USERNAME, password: process.env.STARGATE_PASSWORD };
            // @ts-ignore - these are config options supported by stargate-mongoose but not mongoose
            await mongooseInstance.connect(dbUri, options);

            // Should be able to execute query after reconnecting
            await TestModel.findOne();

            await mongooseInstance.disconnect();
        });
          
        it('handles listCollections()', async () => {
            const Person = mongooseInstance!.model('Person');
            await Person.init();
            await Person.deleteMany({});
            const collections = await mongooseInstance!.connection.listCollections();
            const collectionNames = collections.map(({ name }) => name);
            assert.ok(
                collectionNames.includes('people'),
                collectionNames.join(', ')
            );
        });

        async function createMongooseInstance() {
            const mongooseInstance = new mongoose.Mongoose();
            mongooseInstance.setDriver(StargateMongooseDriver);
            mongooseInstance.set('autoCreate', false);
            mongooseInstance.set('autoIndex', false);

            const options = isAstra ? { isAstra: true } : { username: process.env.STARGATE_USERNAME, password: process.env.STARGATE_PASSWORD };
            // @ts-ignore - these are config options supported by stargate-mongoose but not mongoose
            await mongooseInstance.connect(dbUri, options);

            return mongooseInstance;
        }
    });
    describe('namespace management tests', () => {
        it('should fail when dropDatabase is called for AstraDB', async () => {
            const mongooseInstance = new mongoose.Mongoose();
            mongooseInstance.setDriver(StargateMongooseDriver);
            mongooseInstance.set('autoCreate', true);
            mongooseInstance.set('autoIndex', false);
            const options = isAstra ? { isAstra: true } : { username: process.env.STARGATE_USERNAME, password: process.env.STARGATE_PASSWORD };
            // @ts-ignore - these are config options supported by stargate-mongoose but not mongoose
            await mongooseInstance.connect(dbUri, options);
            if (isAstra) {
                let error: any;
                try {
                    await mongooseInstance.connection.dropDatabase();
                } catch (e: any) {
                    error = e;
                }
                assert.strictEqual(error.message, 'Cannot drop database in Astra. Please use the Astra UI to drop the database.');
            } else {
                const connection: StargateMongooseDriver.Connection = mongooseInstance.connection as unknown as StargateMongooseDriver.Connection;
                const resp = await connection.dropDatabase();
                assert.strictEqual(resp.status?.ok, 1);
            }
            mongooseInstance.connection.getClient().close();
        });
        it('should createDatabase if not exists in createCollection call for non-AstraDB', async () => {
            const mongooseInstance = new mongoose.Mongoose();
            mongooseInstance.setDriver(StargateMongooseDriver);
            mongooseInstance.set('autoCreate', true);
            mongooseInstance.set('autoIndex', false);
            const options = isAstra ? { isAstra: true } : { username: process.env.STARGATE_USERNAME, password: process.env.STARGATE_PASSWORD };
            //split dbUri by / and replace last element with newKeyspaceName
            const dbUriSplit = dbUri.split('/');
            const token = parseUri(dbUri).applicationToken;
            const newKeyspaceName = 'new_keyspace';
            dbUriSplit[dbUriSplit.length - 1] = newKeyspaceName;
            let newDbUri = dbUriSplit.join('/');
            //if token is not null, append it to the new dbUri
            newDbUri = token ? newDbUri + '?applicationToken=' + token : newDbUri;
            // @ts-ignore - these are config options supported by stargate-mongoose but not mongoose
            await mongooseInstance.connect(newDbUri, options);
            if (isAstra) {
                let error: any;
                try {
                    await mongooseInstance.connection.createCollection('new_collection');
                } catch (e: any) {
                    error = e;
                }
                assert.strictEqual(error.errors[0].message, 'INVALID_ARGUMENT: Unknown keyspace ' + newKeyspaceName);
            } else {
                const connection: StargateMongooseDriver.Connection = mongooseInstance.connection as unknown as StargateMongooseDriver.Connection;
                const resp = await connection.createCollection('new_collection');
                assert.strictEqual(resp.status?.ok, 1);
            }
            mongooseInstance.connection.getClient().close();
        });
    });
});

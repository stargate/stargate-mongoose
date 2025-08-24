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
import sinon from 'sinon';
import * as AstraMongooseDriver from '../../src/driver';
import { testClient, TEST_COLLECTION_NAME } from '../fixtures';
import { CartModelType, ProductModelType, createMongooseCollections, testDebug } from '../mongooseFixtures';
import type { AstraMongoose } from '../../src';

describe('COLLECTIONS: driver based tests', async () => {
    let Product: ProductModelType;
    let Cart: CartModelType;
    let mongooseInstance: AstraMongoose;

    before(async function() {
        this.timeout(120_000);
        ({ Product, Cart, mongooseInstance } = await createMongooseCollections(false));
    });

    let dbUri: string;
    let isAstra: boolean;
    before(async function () {
        dbUri = testClient!.uri;
        isAstra = testClient!.isAstra;
    });
    describe('AstraMongoose - index', () => {
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

            const findOneAndReplaceResp = await Cart.findOneAndReplace({cartName: 'wewson'}, {
                name: 'My Cart 2',
                cartName: 'wewson1'
            }, {returnDocument: 'after'}).exec();
            assert.strictEqual(findOneAndReplaceResp!.name, 'My Cart 2');
            assert.strictEqual(findOneAndReplaceResp!.cartName, 'wewson1');

            const withMetadata = await Cart.findOneAndReplace(
                {cartName: 'wewson1'},
                {name: 'My Cart 3', cartName: 'wewson1'},
                {returnDocument: 'after', includeResultMetadata: true}
            ).exec();
            assert.strictEqual(withMetadata.value!.name, 'My Cart 3');
            assert.strictEqual(withMetadata.value!.cartName, 'wewson1');

            const productNames: string[] = [];
            const cursor = await Product.find().cursor();
            await cursor.eachAsync(p => productNames.push(p.name!));
            assert.deepEqual(productNames.sort(), ['Product 1', 'Product 2']);

            await cart.deleteOne();
            assert.strictEqual(await Cart.findOne({cartName: 'wewson'}), null);
        });
    });
    describe('Mongoose API', () => {
        const personSchema = new mongoose.Schema({
            name: { type: String, required: true }
        });
        let Person: mongoose.Model<mongoose.InferSchemaType<typeof personSchema>>;
        before(async function () {
            mongooseInstance.deleteModel(/Person/);
            Person = mongooseInstance.model('Person', personSchema, TEST_COLLECTION_NAME);

            const collectionNames = await mongooseInstance.connection.listCollections({ nameOnly: true });
            if (!collectionNames.includes(TEST_COLLECTION_NAME)) {
                await mongooseInstance.connection.createCollection(TEST_COLLECTION_NAME);
            }
        });

        after(async () => {
            await Person.deleteMany({});
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
            assert.throws(
                () => Person.watch([{$match: {name: 'John'}}]),
                /watch\(\) Not Implemented/
            );
        });

        it('handles listCollections()', async function() {
            const collections = await mongooseInstance!.connection.listCollections();
            const collectionNames = collections.map(({ name }) => name);
            assert.ok(typeof collectionNames[0] === 'string', collectionNames.join(','));
        });

        it('handles enableBigNumbers in collections', async function() {
            delete mongooseInstance.connection.collections[Product.collection.collectionName];
            const bigNumbersProductSchema = Product.schema.clone()
                .add({ price: BigInt })
                .set('serdes', { enableBigNumbers: () => 'number_or_string' });
            const BigNumbersProduct = mongooseInstance.model('BigNumbersProduct', bigNumbersProductSchema, Product.collection.collectionName);
            if (testDebug) {
                mongooseInstance.connection.collection(Product.collection.collectionName).collection.on('commandStarted', ev => {
                    console.log(ev.target.url, JSON.stringify(ev.command, null, '    '));
                });
            }

            const _id = new mongoose.Types.ObjectId();
            const collection = mongooseInstance.connection.db!.collection(
                Product.collection.collectionName,
                { serdes: { enableBigNumbers: () => 'number_or_string' } }
            );
            try {
                await collection.insertOne({
                    _id: _id.toString(),
                    name: 'Very expensive product',
                    // MAX_SAFE_INTEGER + 8
                    price: BigInt('9007199254740999')
                });

                const rawDoc = await collection.findOne({ _id: _id.toString() });
                assert.strictEqual(rawDoc!.price, '9007199254740999');

                const mongooseDoc = await BigNumbersProduct.findOne({ _id }).orFail();
                assert.strictEqual(mongooseDoc.price, BigInt('9007199254740999'));
            } finally {
                // Make sure to clean up the collection so we don't have the `serdes` option leaking to other tests
                delete mongooseInstance.connection.collections[Product.collection.collectionName];
            }
        });

        it('handles debug mode', async () => {
            const calls: string[] = [];
            mongooseInstance.set('debug', (collectionName: string, fnName: string) => calls.push(`${collectionName}.${fnName}`));
            await Person.findOne({});
            assert.deepStrictEqual(calls, ['collection1.findOne']);
        });
    });
    describe('namespace management tests', () => {
        it('should fail when dropDatabase is called', async () => {
            const mongooseInstance = new mongoose.Mongoose();
            mongooseInstance.setDriver(AstraMongooseDriver);
            mongooseInstance.set('autoCreate', false);
            mongooseInstance.set('autoIndex', false);
            const options = isAstra
                ? {}
                : { isAstra: false, username: process.env.STARGATE_USERNAME, password: process.env.STARGATE_PASSWORD };

            await mongooseInstance.connect(dbUri, options);

            await assert.rejects(
                () => mongooseInstance.connection.dropDatabase(),
                { message: 'dropDatabase() Not Implemented' }
            );
            mongooseInstance.connection.getClient().close();
        });
    });

    it('allows setting fetcher option', async () => {
        const mongooseInstance = new mongoose.Mongoose().setDriver(AstraMongooseDriver);
        mongooseInstance.set('autoCreate', false);
        mongooseInstance.set('autoIndex', false);
        const httpOptions = {
            client: 'custom',
            fetcher: {
                fetch: sinon.stub().callsFake(() => Promise.resolve({
                    body: JSON.stringify({ status: { collections: ['testabc', 'testdef'] } })
                }))
            }
        } as const;
        const options = isAstra
            ? { httpOptions }
            : { httpOptions, isAstra: false, username: process.env.STARGATE_USERNAME, password: process.env.STARGATE_PASSWORD };

        await mongooseInstance.connect(dbUri, options);
        const res = await mongooseInstance.connection.listCollections({ nameOnly: true });
        assert.ok(httpOptions.fetcher.fetch.calledOnce);
        assert.deepStrictEqual(res, ['testabc', 'testdef']);
    });
});

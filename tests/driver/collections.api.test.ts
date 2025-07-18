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
import {
    testClient,
    TEST_COLLECTION_NAME
} from '../fixtures';
import mongoose, { Schema, InferSchemaType, InsertManyResult, Model } from 'mongoose';
import { once } from 'events';
import * as AstraMongooseDriver from '../../src/driver';
import {randomUUID} from 'crypto';
import {OperationNotSupportedError} from '../../src/driver';
import { CartModelType, ProductModelType, productSchema, ProductRawDoc, createMongooseCollections, testDebug } from '../mongooseFixtures';
import { parseUri } from '../../src/driver/connection';
import { FindCursor, DataAPIResponseError } from '@datastax/astra-db-ts';
import { Long, UUID } from 'bson';
import type { AstraMongoose } from '../../src';

describe('COLLECTIONS: mongoose Model API level tests with collections', async () => {
    let Product: ProductModelType;
    let Cart: CartModelType;
    let mongooseInstance: AstraMongoose;

    before(async function() {
        this.timeout(120_000);
        ({ Product, Cart, mongooseInstance } = await createMongooseCollections(false));
    });

    afterEach(async () => {
        await Promise.all([Product.deleteMany({}), Cart.deleteMany({})]);
    });

    describe('Options & Data type tests', () => {
        it('test strict and strictQuery options', async () => {
            //strict is true, so extraCol should not be saved
            const saveResponseWithStrictTrue = await new Product({
                name: 'Product 1',
                price: 10,
                isCertified: true,
                category: 'cat 1',
                extraCol: 'extra val'
            }, null, {
                strict: true
            }).save();
            const savedRow = await Product.findById(saveResponseWithStrictTrue._id).orFail();
            assert.strictEqual(savedRow.name, 'Product 1');
            assert.strictEqual(savedRow.price, 10);
            assert.strictEqual(savedRow.isCertified, true);
            assert.strictEqual(savedRow.category, 'cat 1');
            // @ts-expect-error extraCol isn't in schema
            assert.strictEqual(savedRow.extraCol, undefined);
            //strict is false, so extraCol should be saved
            const saveResponseWithStrictFalse = await new Product({
                name: 'Product 1',
                price: 10,
                isCertified: true,
                category: 'cat 1',
                extraCol: 'extra val1'
            }, null, {
                strict: false
            }).save();
            const savedRowWithStrictFalse = await Product.findById(saveResponseWithStrictFalse._id).orFail();
            assert.strictEqual(savedRowWithStrictFalse.name, 'Product 1');
            assert.strictEqual(savedRowWithStrictFalse.price, 10);
            assert.strictEqual(savedRowWithStrictFalse.isCertified, true);
            assert.strictEqual(savedRowWithStrictFalse.category, 'cat 1');
            //to access extraCol, we need to use get method since it is not part of schema
            assert.strictEqual(savedRowWithStrictFalse.get('extraCol'), 'extra val1');
            //since strictQuery is true, extraCol will be removed from filter, so all docs will be returned
            const findResponse = await Product.find({
                category: 'cat 1',
                extraCol: 'extra val1'
            }, null, {strictQuery: true});
            assert.strictEqual(findResponse.length, 2);
            const findResponseWithStrictQueryFalse = await Product.find({
                category: 'cat 1',
                extraCol: 'extra val1'
            }, null, {strictQuery: false});
            assert.strictEqual(findResponseWithStrictQueryFalse.length, 1);
            assert.strictEqual(findResponseWithStrictQueryFalse[0].get('extraCol'), 'extra val1');
            assert.strictEqual(findResponseWithStrictQueryFalse[0].name, 'Product 1');
        });
        it('Data type tests', async function() {
            const modelName = 'User';
            const userSchema = new mongoose.Schema({
                name: String,
                age: Number,
                dob: Date,
                isCertified: Boolean,
                mixedData: mongoose.Schema.Types.Mixed,
                employee: mongoose.Schema.Types.ObjectId,
                friends: [String],
                salary: mongoose.Schema.Types.Decimal128,
                favorites: Map,
                nestedSchema: {
                    address: {
                        street: String,
                        city: String,
                        state: String
                    }
                },
                uniqueId: Schema.Types.UUID,
                category: BigInt,
                documentArray: [{ name: String }],
                buf: Buffer,
                long: BigInt,
                willBeNull: String
            });
            const User = mongooseInstance.model(modelName, userSchema, TEST_COLLECTION_NAME);
            const collectionNames = await mongooseInstance.connection.listCollections({ nameOnly: true });
            if (!collectionNames.includes(TEST_COLLECTION_NAME)) {
                await User.createCollection();
            } else {
                await User.deleteMany({});
            }
            if (testDebug) {
                mongooseInstance.connection.collection(TEST_COLLECTION_NAME).collection.on('commandStarted', ev => {
                    console.log(ev.target.url, JSON.stringify(ev.command, null, '    '));
                });
            }
            const employeeIdVal = new mongoose.Types.ObjectId();
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
                salary: mongoose.Types.Decimal128.fromString('100.25'),
                favorites: new Map([['food', 'pizza'], ['drink', 'cola']]),
                nestedSchema: {
                    address: {
                        street: 'street 1',
                        city: 'city 1',
                        state: 'state 1'
                    }
                },
                uniqueId: new UUID(uniqueIdVal),
                category: BigInt(100),
                documentArray: [{ name: 'test document array' }],
                buf: Buffer.from('hello', 'utf8'),
                long: new Long(99n),
                willBeNull: null
            }).save();
            assert.strictEqual(saveResponse.name, 'User 1');
            assert.strictEqual(saveResponse.age, 10);
            assert.strictEqual(saveResponse.dob!.toISOString(), dobVal.toISOString());
            assert.strictEqual(saveResponse.isCertified, true);
            assert.strictEqual(saveResponse.mixedData.a, 1);
            assert.strictEqual(saveResponse.mixedData.b, 'test');
            assert.strictEqual(saveResponse.employee!.toString(), employeeIdVal.toString());
            assert.strictEqual(saveResponse.friends[0], 'friend 1');
            assert.strictEqual(saveResponse.friends[1], 'friend 2');
            assert.strictEqual(saveResponse.salary!.toString(), '100.25');
            assert.strictEqual(saveResponse.favorites!.get('food'), 'pizza');
            assert.strictEqual(saveResponse.favorites!.get('drink'), 'cola');
            assert.strictEqual(saveResponse.nestedSchema!.address!.street, 'street 1');
            assert.strictEqual(saveResponse.nestedSchema!.address!.city, 'city 1');
            assert.strictEqual(saveResponse.nestedSchema!.address!.state, 'state 1');
            assert.strictEqual(saveResponse.uniqueId!.toString(), uniqueIdVal.toString());
            assert.strictEqual(saveResponse.category!.toString(), '100');
            assert.strictEqual(saveResponse.documentArray[0].name, 'test document array');
            assert.strictEqual(saveResponse.buf!.toString('utf8'), 'hello');
            assert.strictEqual(saveResponse.long!.toString(), '99');
            assert.strictEqual(saveResponse.willBeNull, null);
            //get record using findOne and verify results
            const findOneResponse = await User.findOne({name: 'User 1'}).orFail();
            assert.strictEqual(findOneResponse.name, 'User 1');
            assert.strictEqual(findOneResponse.age, 10);
            assert.strictEqual(findOneResponse.dob!.toISOString(), dobVal.toISOString());
            assert.strictEqual(findOneResponse.isCertified, true);
            assert.strictEqual(findOneResponse.mixedData.a, 1);
            assert.strictEqual(findOneResponse.mixedData.b, 'test');
            assert.strictEqual(findOneResponse.employee!.toString(), employeeIdVal.toString());
            assert.strictEqual(findOneResponse.friends[0], 'friend 1');
            assert.strictEqual(findOneResponse.friends[1], 'friend 2');
            assert.strictEqual(findOneResponse.salary!.toString(), '100.25');
            assert.strictEqual(findOneResponse.favorites!.get('food'), 'pizza');
            assert.strictEqual(findOneResponse.favorites!.get('drink'), 'cola');
            assert.strictEqual(findOneResponse.nestedSchema!.address!.street, 'street 1');
            assert.strictEqual(findOneResponse.nestedSchema!.address!.city, 'city 1');
            assert.strictEqual(findOneResponse.nestedSchema!.address!.state, 'state 1');
            assert.strictEqual(findOneResponse.uniqueId!.toString(), uniqueIdVal.toString());
            assert.strictEqual(findOneResponse.category!.toString(), '100');
            assert.strictEqual(findOneResponse.documentArray[0].name, 'test document array');
            assert.strictEqual(findOneResponse.buf!.toString('utf8'), 'hello');
            assert.strictEqual(findOneResponse.long!.toString(), '99');
            assert.strictEqual(findOneResponse.willBeNull, null);
        });
    });
    describe('API tests', () => {
        it('API ops tests Model()', async () => {
            //Model()
            const product1 = new Product({name: 'Product 1', price: 10, isCertified: true, category: 'cat 1'});
            assert.strictEqual(product1.name, 'Product 1');
        });
        it('API ops tests Model.$where()', async () => {
            //Mode.$where()
            const product1 = new Product({name: 'Product 1', price: 10, isCertified: true, category: 'cat 1'});
            await product1.save();
            const error: Error | null = await Product.$where('this.name === "Product 1"').exec().then(() => null, error => error);
            assert.ok(error instanceof DataAPIResponseError);
            assert.strictEqual(error.errorDescriptors[0].message, 'Invalid filter expression: filter clause path (\'$where\') cannot start with `$`');
        });
        it('API ops tests db.dropCollection() and Model.createCollection()', async function() {
            this.timeout(120_000);

            let collections = await Product.db.listCollections().then(collections => collections.map(coll => coll.name));
            assert.ok(collections.includes(Product.collection.collectionName));

            await Product.db.db!.dropCollection(Product.collection.collectionName);
            collections = await Product.db.listCollections().then(collections => collections.map(coll => coll.name));
            assert.ok(!collections.includes(Product.collection.collectionName));

            await Product.createCollection();
            collections = await Product.db.listCollections().then(collections => collections.map(coll => coll.name));
            assert.ok(collections.includes(Product.collection.collectionName));
        });
        it('API ops tests Model.aggregate()', async () => {
            //Model.aggregate()
            const error: Error | null = await Product.aggregate([{$match: {name: 'Product 1'}}]).then(() => null, error => error);
            assert.ok(error instanceof OperationNotSupportedError);
            assert.strictEqual(error.message, 'aggregate() Not Implemented');
            //----------------//
        });
        //Model.applyDefaults is skipped, because it is not making any db calls
        //TODO - Skipping /node_modules/mongoose/lib/model.js:3442:74
        //Model.bulkSave() error:  TypeError: Cannot read properties of undefined (reading 'find')
        it('API ops tests Model.bulkSave()', async () => {
            const product2 = new Product({name: 'Product 2', price: 20, isCertified: true, category: 'cat 2'});
            const product3 = new Product({name: 'Product 3', price: 30, isCertified: true, category: 'cat 3'});
            await assert.rejects(
                Product.bulkSave([product2, product3]),
                { message: 'bulkWrite() Not Implemented' }
            );
        });
        it('API ops tests Model.bulkWrite()', async () => {
            const product2 = new Product({name: 'Product 2', price: 20, isCertified: true, category: 'cat 2'});
            const product3 = new Product({name: 'Product 3', price: 30, isCertified: true, category: 'cat 3'});
            await assert.rejects(
                Product.bulkWrite([{insertOne: {document: product2}}, {insertOne: {document: product3}}]),
                { message: 'bulkWrite() Not Implemented' }
            );
        });
        //castObject skipped as it is not making any database calls
        it('API ops tests Model.cleanIndexes()', async function() {
            const promise = Product.cleanIndexes();
            const error: Error | null = await promise.then(() => null, (error: Error) => error);
            assert.ok(error instanceof OperationNotSupportedError);
            //cleanIndexes invokes listIndexes() which is not supported
            assert.strictEqual(error.message, 'Cannot use listIndexes() with collections');
        });
        it('API ops tests Model.countDocuments()', async function() {
            const product1 = new Product({name: 'Product 1', price: 10, isCertified: true, category: 'cat 1'});
            await product1.save();
            const countResp = await Product.countDocuments({name: 'Product 1'});
            assert.strictEqual(countResp, 1);
        });
        it('API ops tests Model.create()', async () => {
            const createResp = await Product.create({
                name: 'Product for create',
                price: 10,
                isCertified: true,
                category: 'cat 1'
            });
            assert.strictEqual(createResp.name, 'Product for create');
        });
        it('API ops tests Model.createCollection()', async function() {
            await Product.createCollection();
        });
        it('API ops tests Model.createIndexes()', async () => {
            await assert.rejects(
                async () => {
                    Product.schema.index({name: 1});
                    await Product.createIndexes();
                },
                { message: 'Cannot use createIndex() with collections' }
            );
        });
        it('API ops tests Model.db', async () => {
            const conn = Product.db as unknown as AstraMongooseDriver.Connection;
            assert.strictEqual(conn.keyspaceName, parseUri(testClient!.uri).keyspaceName);
            assert.strictEqual(conn.db!.name, parseUri(testClient!.uri).keyspaceName);
        });
        it('API ops tests Model.deleteMany()', async function() {
            const product1 = new Product({name: 'Product 1', price: 10, isCertified: true, category: 'cat 1'});
            await product1.save();
            let deleteManyResp = await Product.deleteMany({name: 'Product 1'});
            assert.strictEqual(deleteManyResp.deletedCount, 1);
            const findDeletedDoc = await Product.findOne({name: 'Product 1'});
            assert.strictEqual(findDeletedDoc, null);

            for (let i = 0; i < 51; ++i) {
                await Product.create({ name: `Product ${i}` });
            }
            deleteManyResp = await Product.deleteMany({});
            // Deleted an unknown number of rows
            assert.strictEqual(deleteManyResp.deletedCount, -1);

            const count = await Product.countDocuments();
            assert.strictEqual(count, 0);
        });
        it('API ops tests Model.deleteOne()', async () => {
            const product1 = new Product({name: 'Product 1', price: 10, isCertified: true, category: 'cat 1'});
            await product1.save();
            const deleteOneResp = await Product.deleteOne({_id: product1._id});
            const findDeletedDoc = await Product.findOne({name: 'Product 1'});
            assert.strictEqual(deleteOneResp.deletedCount, 1);
            assert.strictEqual(findDeletedDoc, null);
        });
        it('API ops tests Model.diffIndexes()', async () => {
            const error: Error | null = await Product.diffIndexes().then(() => null, error => error);
            assert.ok(error);
            assert.ok(error instanceof OperationNotSupportedError);
            assert.strictEqual(error.message, 'Cannot use listIndexes() with collections');
        });
        it('API ops tests Model.discriminator()', async () => {
            //Online products have URL
            const OnlineProduct = Product.discriminator<InferSchemaType<typeof productSchema> & { url: string }>(
                'OnlineProduct',
                new Schema({url: String}),
                { overwriteModels: true }
            );
            const regularProduct = new Product({
                name: 'Product 1',
                price: 10,
                isCertified: true,
                category: 'cat 1',
                url: 'http://product1.com'
            });
            // @ts-expect-error url is not defined in the schema
            assert.ok(!regularProduct.url);
            await regularProduct.save();
            const regularProductSaved = await Product.findOne({name: 'Product 1'}).orFail();
            assert.strictEqual(regularProductSaved.name, 'Product 1');
            assert.strictEqual(regularProductSaved.price, 10);
            assert.strictEqual(regularProductSaved.isCertified, true);
            assert.strictEqual(regularProductSaved.category, 'cat 1');
            // @ts-expect-error url is not defined in the schema
            assert.ok(!regularProductSaved.url);
            const onlineProduct = new OnlineProduct({
                name: 'Product 2',
                price: 10,
                isCertified: true,
                category: 'cat 1',
                url: 'http://product1.com'
            });
            await onlineProduct.save();
            const onlineProductSaved = await OnlineProduct.findOne({name: 'Product 2'});
            assert.strictEqual(onlineProductSaved!.name, 'Product 2');
            assert.strictEqual(onlineProductSaved!.price, 10);
            assert.strictEqual(onlineProductSaved!.isCertified, true);
            assert.strictEqual(onlineProductSaved!.category, 'cat 1');
            assert.ok(onlineProduct.url);
        });
        it('API ops tests Model.distinct()', async () => {
            const product1 = new Product({name: 'Product 1', price: 10, isCertified: true, category: 'cat 1'});
            const product2 = new Product({name: 'Product 2', price: 10, isCertified: true, category: 'cat 2'});
            const product3 = new Product({name: 'Product 3', price: 10, isCertified: true, category: 'cat 1'});
            await Product.insertMany([product1, product2, product3]);
            const err: Error | null = await Product.distinct('category').exec().then(() => null, error => error);
            assert.ok(err instanceof OperationNotSupportedError);
            assert.strictEqual(err.message, 'distinct() Not Implemented');
        });

        it('API ops tests Model.estimatedDocumentCount()', async function() {
            const product1 = new Product({name: 'Product 1', price: 10, isCertified: true, category: 'cat 1'});
            const product2 = new Product({name: 'Product 2', price: 10, isCertified: true, category: 'cat 2'});
            const product3 = new Product({name: 'Product 3', price: 10, isCertified: true, category: 'cat 1'});
            await Product.create([product1, product2, product3]);

            const count = await Product.estimatedDocumentCount();
            assert.equal(typeof count, 'number');
            assert.ok(count >= 0);
        });
        //skipping Model.events() as it is not making any database calls
        it('API ops tests Model.exists()', async () => {
            const product1 = new Product({name: 'Product 1', price: 10, isCertified: true, category: 'cat 1'});
            await product1.save();
            const existsResp = await Product.exists({name: 'Product 1'});
            assert.ok(existsResp);
        });
        it('API ops tests Model.find()', async () => {
            const product1 = new Product({name: 'Product 1', price: 10, isCertified: true, category: 'cat 1'});
            const product2 = new Product({name: 'Product 2', price: 10, isCertified: true, category: 'cat 2'});
            const product3 = new Product({name: 'Product 3', price: 10, isCertified: true, category: 'cat 1'});
            await Product.insertMany([product1, product2, product3]);
            const findResp = await Product.find({category: 'cat 1'});
            assert.strictEqual(findResp.length, 2);
            const nameArray: Set<string> = new Set(['Product 1', 'Product 3']);
            for(const doc of findResp) {
                assert.strictEqual(doc.category, 'cat 1');
                assert.ok(doc.name);
                assert.strictEqual(nameArray.has(doc.name), true);
                nameArray.delete(doc.name);
            }

            // Supports callbacks because some older versions of Mongoose require callbacks.
            /*await new Promise((resolve, reject) => {

            });*/
        });
        it('API ops tests Model.findById()', async () => {
            const product1 = new Product({name: 'Product 1', price: 10, isCertified: true, category: 'cat 1'});
            await product1.save();
            const findResp = await Product.findById(product1._id);
            assert.strictEqual(findResp?.name, 'Product 1');
        });
        it('API ops tests Model.findByIdAndDelete()', async function() {
            const product1 = new Product({name: 'Product 1', price: 10, isCertified: true, category: 'cat 1'});
            await product1.save();
            const deleteResp = await Product.findByIdAndDelete(product1._id);
            assert.strictEqual(deleteResp?.name, 'Product 1');
            const findDeletedDoc = await Product.findById(product1._id);
            assert.strictEqual(findDeletedDoc, null);
        });
        it('API ops tests Model.findByIdAndUpdate()', async function() {
            const product1 = new Product({name: 'Product 1', price: 10, isCertified: true, category: 'cat 1', url: 'http://product1.com'});
            await product1.save();
            const updateResp = await Product.findByIdAndUpdate(product1._id, {name: 'Product 2'});
            assert.strictEqual(updateResp?.name, 'Product 1');
            const findUpdatedDoc = await Product.findById(product1._id);
            assert.strictEqual(findUpdatedDoc?.name, 'Product 2');
        });
        it('API ops tests Model.findOne()', async () => {
            const product1 = new Product({name: 'Product 1', price: 10, isCertified: true, category: 'cat 2'});
            const product2 = new Product({name: 'Product 2', price: 10, isCertified: true, category: 'cat 2'});
            const product3 = new Product({name: 'Product 3', price: 10, isCertified: true, category: 'cat 1'});
            await Product.insertMany([product1, product2, product3]);
            const findResp = await Product.findOne({category: 'cat 1'});
            assert.strictEqual(findResp?.category, 'cat 1');
        });
        it('API ops tests Model.findOneAndDelete()', async function() {
            const product1 = new Product({name: 'Product 1', price: 10, isCertified: true, category: 'cat 2'});
            const product2 = new Product({name: 'Product 2', price: 10, isCertified: true, category: 'cat 2'});
            const product3 = new Product({name: 'Product 3', price: 10, isCertified: true, category: 'cat 1'});
            await Product.insertMany([product1, product2, product3]);
            const deleteResp = await Product.findOneAndDelete({category: 'cat 1'});
            assert.strictEqual(deleteResp?.category, 'cat 1');
            //check if it exists again
            const findDeletedDoc = await Product.findOne({category: 'cat 1'});
            assert.strictEqual(findDeletedDoc, null);

            const withMetadata = await Product.findOneAndDelete(
                {name: 'Product 1'},
                {includeResultMetadata: true}
            );
            assert.strictEqual(withMetadata.value!.name, 'Product 1');
            assert.strictEqual(withMetadata.value!.category, 'cat 2');
        });
        it('API ops tests Model.findOneAndReplace()', async function() {
            const product1 = new Product({name: 'Product 1', price: 10, isCertified: true, category: 'cat 2'});
            const product2 = new Product({name: 'Product 2', price: 10, isCertified: true, category: 'cat 2'});
            const product3 = new Product({name: 'Product 3', price: 10, isCertified: true, category: 'cat 1'});
            await Product.insertMany([product1, product2, product3]);
            const replaceResp = await Product.findOneAndReplace({category: 'cat 1'}, {name: 'Product 17'}, {returnDocument: 'after'});
            assert.strictEqual(replaceResp!.category, undefined);
            assert.strictEqual(replaceResp!.name, 'Product 17');

            const withMetadata = await Product.findOneAndReplace(
                {name: 'Product 17'},
                { category: 'cat 3', name: 'Product 18'},
                {includeResultMetadata: true, returnDocument: 'after'}
            );
            assert.strictEqual(withMetadata.value!.name, 'Product 18');
            assert.strictEqual(withMetadata.value!.category, 'cat 3');

            let doc = await Product.findOneAndReplace({_id: product2._id}, {name: 'Product 19'}, {returnDocument: 'after'});
            assert.strictEqual(doc!.name, 'Product 19');
            assert.strictEqual(doc!.category, undefined);

            doc = await Product.findOneAndReplace({name: 'Product 19'}, {_id: product2._id, name: 'Product 20'}, {returnDocument: 'after', upsert: true});
            assert.strictEqual(doc!.name, 'Product 20');
            assert.strictEqual(doc!.category, undefined);

            doc = await Product.findOneAndReplace({_id: doc!._id}, {name: 'Product 21'}, {returnDocument: 'after', upsert: true});
            assert.strictEqual(doc!.name, 'Product 21');
            assert.strictEqual(doc!.category, undefined);
        });
        it('API ops tests Model.findOneAndUpdate()', async function() {
            const product1 = new Product({name: 'Product 1', price: 10, isCertified: true, category: 'cat 2'});
            const product2 = new Product({name: 'Product 2', price: 10, isCertified: true, category: 'cat 2'});
            const product3 = new Product({name: 'Product 3', price: 10, isCertified: true, category: 'cat 1'});
            await Product.insertMany([product1, product2, product3]);
            const updateResp = await Product.findOneAndUpdate({category: 'cat 1'}, {name: 'Product 4'});
            assert.strictEqual(updateResp?.category, 'cat 1');
            const findOneResp = await Product.findOne({category: 'cat 1'});
            assert.strictEqual(findOneResp?.name, 'Product 4');

            const withMetadata = await Product.findOneAndUpdate(
                {category: 'cat 1'},
                {name: 'Product 42'},
                {includeResultMetadata: true, returnDocument: 'after'}
            );
            assert.strictEqual(withMetadata.value!.name, 'Product 42');
        });
        it('API ops tests Model.insertMany()', async () => {
            const product1Id = new mongoose.Types.ObjectId('0'.repeat(24));
            const product2Id = new mongoose.Types.ObjectId('1'.repeat(24));
            const product3Id = new mongoose.Types.ObjectId('2'.repeat(24));
            const product1 = {_id: product1Id, name: 'Product 1', price: 10, isCertified: true, category: 'cat 2'};
            const product2 = {_id: product2Id, name: 'Product 2', price: 10, isCertified: true, category: 'cat 2'};
            const product3 = {_id: product3Id, name: 'Product 3', price: 10, isCertified: true, category: 'cat 1'};
            const insertResp: InsertManyResult<unknown> = await Product.insertMany([product1, product2, product3] , {ordered: true, rawResult: true});
            assert.strictEqual(insertResp.insertedCount, 3);

            let docs = [];
            for (let i = 0; i < 21; ++i) {
                docs.push({ name: 'Test product ' + i, price: 10, isCertified: true });
            }
            const respOrdered: InsertManyResult<unknown> = await Product.insertMany(docs, { rawResult: true  });
            assert.strictEqual(respOrdered.insertedCount, 21);

            docs = [];
            for (let i = 0; i < 21; ++i) {
                docs.push({ name: 'Test product ' + i, price: 10, isCertified: true });
            }
            const respUnordered: InsertManyResult<unknown> = await Product.insertMany(docs, { ordered: false, rawResult: true });
            assert.strictEqual(respUnordered.insertedCount, 21);
        });
        //Model.inspect can not be tested since it is a helper for console logging. More info here: https://mongoosejs.com/docs/api/model.html#Model.inspect()
        it('API ops tests Model.listIndexes()', async () => {
            const error: Error | null = await Product.listIndexes().then(() => null, error => error);
            assert.ok(error instanceof OperationNotSupportedError);
            assert.strictEqual(error?.message, 'Cannot use listIndexes() with collections');
        });
        it('API ops tests Model.populate()', async () => {
            const product1 = new Product({name: 'Product 1', price: 10, isCertified: true, category: 'cat 2'});
            const product2 = new Product({name: 'Product 2', price: 10, isCertified: true, category: 'cat 2'});
            const product3 = new Product({name: 'Product 3', price: 10, isCertified: true, category: 'cat 1'});
            await Product.insertMany([product1, product2, product3]);
            const cart1 = new Cart({name: 'Cart 1', products: [product1._id, product2._id]});
            await Cart.insertMany([cart1]);

            type CartModel = ReturnType<(typeof Cart)['hydrate']>;
            const populateResp = await Cart.findOne({name: 'Cart 1'}).populate<{ products: CartModel[] }>('products');
            assert.strictEqual(populateResp?.products.length, 2);
            assert.strictEqual(populateResp?.products[0].name, 'Product 1');
            assert.strictEqual(populateResp?.products[1].name, 'Product 2');
        });
        it('API ops tests Model.prototype.deleteOne()', async () => {
            const product1 = new Product({name: 'Product 1', price: 10, isCertified: true, category: 'cat 1'});
            await product1.save();
            const docSaved = await Product.findOne({name: 'Product 1'});
            assert.strictEqual(docSaved!.name, 'Product 1');
            await product1.deleteOne();
            const findDeletedDoc = await Product.findOne({name: 'Product 1'});
            assert.strictEqual(findDeletedDoc, null);
        });
        it('API ops tests Model.replaceOne()', async function() {
            const product1 = new Product({name: 'Product 1', price: 10, isCertified: true, category: 'cat 2'});
            const product2 = new Product({name: 'Product 2', price: 10, isCertified: true, category: 'cat 2'});
            const product3 = new Product({name: 'Product 3', price: 10, isCertified: true, category: 'cat 1'});
            await Product.insertMany([product1, product2, product3]);
            const resp = await Product.replaceOne({category: 'cat 1'}, {name: 'Product 4'});
            assert.equal(resp.modifiedCount, 1);

            const doc = await Product.findOne({name: 'Product 4'});
            assert.ok(doc);
            assert.strictEqual(doc.category, undefined);

            await Product.replaceOne({category: 'cat 2'}, {name: 'Product 5', category: 'cat 3'}, {sort:{name: 1}});
            const cat2 = await Product.findOne({category: 'cat 2'}).orFail();
            assert.equal(cat2.name, 'Product 2');
            const replaced = await Product.findOne({name: 'Product 5'}).orFail();
            assert.equal(replaced.category, 'cat 3');
        });
        //Model.schema() is skipped since it doesn't make any database calls. More info here: https://mongoosejs.com/docs/api/model.html#Model.schema
        it('API ops tests Model.startSession()', async () => {
            const product1 = new Product({name: 'Product 1', price: 10, isCertified: true, category: 'cat 2'});
            const product2 = new Product({name: 'Product 2', price: 10, isCertified: true, category: 'cat 2'});
            const product3 = new Product({name: 'Product 3', price: 10, isCertified: true, category: 'cat 1'});
            await Product.insertMany([product1, product2, product3]);
            assert.throws(() => Product.startSession(), { message: 'startSession() Not Implemented' });
        });
        it('API ops tests Model.syncIndexes()', async () => {
            const error: Error | null = await Product.syncIndexes().then(() => null, error => error);
            assert.ok(error instanceof OperationNotSupportedError);
            //since listIndexes is invoked before syncIndexes, the error message will be related to listIndexes
            assert.strictEqual(error?.message, 'Cannot use listIndexes() with collections');
        });
        //Mode.translateAliases is skipped since it doesn't make any database calls. More info here: https://mongoosejs.com/docs/api/model.html#Model.translateAliases
        it('API ops tests Model.updateMany()', async function() {
            const product1 = new Product({name: 'Product 1', price: 10, isCertified: true, category: 'cat 2'});
            const product2 = new Product({name: 'Product 2', price: 10, isCertified: true, category: 'cat 2'});
            const product3 = new Product({name: 'Product 3', price: 10, isCertified: true, category: 'cat 1'});
            await Product.insertMany([product1, product2, product3]);
            //updateMany
            const updateManyResp: mongoose.UpdateWriteOpResult = await Product.updateMany({category: 'cat 2'}, {category: 'cat 3'});
            assert.strictEqual(updateManyResp.matchedCount, 2);
            assert.strictEqual(updateManyResp.modifiedCount, 2);
            assert.strictEqual(updateManyResp.upsertedCount, 0);
            const findUpdatedDocs = await Product.find({category: 'cat 3'});
            assert.strictEqual(findUpdatedDocs.length, 2);
            const productNames: Set<string> = new Set();
            findUpdatedDocs.forEach((doc) => {
                productNames.add(doc.name ?? '');
            });
            assert.strictEqual(productNames.size, 2);
            assert.strictEqual(productNames.has('Product 1'), true);
            productNames.delete('Product 1');
            assert.strictEqual(productNames.has('Product 2'), true);
            productNames.delete('Product 2');
        });
        it('API ops tests Model.updateOne()', async () => {
            const product1 = new Product({name: 'Product 1', price: 10, isCertified: true, category: 'cat 2'});
            const product2 = new Product({name: 'Product 2', price: 10, isCertified: true, category: 'cat 2'});
            const product3 = new Product({name: 'Product 3', price: 10, isCertified: true, category: 'cat 1'});
            await Product.insertMany([product1, product2, product3]);
            const updateOneResp: mongoose.UpdateWriteOpResult = await Product.updateOne({category: 'cat 1'}, {category: 'cat 3'});
            assert.strictEqual(updateOneResp.matchedCount, 1);
            assert.strictEqual(updateOneResp.modifiedCount, 1);
            assert.strictEqual(updateOneResp.upsertedCount, 0);
            const findUpdatedDoc = await Product.findOne({category: 'cat 3'});
            assert.strictEqual(findUpdatedDoc?.name, 'Product 3');
        });
        it('API ops tests Model.updateOne() with upsert', async function() {
            const _id = new mongoose.Types.ObjectId();
            await Product.updateOne({ _id }, { name: 'Product upsert' }, { upsert: true });
            let doc = await Product.findOne({ _id }).orFail();
            assert.strictEqual(doc.name, 'Product upsert');

            await Product.updateOne(
                { name: 'test product 1' },
                { $set: { name: 'Product upsert 2', price: 16 } },
                { upsert: true, setDefaultsOnInsert: false }
            );
            doc = await Product.findOne({ name: 'Product upsert 2' }).orFail();
            assert.strictEqual(doc.name, 'Product upsert 2');
            assert.strictEqual(doc.price, 16);
        });
        it('API ops tests Model.updateOne() $push document array', async function() {
            const product1 = new Product({
                name: 'Product 1',
                price: 10,
                isCertified: true,
                category: 'cat 2',
                tags: [{ name: 'Electronics' }]
            });
            await Product.create(product1);
            //UpdateOne
            await Product.updateOne({ _id: product1._id }, { $push: { tags: { name: 'Home & Garden' } } });

            const { tags } = await Product.findById(product1._id).orFail();
            assert.ok(Array.isArray(tags));
            assert.deepStrictEqual(tags.toObject(), [{ name: 'Electronics' }, { name: 'Home & Garden' }]);
        });
        it('API ops tests Model.updateOne() $set subdocument', async () => {
            const cart = new Cart({
                user: {
                    name: 'test set subdocument'
                }
            });
            await cart.save();
            //UpdateOne
            await Cart.updateOne({ _id: cart._id }, { $set: { user: { name: 'test updated subdoc' } } });

            const doc = await Cart.findById(cart._id).orFail();
            assert.deepStrictEqual(doc.toObject().user, { name: 'test updated subdoc' });
        });
        //Model.validate is skipped since it doesn't make any database calls. More info here: https://mongoosejs.com/docs/api/model.html#Model.validate
        it('API ops tests Model.watch()', async () => {
            const product1 = new Product({name: 'Product 1', price: 10, isCertified: true, category: 'cat 2'});
            await product1.save();
            assert.throws(
                () => Product.watch().on('change', (change) => {
                    assert.strictEqual(change.operationType, 'delete');
                    assert.strictEqual(change.documentKey._id.toString(), product1._id.toString());
                }),
                { message: 'watch() Not Implemented' }
            );
        });
        it('API ops tests Model.where()', async () => {
            const product1 = new Product({name: 'Product 1', price: 10, isCertified: true, category: 'cat 2'});
            await product1.save();
            const whereResp = await Product.where('name').equals('Product 1');
            assert.strictEqual(whereResp.length, 1);
            assert.strictEqual(whereResp[0].name, 'Product 1');
        });
        it('API ops tests Query cursor', async () => {
            await Product.create(
                // Product 01 -> Product 25
                Array.from({ length: 25 }, (_, index) => ({
                    name: `Product ${(index + 1).toString().padStart(2, '0')}`,
                    price: 10
                }))
            );

            let cursor = Product.find().sort({ name: 1 }).cursor();
            for (let i = 0; i < 20; ++i) {
                const product = await cursor.next();
                assert.equal(product?.name, `Product ${(i + 1).toString().padStart(2, '0')}`, 'Failed at index ' + i);
            }
            assert.equal(await cursor.next(), null);

            cursor = await Product.find().sort({ name: 1 }).limit(20).cursor();
            for (let i = 0; i < 20; ++i) {
                await cursor.next();
            }
            assert.equal(await cursor.next(), null);
        });
        it('API ops tests Model.db.collection()', async () => {
            const product1 = new Product({name: 'Product 1', price: 10, isCertified: true, category: 'cat 2'});
            await product1.save();
            const res = await mongooseInstance.connection.collection<ProductRawDoc>('products').findOne({});
            assert.equal(res!.name, 'Product 1');
        });
        it('API ops tests connection.listDatabases()', async function() {
            if (testClient!.isAstra) {
                return this.skip();
            }
            const { databases } = await mongooseInstance!.connection.listDatabases();
            assert.ok(Array.isArray(databases));
            assert.ok(mongooseInstance.connection.keyspaceName);

            assert.ok(databases.find(db => db.name === mongooseInstance.connection.keyspaceName));
        });
        it('API ops tests connection.runCommand()', async () => {
            const res = await mongooseInstance.connection.runCommand({ findCollections: {} });
            assert.ok(res.status?.collections?.includes('carts'));
        });
        it('API ops tests collection.runCommand()', async function() {
            const res = await mongooseInstance.connection.collection('carts').runCommand({ find: {} });
            assert.ok(Array.isArray(res.data!.documents));
        });
        it('API ops tests createConnection() with uri and options', async function() {
            const connection = mongooseInstance.createConnection(testClient!.uri, testClient!.options) as unknown as AstraMongooseDriver.Connection;
            await connection.asPromise();
            const promise = connection.listCollections({ nameOnly: false });
            assert.ok((await promise.then(res => res.map(obj => obj.name))).includes(Product.collection.collectionName));

            await assert.rejects(
                mongooseInstance.createConnection('invalid url', testClient!.options).asPromise(),
                /Invalid URL/
            );

            await assert.rejects(
                mongooseInstance.createConnection('', testClient!.options).asPromise(),
                /Invalid URL/
            );

            await assert.rejects(
                mongooseInstance.createConnection('http://localhost:8181', testClient!.options).asPromise(),
                /Invalid URI: keyspace is required/
            );

            await assert.rejects(
                mongooseInstance.createConnection('https://apps.astra.datastax.com/api/json/v1/test?applicationToken=test1&applicationToken=test2', testClient!.options).asPromise(),
                /Invalid URI: multiple application tokens/
            );

            await assert.rejects(
                mongooseInstance.createConnection('https://apps.astra.datastax.com/api/json/v1/test?authHeaderName=test1&authHeaderName=test2', testClient!.options).asPromise(),
                /Invalid URI: multiple application auth header names/
            );

            if (!testClient?.isAstra) {
                // Omit username and password from options
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                const { username: _username, password: _password, ...options } = testClient!.options;
                await assert.rejects(
                    mongooseInstance.createConnection(testClient!.uri, options).asPromise(),
                    /Username and password are required when connecting to non-Astra deployments/
                );
            }
        });
        it('API ops tests createConnection() with queueing', async function() {
            const connection = mongooseInstance.createConnection() as unknown as AstraMongooseDriver.Connection;
            const promise = connection.listCollections({ nameOnly: false });

            await connection.openUri(testClient!.uri, testClient!.options);
            assert.ok((await promise.then(res => res.map(obj => obj.name))).includes(Product.collection.collectionName));
        });
        it('API ops tests createConnection() with no buffering', async function() {
            const connection = mongooseInstance.createConnection(testClient!.uri, { ...testClient!.options, bufferCommands: false }) as unknown as AstraMongooseDriver.Connection;
            await connection.asPromise();
            await connection.close();
            await assert.rejects(connection.listCollections({}), /Connection is not connected/);
        });
        it('API ops tests dropIndex()', async function() {
            await assert.rejects(
                mongooseInstance.connection.collection(Product.collection.collectionName).dropIndex('sample index name'),
                /Cannot use dropIndex\(\) with collections/
            );
        });
        it('API ops tests setClient()', async function() {
            assert.throws(
                () => mongooseInstance.connection.setClient(),
                /SetClient not supported/
            );
        });
    });

    describe('vector search', function() {
        const vectorSchema = new Schema(
            {
                $vector: { type: [Number], default: () => void 0, select: true },
                name: 'String'
            },
            {
                collectionOptions: { vector: { dimension: 2, metric: 'cosine' } },
                autoCreate: false
            }
        );
        let Vector: Model<InferSchemaType<typeof vectorSchema>>;

        before(async function() {
            Vector = mongooseInstance.model(
                'Vector',
                vectorSchema,
                'vector'
            );

            const collections = await mongooseInstance.connection.listCollections({ nameOnly: false });
            const vectorCollection = collections.find(coll => coll.name === 'vector');
            if (!vectorCollection) {
                await Vector.createCollection();
            } else if (vectorCollection.definition?.vector?.dimension !== 2 || vectorCollection.definition?.vector?.metric !== 'cosine') {
                await mongooseInstance.connection.dropCollection('vector');
                await Vector.createCollection();
            }
            if (testDebug) {
                mongooseInstance.connection.collection('vector').collection.on('commandStarted', ev => {
                    console.log(ev.target.url, JSON.stringify(ev.command, null, '    '));
                });
            }
        });

        beforeEach(async function() {
            await Vector.deleteMany({});
            await Vector.create([
                {
                    name: 'Test vector 1',
                    $vector: [1, 100]
                },
                {
                    name: 'Test vector 2',
                    $vector: [100, 1]
                }
            ]);
        });

        it('supports updating $vector with save()', async function() {
            const vector = await Vector.findOne({ name: 'Test vector 1' }).orFail();
            vector.$vector = [1, 101];
            await vector.save();

            const { $vector } = await Vector
                .findOne({ name: 'Test vector 1' })
                .orFail();
            assert.deepStrictEqual($vector, [1, 101]);

            let doc = await Vector
                .findOne({ name: 'Test vector 1' })
                .select({ name: 0 })
                .orFail();
            assert.deepStrictEqual(doc.$vector, [1, 101]);
            assert.strictEqual(doc.name, undefined);

            doc = await Vector
                .findOne({ name: 'Test vector 1' })
                .select({ $vector: 0 })
                .orFail();
            assert.strictEqual(doc.$vector, undefined);
            assert.strictEqual(doc.name, 'Test vector 1');
        });

        it('supports sort() and similarity score with $meta with find()', async function() {
            const res = await Vector.find({}, null, { includeSimilarity: true }).sort({ $vector: { $meta: [1, 99] } });
            assert.deepStrictEqual(res.map(doc => doc.name), ['Test vector 1', 'Test vector 2']);
            assert.deepStrictEqual(res.map(doc => doc.get('$similarity')), [1, 0.51004946]);
        });

        it('works with select: *', async function() {
            const res = await Vector.findOne({}, { '*': 1 }).sort({ $vector: { $meta: [1, 99] } }).orFail();
            assert.strictEqual(res.name, 'Test vector 1');
            assert.deepStrictEqual(res.$vector, [1, 100]);
        });

        it('supports sort() with includeSortVector in find()', async function() {
            const cursor = await Vector
                .find({}, null, { includeSortVector: true })
                .sort({ $vector: { $meta: [1, 99] } })
                .cursor();

            await once(cursor, 'cursor');
            const rawCursor = (cursor as unknown as { cursor: FindCursor<unknown> }).cursor;
            assert.deepStrictEqual(await rawCursor.getSortVector().then(vec => vec?.asArray()), [1, 99]);
        });

        it('supports sort() and similarity score with $meta with findOne()', async function() {
            const doc2 = await Vector
                .findOne({}, null, { includeSimilarity: true })
                .sort({ $vector: { $meta: [1, 99] } })
                .orFail();
            assert.strictEqual(doc2.name, 'Test vector 1');
            assert.strictEqual(doc2.get('$similarity'), 1);
        });

        it('supports sort() with $meta with find()', async function() {
            let res = await Vector.
                find({}).
                sort({ $vector: { $meta: [1, 99] } });
            assert.deepStrictEqual(res.map(doc => doc.name), ['Test vector 1', 'Test vector 2']);

            res = await Vector.
                find({}).
                select({ $vector: 0 }).
                sort({ $vector: { $meta: [99, 1] } });
            assert.deepStrictEqual(res.map(doc => doc.name), ['Test vector 2', 'Test vector 1']);
            assert.deepStrictEqual(res.map(doc => doc.$vector), [undefined, undefined]);

            res = await Vector.
                find({}).
                limit(999).
                sort({ $vector: { $meta: [99, 1] } });
            assert.deepStrictEqual(res.map(doc => doc.name), ['Test vector 2', 'Test vector 1']);

            const doc = await Vector.
                findOne({}).
                orFail().
                sort({ $vector: { $meta: [99, 1] } });
            assert.deepStrictEqual(doc.name, 'Test vector 2');

            await assert.rejects(
                Vector.find().limit(1001).sort({ $vector: { $meta: [99, 1] } }),
                /limit options should not be greater than 1000 for vector search/
            );
        });

        it('supports sort() with $meta with updateOne()', async function() {
            await Vector.
                updateOne(
                    {},
                    { name: 'found vector', $vector: [990, 1] }
                ).
                sort({ $vector: { $meta: [99, 1] } });
            const vectors = await Vector.find().limit(20).sort({ name: 1 });
            assert.deepStrictEqual(vectors.map(v => v.name), ['Test vector 1', 'found vector']);
            assert.deepStrictEqual(vectors.map(v => v.$vector), [[1, 100], [990, 1]]);
        });

        it('supports sort() with $meta with findOneAndUpdate()', async function() {
            const res = await Vector.
                findOneAndUpdate(
                    {},
                    { name: 'found vector', $vector: [990, 1] },
                    { returnDocument: 'before' }
                ).
                orFail().
                sort({ $vector: { $meta: [99, 1] } });
            assert.deepStrictEqual(res.$vector, [100, 1]);
            assert.strictEqual(res.name, 'Test vector 2');

            const doc = await Vector.findById(res._id).orFail();
            assert.strictEqual(doc.name, 'found vector');
            assert.deepStrictEqual(doc.$vector, [990, 1]);
        });

        it('supports $setOnInsert of $vector with findOneAndUpdate()', async function() {
            let res = await Vector.
                findOneAndUpdate(
                    { name: 'Test vector 2' },
                    { $setOnInsert: { $vector: [990, 1] } },
                    { returnDocument: 'after', upsert: true }
                ).
                orFail();
            assert.deepStrictEqual(res.$vector, [100, 1]);
            assert.strictEqual(res.name, 'Test vector 2');

            res = await Vector.
                findOneAndUpdate(
                    { name: 'Test vector 3' },
                    { $setOnInsert: { $vector: [990, 1] } },
                    { returnDocument: 'after', upsert: true }
                ).
                orFail();
            assert.deepStrictEqual(res.$vector, [990, 1]);
            assert.strictEqual(res.name, 'Test vector 3');
        });

        it('supports $unset of $vector with findOneAndUpdate()', async function() {
            const res = await Vector.
                findOneAndUpdate(
                    { name: 'Test vector 2' },
                    { $unset: { $vector: 1 } },
                    { returnDocument: 'after' }
                ).
                orFail();
            assert.deepStrictEqual(res.$vector, undefined);
            assert.strictEqual(res.name, 'Test vector 2');
        });

        it('supports sort() with $meta with findOneAndReplace()', async function() {
            const res = await Vector.
                findOneAndReplace(
                    {},
                    { name: 'found vector', $vector: [990, 1] },
                    { returnDocument: 'before' }
                ).
                orFail().
                sort({ $vector: { $meta: [99, 1] } });
            assert.deepStrictEqual(res.$vector, [100, 1]);
            assert.strictEqual(res.name, 'Test vector 2');

            const doc = await Vector.findById(res._id).orFail();
            assert.strictEqual(doc.name, 'found vector');
            assert.deepStrictEqual(doc.$vector, [990, 1]);
        });

        it('supports sort() with $meta with findOneAndDelete()', async function() {
            const res = await Vector.
                findOneAndDelete(
                    {},
                    { returnDocument: 'before' }
                ).
                orFail().
                sort({ $vector: { $meta: [1, 99] } });
            assert.deepStrictEqual(res.$vector, [1, 100]);
            assert.strictEqual(res.name, 'Test vector 1');

            const fromDb = await Vector.findOne({ name: 'Test vector 1' });
            assert.equal(fromDb, null);
        });

        it('supports sort() with $meta with deleteOne()', async function() {
            const res = await Vector.
                deleteOne({}).
                sort({ $vector: { $meta: [1, 99] } });
            assert.equal(res.deletedCount, 1);

            const fromDb = await Vector.findOne({ name: 'Test vector 1' });
            assert.equal(fromDb, null);
        });

        it('contains vector options in listCollections() output with `explain`', async function() {
            const collections = await mongooseInstance.connection.listCollections();
            const collection = collections.find(collection => collection.name === 'vector');
            assert.ok(collection, 'Collection named "vector" not found');
            const { vector } = collection.definition;
            assert.deepStrictEqual(vector, { dimension: 2, metric: 'cosine', sourceModel: 'other' });
        });
    });

    describe('vectorize', function () {
        const vectorSchema = new Schema(
            {
                $vector: { type: [Number], default: () => void 0, dimension: 1024 },
                $vectorize: { type: String },
                $hybrid: { type: String },
                $lexical: { type: String },
                name: 'String'
            },
            {
                collectionOptions: {
                    vector: {
                        dimension: 1024,
                        metric: 'cosine',
                        service: { provider: 'nvidia', modelName: 'NV-Embed-QA' }
                    },
                    lexical: {
                        enabled: true,
                        analyzer: 'STANDARD',
                    },
                    rerank: {
                        enabled: true,
                        service: {
                            provider: 'nvidia',
                            modelName: 'nvidia/llama-3.2-nv-rerankqa-1b-v2'
                        }
                    }
                },
                autoCreate: false
            }
        );

        let Vector: Model<InferSchemaType<typeof vectorSchema>>;

        before(async function() {
            if (!testClient!.isAstra) {
                return this.skip();
            }

            mongooseInstance.deleteModel(/Vector/);
            Vector = mongooseInstance.model(
                'Vector',
                vectorSchema,
                'vector'
            );

            const collections = await mongooseInstance.connection.listCollections({ nameOnly: false });
            const vectorCollection = collections.find(coll => coll.name === 'vector');
            if (!vectorCollection) {
                await Vector.createCollection();
            } else if (vectorCollection.definition?.vector?.dimension !== 1024 || vectorCollection.definition?.vector?.metric !== 'cosine') {
                await mongooseInstance.connection.dropCollection('vector');
                await Vector.createCollection();
            }
        });

        beforeEach(async function () {
            await Vector.deleteMany({});
        });

        it('supports creating document with $vectorize', async function () {
            const { _id } = await Vector.create({ name: 'Moby-Dick', $vectorize: 'Call me Ishmael.' });
            const doc = await Vector.findById(_id).select({ '*': 1 }).orFail();
            assert.strictEqual(doc.$vectorize, 'Call me Ishmael.');
            assert.ok(doc.$vector);
            assert.equal(doc.$vector.length, 1024);
            assert.ok(doc.$vector.every(v => typeof v === 'number'));
        });

        it('handles default projection', async function () {
            const { _id } = await Vector.create({ name: 'Moby-Dick', $vectorize: 'Call me Ishmael.' });
            const doc = await Vector.findById(_id).orFail();
            assert.ok(!doc.$vectorize);
            assert.ok(!doc.$vector);
        });

        it('supports findAndRerank', async function () {
            await Vector.create({ name: 'Doc 1', $vectorize: 'I like Mexican food', $lexical: 'taco taco taco' });
            await Vector.create({ name: 'Doc 2', $vectorize: 'Tacos are a part of Taco Tuesday', $lexical: 'taco' });
            const result = await Vector.findAndRerank({}, { sort: { $hybrid: 'taco' }, includeScores: true });
            assert.strictEqual(result.length, 2);
            assert.strictEqual(result[0].document.name, 'Doc 2');
            assert.strictEqual(result[1].document.name, 'Doc 1');
            result.sort((a, b) => a.scores.$bm25Rank - b.scores.$bm25Rank);
            assert.strictEqual(result[0].document.name, 'Doc 1');
            assert.strictEqual(result[1].document.name, 'Doc 2');
        });
    });

    describe('vectorize with select: true', function () {
        const vectorSchema = new Schema(
            {
                $vector: { type: [Number], default: () => void 0, dimension: 1024 },
                $vectorize: { type: String, select: true },
                name: 'String'
            },
            {
                collectionOptions: {
                    vector: {
                        dimension: 1024,
                        metric: 'cosine',
                        service: { provider: 'nvidia', modelName: 'NV-Embed-QA' }
                    }
                },
                autoCreate: false
            }
        );

        let Vector: Model<InferSchemaType<typeof vectorSchema>>;

        before(async function() {
            if (!testClient!.isAstra) {
                return this.skip();
            }

            mongooseInstance.deleteModel(/Vector/);
            Vector = mongooseInstance.model(
                'Vector',
                vectorSchema,
                'vector'
            );

            const collections = await mongooseInstance.connection.listCollections({ nameOnly: false });
            const vectorCollection = collections.find(coll => coll.name === 'vector');
            if (!vectorCollection) {
                await Vector.createCollection();
            } else if (vectorCollection.definition?.vector?.dimension !== 1024 || vectorCollection.definition?.vector?.metric !== 'cosine') {
                await mongooseInstance.connection.dropCollection('vector');
                await Vector.createCollection();
            }
        });

        beforeEach(async function () {
            await Vector.deleteMany({});
        });

        it('supports creating document with $vectorize', async function () {
            const { _id } = await Vector.create({ name: 'Moby-Dick', $vectorize: 'Call me Ishmael.' });
            const doc = await Vector.findById(_id).select({ '*': 1 }).orFail();
            assert.strictEqual(doc.$vectorize, 'Call me Ishmael.');
            assert.ok(doc.$vector);
            assert.equal(doc.$vector.length, 1024);
            assert.ok(doc.$vector.every(v => typeof v === 'number'));
        });

        it('handles default projection', async function () {
            const { _id } = await Vector.create({ name: 'Moby-Dick', $vectorize: 'Call me Ishmael.' });
            const doc = await Vector.findById(_id).orFail();
            assert.strictEqual(doc.$vectorize, 'Call me Ishmael.');
            assert.ok(!doc.$vector);
        });

        it('supports excluding $vectorize from projection', async function () {
            const { _id } = await Vector.create({ name: 'Moby-Dick', $vectorize: 'Call me Ishmael.' });
            const doc = await Vector.findById(_id).select({ '$vectorize': 0 }).orFail();
            assert.strictEqual(doc.name, 'Moby-Dick');
            assert.ok(!doc.$vector);
        });
    });

    describe('$match', function () {
        const lexicalSchema = new Schema(
            {
                $lexical: { type: String },
                name: { type: String }
            },
            {
                collectionOptions: {
                    lexical: {
                        enabled: true,
                        analyzer: 'STANDARD',
                    }
                },
                autoCreate: false
            }
        );
        let LexicalModel: Model<InferSchemaType<typeof lexicalSchema>>;

        before(async function () {
            this.timeout(120_000);

            await mongooseInstance.connection.dropCollection(TEST_COLLECTION_NAME);
            LexicalModel = mongooseInstance.model('Lexical', lexicalSchema, TEST_COLLECTION_NAME);
            await LexicalModel.createCollection();
        });

        it('works on $lexical field', async function () {
            await LexicalModel.deleteMany({});
            await LexicalModel.create([
                { name: 'test 1', $lexical: 'the quick brown fox jumped over the lazy dog' },
                { name: 'test 2', $lexical: 'the lazy red hen sat beside the sleepy dog' }
            ]);
            let docs = await LexicalModel.find({ $lexical: { $match: 'jumped' } });
            assert.strictEqual(docs.length, 1);
            assert.strictEqual(docs[0].name, 'test 1');

            docs = await LexicalModel.find({ $lexical: { $match: 'sat' } });
            assert.strictEqual(docs.length, 1);
            assert.strictEqual(docs[0].name, 'test 2');
        });

        it.skip('sorts results by $lexical field', async function () {
            // Ensure collection is clean and has the right docs
            await LexicalModel.deleteMany({});
            await LexicalModel.create([
                { name: 'test A1', $lexical: 'the badger is a small, burrowing mammal known for its bold behavior and distinctive striped face.' },
                { name: 'test A2', $lexical: 'badger badger badger mushroom mushroom' },
                { name: 'test A3', $lexical: 'the quick brown fox jumped over the lazy dog' }
            ]);
            const docs = await LexicalModel.find({ $lexical: { $match: 'badger' } }).sort({ $lexical: { $meta: 'badger' } });
            assert.strictEqual(docs.length, 2);
            assert.strictEqual(docs[0].name, 'test A2');
            assert.strictEqual(docs[1].name, 'test A1');
        });
    });
});

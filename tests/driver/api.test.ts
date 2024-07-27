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
import {Db} from '@/src/collections/db';
import {Client} from '@/src/collections/client';
import {
    testClient,
    TEST_COLLECTION_NAME
} from '@/tests/fixtures';
import mongoose, { Schema, InferSchemaType, InsertManyResult } from 'mongoose';
import { once } from 'events';
import * as StargateMongooseDriver from '@/src/driver';
import {randomUUID} from 'crypto';
import {OperationNotSupportedError} from '@/src/driver';
import { Product, Cart, mongooseInstance } from '@/tests/mongooseFixtures';

const productSchema = new mongoose.Schema({
    name: String,
    price: Number,
    expiryDate: Date,
    isCertified: Boolean,
    category: String
});

describe('Mongoose Model API level tests', async () => {
    let astraClient: Client | null;
    let db: Db;
    before(async function () {
        if (testClient == null) {
            return this.skip();
        }
        astraClient = await testClient?.client;
        if (astraClient === null) {
            return this.skip();
        }

        db = astraClient.db();
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
            const savedRow = await Product.findById(saveResponseWithStrictTrue._id);
            assert.strictEqual(savedRow.name, 'Product 1');
            assert.strictEqual(savedRow.price, 10);
            assert.strictEqual(savedRow.isCertified, true);
            assert.strictEqual(savedRow.category, 'cat 1');
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
            const savedRowWithStrictFalse = await Product.findById(saveResponseWithStrictFalse._id);
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
        it('Data type tests', async () => {
            const modelName = 'User';
            const userSchema = new mongoose.Schema({
                name: String,
                age: Number,
                dob: Date,
                encData: Buffer,
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
                documentArray: [{ name: String }]
            });
            const User = mongooseInstance.model(modelName, userSchema, TEST_COLLECTION_NAME);
            const collectionNames = await User.db.listCollections().then(collections => collections.map(c => c.name));
            if (!collectionNames.includes(TEST_COLLECTION_NAME)) {
                await User.createCollection();
            } else {
                await User.deleteMany({});
            }
            const employeeIdVal = new mongoose.Types.ObjectId();
            //generate a random uuid
            const uniqueIdVal = randomUUID();
            const dobVal = new Date();
            const saveResponse = await new User({
                name: 'User 1',
                age: 10,
                dob: dobVal,
                //encData: Buffer.from('test'),
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
                uniqueId: uniqueIdVal,
                category: BigInt(100),
                documentArray: [{ name: 'test document array' }]
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
            let error: any = null;
            try {
                await Product.$where('this.name === "Product 1"').exec();
            } catch (err: any) {
                error = err;
            }
            assert.ok(error);
            assert.strictEqual(error.errorDescriptors[0].message, 'Invalid filter expression: filter clause path (\'$where\') contains character(s) not allowed');
        });
        it('API ops tests Model.aggregate()', async () => {
            //Model.aggregate()
            let error: OperationNotSupportedError | null = null;
            try {
                await Product.aggregate([{$match: {name: 'Product 1'}}]);
            } catch (err: any) {
                error = err;
            }
            assert.strictEqual(error!.message, 'aggregate() Not Implemented');
            //----------------//
        });
        //Model.applyDefaults is skipped, because it is not making any db calls
        //TODO - Skipping /node_modules/mongoose/lib/model.js:3442:74
        //Model.bulkSave() error:  TypeError: Cannot read properties of undefined (reading 'find')
        it.skip('API ops tests Model.bulkSave()', async () => {
            let error: OperationNotSupportedError | null = null;
            try {
                const product2 = new Product({name: 'Product 2', price: 20, isCertified: true, category: 'cat 2'});
                const product3 = new Product({name: 'Product 3', price: 30, isCertified: true, category: 'cat 3'});
                await Product.bulkSave([product2, product3]);
            } catch (err:any) {
                error = err;
            }
            assert.strictEqual(error!.message, 'bulkSave() Not Implemented');
        });
        it('API ops tests Model.bulkWrite()', async () => {
            let error: OperationNotSupportedError | null = null;
            try {
                const product2 = new Product({name: 'Product 2', price: 20, isCertified: true, category: 'cat 2'});
                const product3 = new Product({name: 'Product 3', price: 30, isCertified: true, category: 'cat 3'});
                await Product.bulkWrite([{insertOne: {document: product2}}, {insertOne: {document: product3}}]);
            } catch (err: any) {
                error = err;
            }
            assert.strictEqual(error!.message, 'bulkWrite() Not Implemented');
        });
        //castObject skipped as it is not making any database calls
        it('API ops tests Model.cleanIndexes()', async () => {
            let error: OperationNotSupportedError | null = null;
            try {
                // @ts-ignore
                await Product.cleanIndexes();
            } catch (err: any) {
                error = err;
            }
            //cleanIndexes invokes listIndexes() which is not supported
            assert.strictEqual(error!.message, 'listIndexes() Not Implemented');
        });
        it('API ops tests Model.countDocuments()', async () => {
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
        it('API ops tests Model.createCollection()', async () => {
            await Product.createCollection();
        });
        //TODO - createIndex() error uncaught internally
        it.skip('API ops tests Model.createIndexes()', async () => {
            let error: any = null;
            Product.schema.index({name: 1});
            try {
                await Product.createIndexes();
            } catch (err: any) {
                error = err;
            }
            assert.strictEqual(error!.message, 'createIndex() Not Implemented');
        });
        it('API ops tests Model.db', async () => {
            const conn = Product.db as unknown as StargateMongooseDriver.Connection;
            assert.strictEqual(conn.db.name, db.name);
        });
        it('API ops tests Model.deleteMany()', async () => {
            const product1 = new Product({name: 'Product 1', price: 10, isCertified: true, category: 'cat 1'});
            await product1.save();
            const deleteManyResp = await Product.deleteMany({name: 'Product 1'});
            assert.strictEqual(deleteManyResp.deletedCount, 1);
            const findDeletedDoc = await Product.findOne({name: 'Product 1'});
            assert.strictEqual(findDeletedDoc, null);
        });
        it('API ops tests Model.deleteOne()', async () => {
            const product1 = new Product({name: 'Product 1', price: 10, isCertified: true, category: 'cat 1'});
            await product1.save();
            const deleteOneResp = await Product.deleteOne({name: 'Product 1'});
            assert.strictEqual(deleteOneResp.deletedCount, 1);
            const findDeletedDoc = await Product.findOne({name: 'Product 1'});
            assert.strictEqual(findDeletedDoc, null);
        });
        it('API ops tests Model.diffIndexes()', async () => {
            let error: OperationNotSupportedError | null = null;
            try {
                await Product.diffIndexes();
            } catch (err: any) {
                error = err;
            }
            assert.ok(error);
            assert.strictEqual(error?.message, 'listIndexes() Not Implemented');
        });
        it('API ops tests Model.discriminator()', async () => {
            //Online products have URL
            const OnlineProduct = Product.discriminator<InferSchemaType<typeof productSchema> & { url: string }>('OnlineProduct', new Schema({url: String}));
            const regularProduct = new Product({
                name: 'Product 1',
                price: 10,
                isCertified: true,
                category: 'cat 1',
                url: 'http://product1.com'
            });
            assert.ok(!regularProduct.url);
            await regularProduct.save();
            const regularProductSaved = await Product.findOne({name: 'Product 1'});
            assert.strictEqual(regularProductSaved!.name, 'Product 1');
            assert.strictEqual(regularProductSaved!.price, 10);
            assert.strictEqual(regularProductSaved!.isCertified, true);
            assert.strictEqual(regularProductSaved!.category, 'cat 1');
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
            let err: OperationNotSupportedError | null = null;
            try {
                const query = Product.distinct('category');
                await query.exec();
            } catch (error: any) {
                err = error;
            }
            assert.ok(err);
            assert.strictEqual(err?.message, 'distinct() Not Implemented');
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
                assert.strictEqual(nameArray.has(doc.name), true);
                nameArray.delete(doc.name);
            }
        });
        it('API ops tests Model.findById()', async () => {
            const product1 = new Product({name: 'Product 1', price: 10, isCertified: true, category: 'cat 1'});
            await product1.save();
            const findResp = await Product.findById(product1._id);
            assert.strictEqual(findResp?.name, 'Product 1');
        });
        it('API ops tests Model.findByIdAndDelete()', async () => {
            const product1 = new Product({name: 'Product 1', price: 10, isCertified: true, category: 'cat 1'});
            await product1.save();
            const deleteResp = await Product.findByIdAndDelete(product1._id);
            assert.strictEqual(deleteResp?.name, 'Product 1');
            const findDeletedDoc = await Product.findById(product1._id);
            assert.strictEqual(findDeletedDoc, null);
        });
        it('API ops tests Model.findByIdAndUpdate()', async () => {
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
        it('API ops tests Model.findOneAndDelete()', async () => {
            const product1 = new Product({name: 'Product 1', price: 10, isCertified: true, category: 'cat 2'});
            const product2 = new Product({name: 'Product 2', price: 10, isCertified: true, category: 'cat 2'});
            const product3 = new Product({name: 'Product 3', price: 10, isCertified: true, category: 'cat 1'});
            await Product.insertMany([product1, product2, product3]);
            const deleteResp = await Product.findOneAndDelete({category: 'cat 1'});
            assert.strictEqual(deleteResp?.category, 'cat 1');
            //check if it exists again
            const findDeletedDoc = await Product.findOne({category: 'cat 1'});
            assert.strictEqual(findDeletedDoc, null);
        });
        it('API ops tests Model.findOneAndUpdate()', async () => {
            const product1 = new Product({name: 'Product 1', price: 10, isCertified: true, category: 'cat 2'});
            const product2 = new Product({name: 'Product 2', price: 10, isCertified: true, category: 'cat 2'});
            const product3 = new Product({name: 'Product 3', price: 10, isCertified: true, category: 'cat 1'});
            await Product.insertMany([product1, product2, product3]);
            const updateResp = await Product.findOneAndUpdate({category: 'cat 1'}, {name: 'Product 4'});
            assert.strictEqual(updateResp?.category, 'cat 1');
            const findOneResp = await Product.findOne({category: 'cat 1'});
            assert.strictEqual(findOneResp?.name, 'Product 4');
        });
        it('API ops tests Model.insertMany()', async () => {
            const product1Id = new mongoose.Types.ObjectId('0'.repeat(24));
            const product2Id = new mongoose.Types.ObjectId('1'.repeat(24));
            const product3Id = new mongoose.Types.ObjectId('2'.repeat(24));
            const product1 = {_id: product1Id, name: 'Product 1', price: 10, isCertified: true, category: 'cat 2'};
            const product2 = {_id: product2Id, name: 'Product 2', price: 10, isCertified: true, category: 'cat 2'};
            const product3 = {_id: product3Id, name: 'Product 3', price: 10, isCertified: true, category: 'cat 1'};
            const insertResp: InsertManyResult<any> = await Product.insertMany([product1, product2, product3] , {ordered: true, rawResult: true});
            assert.strictEqual(insertResp.insertedCount, 3);

            let docs = [];
            for (let i = 0; i < 21; ++i) {
                docs.push({ name: 'Test product ' + i, price: 10, isCertified: true });
            }
            const respOrdered: InsertManyResult<any> = await Product.insertMany(docs, { rawResult: true  });
            assert.strictEqual(respOrdered.insertedCount, 21);

            docs = [];
            for (let i = 0; i < 21; ++i) {
                docs.push({ name: 'Test product ' + i, price: 10, isCertified: true });
            }
            const respUnordered: InsertManyResult<any> = await Product.insertMany(docs, { ordered: false, rawResult: true });
            assert.strictEqual(respUnordered.insertedCount, 21);
        });
        it('API ops tests Model.insertMany() with returnDocumentResponses', async () => {
            const product1Id = new mongoose.Types.ObjectId('0'.repeat(24));
            const product2Id = new mongoose.Types.ObjectId('1'.repeat(24));
            const product3Id = new mongoose.Types.ObjectId('2'.repeat(24));
            const product1 = {_id: product1Id, name: 'Product 1', price: 10, isCertified: true, category: 'cat 2'};
            const product2 = {_id: product2Id, name: 'Product 2', price: 10, isCertified: true, category: 'cat 2'};
            const product3 = {_id: product3Id, name: 'Product 3', price: 10, isCertified: true, category: 'cat 1'};
            const respWithResponses = await Product.insertMany(
                [product1, product2, product3],
                {returnDocumentResponses: true, rawResult: true}
            );
            assert.deepStrictEqual(respWithResponses.documentResponses, [
                { _id: '0'.repeat(24), status: 'OK' },
                { _id: '1'.repeat(24), status: 'OK' },
                { _id: '2'.repeat(24), status: 'OK' }
            ]);

            const err = await Product.insertMany(
                [product1, product2, product3],
                {returnDocumentResponses: true}
            ).then(() => null, err => err);
            assert.deepStrictEqual(err.status.documentResponses, [
                { _id: '0'.repeat(24), status: 'ERROR', errorsIdx: 0 },
                { _id: '1'.repeat(24), status: 'ERROR', errorsIdx: 0 },
                { _id: '2'.repeat(24), status: 'ERROR', errorsIdx: 0 }
            ]);
        });
        //Model.inspect can not be tested since it is a helper for console logging. More info here: https://mongoosejs.com/docs/api/model.html#Model.inspect()
        it('API ops tests Model.listIndexes()', async () => {
            let error: OperationNotSupportedError | null = null;
            try {
                await Product.listIndexes();
            } catch(err: OperationNotSupportedError | any) {
                error = err;
            }
            assert.ok(error);
            assert.strictEqual(error?.message, 'listIndexes() Not Implemented');
        });
        it('API ops tests Model.populate()', async () => {
            const product1 = new Product({name: 'Product 1', price: 10, isCertified: true, category: 'cat 2'});
            const product2 = new Product({name: 'Product 2', price: 10, isCertified: true, category: 'cat 2'});
            const product3 = new Product({name: 'Product 3', price: 10, isCertified: true, category: 'cat 1'});
            await Product.insertMany([product1, product2, product3]);
            const cart1 = new Cart({name: 'Cart 1', products: [product1._id, product2._id]});
            await Cart.insertMany([cart1]);
            const populateResp = await Cart.findOne({name: 'Cart 1'}).populate('products');
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
        it('API ops tests Model.replaceOne()', async () => {
            let error: OperationNotSupportedError | null = null;
            try {
                const product1 = new Product({name: 'Product 1', price: 10, isCertified: true, category: 'cat 2'});
                const product2 = new Product({name: 'Product 2', price: 10, isCertified: true, category: 'cat 2'});
                const product3 = new Product({name: 'Product 3', price: 10, isCertified: true, category: 'cat 1'});
                await Product.insertMany([product1, product2, product3]);
                await Product.replaceOne({category: 'cat 1'}, {name: 'Product 4'});
            } catch(err: OperationNotSupportedError | any) {
                error = err;
            }
            assert.ok(error);
            assert.strictEqual(error?.message, 'replaceOne() Not Implemented');
        });
        //Model.schema() is skipped since it doesn't make any database calls. More info here: https://mongoosejs.com/docs/api/model.html#Model.schema
        it('API ops tests Model.startSession()', async () => {
            const product1 = new Product({name: 'Product 1', price: 10, isCertified: true, category: 'cat 2'});
            const product2 = new Product({name: 'Product 2', price: 10, isCertified: true, category: 'cat 2'});
            const product3 = new Product({name: 'Product 3', price: 10, isCertified: true, category: 'cat 1'});
            await Product.insertMany([product1, product2, product3]);
            let error: OperationNotSupportedError | null = null;
            try {
                await Product.startSession();
                await product1.remove();
            } catch(err: OperationNotSupportedError | any) {
                error = err;
            }
            assert.ok(error);
            assert.strictEqual(error?.message, 'startSession() Not Implemented');
        });
        it('API ops tests Model.syncIndexes()', async () => {
            let error: OperationNotSupportedError | null = null;
            try {
                await Product.syncIndexes();
            } catch(err: OperationNotSupportedError | any) {
                error = err;
            }
            assert.ok(error);
            //since listIndexes is invoked before syncIndexes, the error message will be related to listIndexes
            assert.strictEqual(error?.message, 'listIndexes() Not Implemented');
        });
        //Mode.translateAliases is skipped since it doesn't make any database calls. More info here: https://mongoosejs.com/docs/api/model.html#Model.translateAliases
        it('API ops tests Model.updateMany()', async () => {
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
            findUpdatedDocs.forEach((doc: any) => {
                productNames.add(doc.name);
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
            //UpdateOne
            const updateOneResp: mongoose.UpdateWriteOpResult = await Product.updateOne({category: 'cat 1'}, {category: 'cat 3'});
            assert.strictEqual(updateOneResp.matchedCount, 1);
            assert.strictEqual(updateOneResp.modifiedCount, 1);
            assert.strictEqual(updateOneResp.upsertedCount, 0);
            const findUpdatedDoc = await Product.findOne({category: 'cat 3'});
            assert.strictEqual(findUpdatedDoc?.name, 'Product 3');
        });
        it('API ops tests Model.updateOne() $push document array', async () => {
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
          
            const { user } = await Cart.findById(cart._id).orFail();
            assert.deepStrictEqual(user.toObject(), { name: 'test updated subdoc' });
        });
        //Model.validate is skipped since it doesn't make any database calls. More info here: https://mongoosejs.com/docs/api/model.html#Model.validate
        it('API ops tests Model.watch()', async () => {
            let error: OperationNotSupportedError | null = null;
            try {
                const product1 = new Product({name: 'Product 1', price: 10, isCertified: true, category: 'cat 2'});
                await product1.save();
                const changeStream = Product.watch().on('change', (change) => {
                    assert.strictEqual(change.operationType, 'delete');
                    assert.strictEqual(change.documentKey._id.toString(), product1._id.toString());
                    changeStream.close();
                });
                await product1.remove();
            } catch(err: OperationNotSupportedError | any) {
                error = err;
            }
            assert.ok(error);
            assert.strictEqual(error?.message, 'watch() Not Implemented');
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
                Array.from({ length: 25 }, (_, index) => ({
                    name: `Product ${index + 1}`,
                    price: 10
                }))
            );

            let cursor = Product.find().sort({ product: 1 }).cursor();
            for (let i = 0; i < 20; ++i) {
                const product = await cursor.next();
                assert.equal(product?.name, `Product ${i + 1}`, 'Failed at index ' + i);
            }
            assert.equal(await cursor.next(), null);

            cursor = await Product.find().sort({ product: 1 }).limit(20).cursor();
            for (let i = 0; i < 20; ++i) {
                await cursor.next();
            }
            assert.equal(await cursor.next(), null);
        });
        it('API ops tests Model.db.collection()', async () => {
            const product1 = new Product({name: 'Product 1', price: 10, isCertified: true, category: 'cat 2'});
            await product1.save();
            const res = await Product.db.collection('products').findOne();
            assert.equal(res!.name, 'Product 1');
        });
        it('API ops tests connection.listDatabases()', async () => {
            const { databases } = await mongooseInstance!.connection.listDatabases();
            assert.ok(Array.isArray(databases));
            // @ts-ignore
            assert.ok(mongooseInstance.connection.db.name);
            // @ts-ignore
            assert.ok(databases.includes(mongooseInstance.connection.db.name));
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
                autoCreate: true
            }
        );
        vectorSchema.virtual('$sortVector').get(function() {
            return this._doc.$sortVector;
        });
        const Vector = mongooseInstance.model(
            'Vector',
            vectorSchema,
            'vector'
        );

        before(async function() {
            const collections = await mongooseInstance.connection.listCollections({ explain: true });
            const vectorCollection = collections.find(coll => coll.name === 'vector');
            if (!vectorCollection) {
                await mongooseInstance.connection.dropCollection('vector');
                await Vector.createCollection();
            } else if (vectorCollection.options?.vector?.dimension !== 2 || vectorCollection.options?.vector?.metric !== 'cosine') {
                await mongooseInstance.connection.dropCollection('vector');
                await Vector.createCollection();
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

        it('supports sort() with includeSortVector in findOne()', async function() {
            const doc = await Vector
                .findOne({}, null, { includeSortVector: true })
                .sort({ $vector: { $meta: [1, 99] } })
                .orFail();
            assert.deepStrictEqual(doc.name, 'Test vector 1');
            assert.deepStrictEqual(doc.$sortVector, [1, 99]);
            assert.deepStrictEqual(doc.get('$sortVector'), [1, 99]);
        });

        it('supports sort() with includeSortVector in find()', async function() {
            const cursor = await Vector
                .find({}, null, { includeSortVector: true })
                .sort({ $vector: { $meta: [1, 99] } })
                .cursor();
            
            await once(cursor, 'cursor');
            assert.deepStrictEqual(await cursor.cursor.getSortVector(), [1, 99]);            
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
            const connection = mongooseInstance.connection;
            const collections = await connection.listCollections({ explain: true });
            const collection = collections.find(collection => collection.name === 'vector');
            assert.ok(collection, 'Collection named "vector" not found');
            assert.deepStrictEqual(collection.options, {
                vector: { dimension: 2, metric: 'cosine' }
            });
        });
    });
});

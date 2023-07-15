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
import mongoose, {Model, Mongoose, Schema} from "mongoose";
import * as StargateMongooseDriver from "@/src/driver";
import {randomUUID} from "crypto";
import {OperationNotSupportedError} from "@/src/driver";

describe(`Mongoose Model API level tests`, async () => {
    let astraClient: Client | null;
    let db: Db;
    //let collection: Collection;
    //const sampleDoc = createSampleDoc();
    let dbUri: string;
    let isAstra: boolean;
    before(async function () {
        if (testClient == null) {
            return this.skip();
        }
        astraClient = await testClient?.client;
        if (astraClient === null) {
            return this.skip();
        }

        db = astraClient.db();
        await db.dropCollection(TEST_COLLECTION_NAME);
        dbUri = testClient.uri;
        isAstra = testClient.isAstra;
    });
    let mongooseInstance: Mongoose | null = null;
    let Product: Model<any>, Cart: Model<any>, astraMongoose: Mongoose | null, jsonAPIMongoose: Mongoose | null;
    beforeEach(async () => {
        ({Product, Cart, astraMongoose, jsonAPIMongoose} = await createClientsAndModels(isAstra));
    });
    afterEach(async () => {
        await dropCollections(isAstra, astraMongoose, jsonAPIMongoose, 'products');
        await dropCollections(isAstra, astraMongoose, jsonAPIMongoose, 'carts');
    });

    async function getInstance() {
        const mongooseInstance = new mongoose.Mongoose();
        mongooseInstance.setDriver(StargateMongooseDriver);
        mongooseInstance.set('autoCreate', true);
        mongooseInstance.set('autoIndex', false);
        mongooseInstance.set('strictQuery', false);
        return mongooseInstance;
    }

    async function createClientsAndModels(isAstra: boolean) {
        let Product: Model<any>, Cart: Model<any>, astraMongoose: Mongoose | null = null, jsonAPIMongoose: Mongoose | null = null;
        const productSchema = new mongoose.Schema({
            name: String,
            price: Number,
            expiryDate: Date,
            isCertified: Boolean,
            category: String
        });
        const cartSchema = new mongoose.Schema({
            name: String,
            products: [{ type: Schema.Types.ObjectId, ref: 'Product' }]
        });
        if (isAstra) {
            astraMongoose = await getInstance();
            Product = astraMongoose.model('Product', productSchema);
            Cart = astraMongoose.model('Cart', cartSchema);
            // @ts-ignore - these are config options supported by stargate-mongoose but not mongoose
            await astraMongoose.connect(dbUri, {isAstra: true, logSkippedOptions: true});
            await Promise.all(Object.values(astraMongoose.connection.models).map(Model => Model.init()));
        } else {
            // @ts-ignore
            jsonAPIMongoose = await getInstance();
            Product = jsonAPIMongoose.model('Product', productSchema);
            Cart = jsonAPIMongoose.model('Cart', cartSchema);
            const options = {
                username: process.env.STARGATE_USERNAME,
                password: process.env.STARGATE_PASSWORD,
                authUrl: process.env.STARGATE_AUTH_URL,
                logSkippedOptions: true
            };
            // @ts-ignore - these are config options supported by stargate-mongoose but not mongoose
            await jsonAPIMongoose.connect(dbUri, options);
            await Promise.all(Object.values(jsonAPIMongoose.connection.models).map(Model => Model.init()));
        }
        mongooseInstance = isAstra ? astraMongoose : jsonAPIMongoose;
        return {Product, Cart, astraMongoose, jsonAPIMongoose};
    }

    async function dropCollections(isAstra: boolean, astraMongoose: mongoose.Mongoose | null, jsonAPIMongoose: mongoose.Mongoose | null, collectionName: string) {
        if (isAstra) {
            astraMongoose?.connection.dropCollection(collectionName);
        } else {
            jsonAPIMongoose?.connection.dropCollection(collectionName);
        }
    }

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
            try {
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
                    favorites: mongoose.Schema.Types.Map,
                    nestedSchema: {
                        address: {
                            street: String,
                            city: String,
                            state: String
                        }
                    },
                    uniqueId: Schema.Types.UUID,
                    category: BigInt
                });
                const User = mongooseInstance!.model(modelName, userSchema);
                await Promise.all(Object.values(mongooseInstance!.connection.models).map(Model => Model.init()));
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
                    category: BigInt(100)
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
                //get record using findOne and verify results
                const findOneResponse = await User.findOne({name: 'User 1'});
                assert.strictEqual(findOneResponse!.name, 'User 1');
                assert.strictEqual(findOneResponse!.age, 10);
                assert.strictEqual(findOneResponse!.dob!.toISOString(), dobVal.toISOString());
                assert.strictEqual(findOneResponse!.isCertified, true);
                assert.strictEqual(findOneResponse!.mixedData.a, 1);
                assert.strictEqual(findOneResponse!.mixedData.b, 'test');
                assert.strictEqual(findOneResponse!.employee!.toString(), employeeIdVal.toString());
                assert.strictEqual(findOneResponse!.friends[0], 'friend 1');
                assert.strictEqual(findOneResponse!.friends[1], 'friend 2');
                assert.strictEqual(findOneResponse!.salary!.toString(), '100.25');
                assert.strictEqual(findOneResponse!.favorites!.get('food'), 'pizza');
                assert.strictEqual(findOneResponse!.favorites!.get('drink'), 'cola');
                assert.strictEqual(findOneResponse!.nestedSchema!.address!.street, 'street 1');
                assert.strictEqual(findOneResponse!.nestedSchema!.address!.city, 'city 1');
                assert.strictEqual(findOneResponse!.nestedSchema!.address!.state, 'state 1');
                assert.strictEqual(findOneResponse!.uniqueId!.toString(), uniqueIdVal.toString());
                assert.strictEqual(findOneResponse!.category!.toString(), '100');
            } finally {
                await dropCollections(isAstra, astraMongoose, jsonAPIMongoose, 'users');
            }
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
            const whereJSexpressionResp = await Product.$where('this.name === "Product 1"').exec()
            //find command doesn't support   "filter": { "$where": "this.name === \"Product 1\"" }
            assert.strictEqual(whereJSexpressionResp.length, 0);
            //----------------//
        });
        it('API ops tests Model.aggregate()', async () => {
            //Model.aggregate()
            let error: OperationNotSupportedError | null = null;
            try {
                const aggregateResp = await Product.aggregate([{$match: {name: 'Product 1'}}]);
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
                const bulkSaveResp = await Product.bulkSave([product2, product3]);
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
                await Product.cleanIndexes();
            } catch (err: any) {
                error = err;
            }
            //cleanIndexes invokes listIndexes() which is not supported
            assert.strictEqual(error!.message, 'listIndexes() Not Implemented');
        });
        it('API ops tests Model.count()', async () => {
            const product1 = new Product({name: 'Product 1', price: 10, isCertified: true, category: 'cat 1'});
            await product1.save();
            const countResp = await Product.count({name: 'Product 1'});
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
            assert.strictEqual(Product.db.db.name!, db.name);
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
            const modelName = 'User';
            let error: OperationNotSupportedError | null = null;
            try {
                const userSchema = new mongoose.Schema({
                    name: String,
                    age: Number,
                    dob: Date
                });
                userSchema.index({name: 1});
                const User = mongooseInstance!.model(modelName, userSchema);
                await Promise.all(Object.values(mongooseInstance!.connection.models).map(Model => Model.init()));
                const diff = await User.diffIndexes();
            } catch (err: any) {
                error = err;
            } finally {
                await dropCollections(isAstra, astraMongoose, jsonAPIMongoose, 'users');
            }
            assert.ok(error);
            assert.strictEqual(error?.message, 'listIndexes() Not Implemented');
        });
        it('API ops tests Model.discriminator()', async () => {
            //Online products have URL
            const OnlineProduct = Product.discriminator('OnlineProduct', new Schema({url: String}));
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
                const distinctResp = await query.exec();
            } catch (error: any) {
                err = error;
            }
            assert.ok(err);
            assert.strictEqual(err?.message, 'distinct() Not Implemented');
        });
        //TODO - Check getting 'Uncaught OperationNotSupportedError: createIndex() Not Implemented'
        it.skip('API ops tests Model.ensureIndexes()', async () => {
            const modelName = 'User';
            let error: OperationNotSupportedError | null = null;
            try {
                const userSchema = new mongoose.Schema({
                    name: String,
                    age: Number,
                    dob: Date
                });
                userSchema.index({name: 1});
                const User = mongooseInstance!.model(modelName, userSchema);
                await Promise.all(Object.values(mongooseInstance!.connection.models).map(Model => Model.init()));
                await User.ensureIndexes();
            } catch (err: any) {
                error = err;
            } finally {
                await dropCollections(isAstra, astraMongoose, jsonAPIMongoose, 'users');
            }
            assert.ok(error);
            assert.strictEqual(error?.message, 'createIndex() Not Implemented');
        });
        it('API ops tests Model.estimatedDocumentCount()', async () => {
            let error: OperationNotSupportedError | null = null;
            try {
                const product1 = new Product({name: 'Product 1', price: 10, isCertified: true, category: 'cat 1'});
                const product2 = new Product({name: 'Product 2', price: 10, isCertified: true, category: 'cat 2'});
                const product3 = new Product({name: 'Product 3', price: 10, isCertified: true, category: 'cat 1'});
                await Product.insertMany([product1, product2, product3]);
                const documentCount = await Product.estimatedDocumentCount();
            } catch (err: any) {
                error = err;
            }
            assert.ok(error);
            assert.strictEqual(error?.message, 'estimatedDocumentCount() Not Implemented');
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
            const nameArray: Set<String> = new Set(['Product 1', 'Product 3']);
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
        it('API ops tests Model.findByIdAndRemove()', async () => {
            const product1 = new Product({name: 'Product 1', price: 10, isCertified: true, category: 'cat 1'});
            await product1.save();
            const deleteResp = await Product.findByIdAndRemove(product1._id);
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
        it('API ops tests Model.findOneAndRemove()', async () => {
            const product1 = new Product({name: 'Product 1', price: 10, isCertified: true, category: 'cat 2'});
            const product2 = new Product({name: 'Product 2', price: 10, isCertified: true, category: 'cat 2'});
            const product3 = new Product({name: 'Product 3', price: 10, isCertified: true, category: 'cat 1'});
            await Product.insertMany([product1, product2, product3]);
            const deleteResp = await Product.findOneAndRemove({category: 'cat 1'});
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
        //hydrate tests removed since it doesn't make any database calls
        //TODO - Getting Uncaught OperationNotSupportedError: createIndex() Not Implemented
        it.skip('API ops tests Model.init()', async () => {
            const modelName = 'User';
            let error: OperationNotSupportedError | null = null;
            let autoIndexStatus: boolean | undefined;
            try {
                autoIndexStatus = mongooseInstance!.get('autoIndex');
                mongooseInstance!.set('autoIndex', true);
                const userSchema = new mongoose.Schema({
                    name: {type: String, index: true},
                    age: Number,
                    dob: Date
                });
                const User = mongooseInstance!.model(modelName, userSchema);
                await User.init();
            } catch(err: OperationNotSupportedError | any) {
                error = err;
            } finally {
                if(autoIndexStatus != undefined) {
                    mongooseInstance!.set('autoIndex', autoIndexStatus);
                }
                await dropCollections(isAstra, astraMongoose, jsonAPIMongoose, 'users');
            }
            assert.ok(error);
            assert.strictEqual(error?.message, 'createIndex() Not Implemented');
        });
        it('API ops tests Model.insertMany()', async () => {
            const product1 = {name: 'Product 1', price: 10, isCertified: true, category: 'cat 2'};
            const product2 = {name: 'Product 2', price: 10, isCertified: true, category: 'cat 2'};
            const product3 = {name: 'Product 3', price: 10, isCertified: true, category: 'cat 1'};
            const insertResp = await Product.insertMany([product1, product2, product3] , {ordered: true});
            assert.strictEqual(insertResp.length, 3);
            assert.strictEqual(insertResp[0].name, 'Product 1');
            assert.strictEqual(insertResp[1].name, 'Product 2');
            assert.strictEqual(insertResp[2].name, 'Product 3');
        });
        //Model.inspect can not be tested since its a helper for console logging. More info here: https://mongoosejs.com/docs/api/model.html#Model.inspect()
        it('API ops tests Model.listIndexes()', async () => {
            let error: OperationNotSupportedError | null = null;
            try {
                const listIndexesResp = await Product.listIndexes();
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
            assert.strictEqual(docSaved.name, 'Product 1');
            const deleteOneResp = await product1.deleteOne();
            assert.strictEqual(deleteOneResp.name, 'Product 1');
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
               const replaceResp = await Product.replaceOne({category: 'cat 1'}, {name: 'Product 4'});
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
                const session:any = await Product.startSession();
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
                const syncIndexesResp = await Product.syncIndexes();
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
            assert.strictEqual(updateManyResp.acknowledged, true);
            assert.strictEqual(updateManyResp.matchedCount, 2);
            assert.strictEqual(updateManyResp.modifiedCount, 2);
            assert.strictEqual(updateManyResp.upsertedCount, undefined);
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
            assert.strictEqual(updateOneResp.acknowledged, true);
            assert.strictEqual(updateOneResp.matchedCount, 1);
            assert.strictEqual(updateOneResp.modifiedCount, 1);
            assert.strictEqual(updateOneResp.upsertedCount, undefined);
            const findUpdatedDoc = await Product.findOne({category: 'cat 3'});
            assert.strictEqual(findUpdatedDoc?.name, 'Product 3');
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
    });
});
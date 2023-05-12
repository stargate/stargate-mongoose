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
    let Product: Model<any>, astraMongoose: Mongoose | null, jsonAPIMongoose: Mongoose | null;
    beforeEach(async () => {
        ({Product, astraMongoose, jsonAPIMongoose} = await createClientsAndModels(isAstra));
    });
    afterEach(async () => {
        await dropCollections(isAstra, astraMongoose, jsonAPIMongoose, 'products');
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
        let Product: Model<any>, astraMongoose: Mongoose | null = null, jsonAPIMongoose: Mongoose | null = null;
        const productSchema = new mongoose.Schema({
            name: String,
            price: Number,
            expiryDate: Date,
            isCertified: Boolean,
            category: String
        });
        if (isAstra) {
            astraMongoose = await getInstance();
            Product = astraMongoose.model('Product', productSchema);
            // @ts-ignore - these are config options supported by stargate-mongoose but not mongoose
            await astraMongoose.connect(dbUri, {isAstra: true, logSkippedOptions: true});
            await Promise.all(Object.values(astraMongoose.connection.models).map(Model => Model.init()));
        } else {
            // @ts-ignore
            jsonAPIMongoose = await getInstance();
            Product = jsonAPIMongoose.model('Product', productSchema);
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
        return {Product, astraMongoose, jsonAPIMongoose};
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
            assert.strictEqual(saveResponseWithStrictTrue.name, 'Product 1');
            assert.strictEqual(saveResponseWithStrictTrue.price, 10);
            assert.strictEqual(saveResponseWithStrictTrue.isCertified, true);
            assert.strictEqual(saveResponseWithStrictTrue.category, 'cat 1');
            assert.strictEqual(saveResponseWithStrictTrue.extraCol, undefined);
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
            assert.strictEqual(saveResponseWithStrictFalse.name, 'Product 1');
            assert.strictEqual(saveResponseWithStrictFalse.price, 10);
            assert.strictEqual(saveResponseWithStrictFalse.isCertified, true);
            assert.strictEqual(saveResponseWithStrictFalse.category, 'cat 1');
            //to access extraCol, we need to use get method since it is not part of schema
            assert.strictEqual(saveResponseWithStrictFalse.get('extraCol'), 'extra val1');
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
        //TODO
        it.skip('API ops tests Model.applyDefaults()', async () => {
            Model.applyDefaults();
            new Product().applyDefaults({name: 'Product 1', price: 10, isCertified: true, category: 'cat 1'});
        });
        //TODO
        it.skip('API ops tests Model.bulkSave()', async () => {
            //Skipping /node_modules/mongoose/lib/model.js:3442:74
            //Model.bulkSave() error:  TypeError: Cannot read properties of undefined (reading 'find')
            /*try {
                const product2 = new Product({name: 'Product 2', price: 20, isCertified: true, category: 'cat 2'});
                const product3 = new Product({name: 'Product 3', price: 30, isCertified: true, category: 'cat 3'});
                const bulkSaveResp = await Product.bulkSave([product2, product3]);
            } catch (err:any) {
                error = err;
            }
            assert.strictEqual(error!.message, 'bulkSave() Not Implemented');*/
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
        it('API ops tests Model.castObjectResp()', async () => {
            const castObjectResp = Product.castObject({
                name: 'Product 1',
                price: 10,
                isCertified: true,
                category: 'cat 1'
            });
            assert.strictEqual(castObjectResp.name, 'Product 1');
            //----------------//
        });
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
            try {
                Product.schema.index({name: 1});
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
        it.skip('API ops tests Model.diffIndexes()', async () => {
            //TODO
        });
        //TODO - fix this test
        it.skip('API ops tests Model.discriminator()', async () => {
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
            const onlineProduct = new OnlineProduct({
                name: 'Product 1',
                price: 10,
                isCertified: true,
                category: 'cat 1',
                url: 'http://product1.com'
            });
            assert.ok(onlineProduct.url);
        });
    });
});

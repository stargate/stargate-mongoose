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
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const assert_1 = __importDefault(require("assert"));
const fixtures_1 = require("../fixtures");
const mongoose_1 = __importStar(require("mongoose"));
const driver_1 = require("../../src/driver");
const mongooseFixtures_1 = require("../mongooseFixtures");
const connection_1 = require("../../src/driver/connection");
const astra_db_ts_1 = require("@datastax/astra-db-ts");
describe('TABLES: Mongoose Model API level tests', async () => {
    let Product;
    let Cart;
    let mongooseInstance;
    before(async () => {
        ({ Product, Cart, mongooseInstance } = await (0, mongooseFixtures_1.createMongooseCollections)(true));
        await Product.cleanIndexes();
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
            assert_1.default.strictEqual(savedRow.name, 'Product 1');
            assert_1.default.strictEqual(savedRow.price, 10);
            assert_1.default.strictEqual(savedRow.isCertified, true);
            assert_1.default.strictEqual(savedRow.category, 'cat 1');
            // @ts-expect-error
            assert_1.default.strictEqual(savedRow.extraCol, undefined);
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
            assert_1.default.strictEqual(savedRowWithStrictFalse.name, 'Product 1');
            assert_1.default.strictEqual(savedRowWithStrictFalse.price, 10);
            assert_1.default.strictEqual(savedRowWithStrictFalse.isCertified, true);
            assert_1.default.strictEqual(savedRowWithStrictFalse.category, 'cat 1');
            //to access extraCol, we need to use get method since it is not part of schema
            assert_1.default.strictEqual(savedRowWithStrictFalse.get('extraCol'), 'extra val1');
            //since strictQuery is true, extraCol will be removed from filter, so all docs will be returned
            const findResponse = await Product.find({
                category: 'cat 1',
                extraCol: 'extra val1'
            }, null, { strictQuery: true });
            assert_1.default.strictEqual(findResponse.length, 2);
            const findResponseWithStrictQueryFalse = await Product.find({
                category: 'cat 1',
                extraCol: 'extra val1'
            }, null, { strictQuery: false });
            assert_1.default.strictEqual(findResponseWithStrictQueryFalse.length, 1);
            assert_1.default.strictEqual(findResponseWithStrictQueryFalse[0].get('extraCol'), 'extra val1');
            assert_1.default.strictEqual(findResponseWithStrictQueryFalse[0].name, 'Product 1');
        });
    });
    describe('API tests', () => {
        it('API ops tests Model()', async () => {
            //Model()
            const product1 = new Product({ name: 'Product 1', price: 10, isCertified: true, category: 'cat 1' });
            assert_1.default.strictEqual(product1.name, 'Product 1');
        });
        it('API ops tests Model.$where()', async () => {
            //Mode.$where()
            const product1 = new Product({ name: 'Product 1', price: 10, isCertified: true, category: 'cat 1' });
            await product1.save();
            const error = await Product.$where('this.name === "Product 1"').exec().then(() => null, error => error);
            assert_1.default.ok(error instanceof astra_db_ts_1.DataAPIResponseError);
            assert_1.default.strictEqual(error.errorDescriptors[0].message, 'Invalid filter expression: filter clause path (\'$where\') cannot start with `$`');
        });
        it('API ops tests Model.aggregate()', async () => {
            //Model.aggregate()
            const error = await Product.aggregate([{ $match: { name: 'Product 1' } }]).then(() => null, error => error);
            assert_1.default.ok(error instanceof driver_1.OperationNotSupportedError);
            assert_1.default.strictEqual(error.message, 'aggregate() Not Implemented');
            //----------------//
        });
        it('API ops tests Model.bulkWrite()', async () => {
            const product2 = new Product({ name: 'Product 2', price: 20, isCertified: true, category: 'cat 2' });
            const product3 = new Product({ name: 'Product 3', price: 30, isCertified: true, category: 'cat 3' });
            await assert_1.default.rejects(Product.bulkWrite([{ insertOne: { document: product2 } }, { insertOne: { document: product3 } }]), { message: 'bulkWrite() Not Implemented' });
        });
        //castObject skipped as it is not making any database calls
        it('API ops tests Model.cleanIndexes()', async function () {
            const collection = mongooseInstance.connection.collection(Product.collection.collectionName);
            // @ts-expect-error
            Product.schema._indexes = [];
            Product.schema.index({ name: 1 });
            await collection.createIndex({ name: true });
            await collection.createIndex({ price: true }, { name: 'will_drop_index' });
            let indexes = await Product.listIndexes();
            assert_1.default.deepStrictEqual(indexes, [
                {
                    name: 'name',
                    definition: {
                        column: 'name',
                        options: { ascii: false, caseSensitive: true, normalize: false }
                    },
                    indexType: 'regular',
                    key: { name: 1 }
                },
                {
                    name: 'will_drop_index',
                    definition: {
                        column: 'price',
                        options: {}
                    },
                    indexType: 'regular',
                    key: { price: 1 }
                }
            ]);
            const droppedIndexes = await Product.cleanIndexes();
            // Drop "will_drop_index" because not in schema, but keep index on `name`
            assert_1.default.deepStrictEqual(droppedIndexes, ['will_drop_index']);
            indexes = await Product.listIndexes();
            assert_1.default.deepStrictEqual(indexes, [
                {
                    name: 'name',
                    definition: {
                        column: 'name',
                        options: { ascii: false, caseSensitive: true, normalize: false }
                    },
                    indexType: 'regular',
                    key: { name: 1 }
                }
            ]);
            await collection.dropIndex('name');
            // @ts-expect-error
            Product.schema._indexes = [];
        });
        it('API ops tests Model.countDocuments()', async function () {
            await assert_1.default.rejects(Product.countDocuments({ name: 'Product 1' }), { message: 'Cannot use countDocuments() with tables' });
        });
        it('API ops tests Model.create()', async () => {
            const createResp = await Product.create({
                name: 'Product for create',
                price: 10,
                isCertified: true,
                category: 'cat 1'
            });
            assert_1.default.strictEqual(createResp.name, 'Product for create');
        });
        it('API ops tests Model.createIndexes()', async () => {
            // @ts-expect-error
            Product.schema._indexes = [];
            Product.schema.index({ name: 1 });
            await Product.createIndexes();
            const indexes = await mongooseInstance.connection.collection(Product.collection.collectionName).listIndexes().toArray();
            assert_1.default.ok(indexes.find(index => index.name === 'name'));
            await mongooseInstance.connection.collection(Product.collection.collectionName).dropIndex('name');
            // @ts-expect-error
            Product.schema._indexes = [];
        });
        it('API ops tests Model.db', async () => {
            const conn = Product.db;
            assert_1.default.strictEqual(conn.namespace, (0, connection_1.parseUri)(fixtures_1.testClient.uri).keyspaceName);
            // @ts-expect-error
            assert_1.default.strictEqual(conn.db.name, (0, connection_1.parseUri)(fixtures_1.testClient.uri).keyspaceName);
        });
        it('API ops tests Model.deleteOne()', async () => {
            const product1 = new Product({ name: 'Product 1', price: 10, isCertified: true, category: 'cat 1' });
            await product1.save();
            await Product.deleteOne({ _id: product1._id });
            const findDeletedDoc = await Product.findOne({ name: 'Product 1' });
            assert_1.default.strictEqual(findDeletedDoc, null);
        });
        it('API ops tests Model.diffIndexes()', async () => {
            await Product.diffIndexes();
        });
        it('API ops tests Model.discriminator()', async () => {
            //Online products have URL
            const OnlineProduct = Product.discriminator('OnlineProduct', new mongoose_1.Schema({ url: String }), { overwriteModels: true });
            const regularProduct = new Product({
                name: 'Product 1',
                price: 10,
                isCertified: true,
                category: 'cat 1',
                url: 'http://product1.com'
            });
            // @ts-expect-error
            assert_1.default.ok(!regularProduct.url);
            await regularProduct.save();
            const regularProductSaved = await Product.findOne({ name: 'Product 1' }).orFail();
            assert_1.default.strictEqual(regularProductSaved.name, 'Product 1');
            assert_1.default.strictEqual(regularProductSaved.price, 10);
            assert_1.default.strictEqual(regularProductSaved.isCertified, true);
            assert_1.default.strictEqual(regularProductSaved.category, 'cat 1');
            // @ts-expect-error
            assert_1.default.ok(!regularProductSaved.url);
            const onlineProduct = new OnlineProduct({
                name: 'Product 2',
                price: 10,
                isCertified: true,
                category: 'cat 1',
                url: 'http://product1.com'
            });
            await onlineProduct.save();
            const onlineProductSaved = await OnlineProduct.findOne({ name: 'Product 2' });
            assert_1.default.strictEqual(onlineProductSaved.name, 'Product 2');
            assert_1.default.strictEqual(onlineProductSaved.price, 10);
            assert_1.default.strictEqual(onlineProductSaved.isCertified, true);
            assert_1.default.strictEqual(onlineProductSaved.category, 'cat 1');
            assert_1.default.ok(onlineProduct.url);
        });
        it('API ops tests Model.distinct()', async () => {
            const product1 = new Product({ name: 'Product 1', price: 10, isCertified: true, category: 'cat 1' });
            const product2 = new Product({ name: 'Product 2', price: 10, isCertified: true, category: 'cat 2' });
            const product3 = new Product({ name: 'Product 3', price: 10, isCertified: true, category: 'cat 1' });
            await Product.insertMany([product1, product2, product3]);
            const err = await Product.distinct('category').exec().then(() => null, error => error);
            assert_1.default.ok(err instanceof driver_1.OperationNotSupportedError);
            assert_1.default.strictEqual(err.message, 'distinct() Not Implemented');
        });
        it('API ops tests Model.estimatedDocumentCount()', async function () {
            await assert_1.default.rejects(Product.estimatedDocumentCount(), { message: 'Cannot use estimatedDocumentCount() with tables' });
        });
        //skipping Model.events() as it is not making any database calls
        it('API ops tests Model.exists()', async () => {
            const product1 = new Product({ name: 'Product 1', price: 10, isCertified: true, category: 'cat 1' });
            await product1.save();
            const existsResp = await Product.exists({ name: 'Product 1' });
            assert_1.default.ok(existsResp);
        });
        it('API ops tests Model.find()', async () => {
            const product1 = new Product({ name: 'Product 1', price: 10, isCertified: true, category: 'cat 1' });
            const product2 = new Product({ name: 'Product 2', price: 10, isCertified: true, category: 'cat 2' });
            const product3 = new Product({ name: 'Product 3', price: 10, isCertified: true, category: 'cat 1' });
            await Product.insertMany([product1, product2, product3]);
            const findResp = await Product.find({ category: 'cat 1' });
            assert_1.default.strictEqual(findResp.length, 2);
            const nameArray = new Set(['Product 1', 'Product 3']);
            for (const doc of findResp) {
                assert_1.default.strictEqual(doc.category, 'cat 1');
                assert_1.default.ok(doc.name);
                assert_1.default.strictEqual(nameArray.has(doc.name), true);
                nameArray.delete(doc.name);
            }
            // Supports callbacks because some older versions of Mongoose require callbacks.
            /*await new Promise((resolve, reject) => {

            });*/
        });
        it('API ops tests Model.findById()', async () => {
            const product1 = new Product({ name: 'Product 1', price: 10, isCertified: true, category: 'cat 1' });
            await product1.save();
            const findResp = await Product.findById(product1._id);
            assert_1.default.strictEqual(findResp?.name, 'Product 1');
        });
        it('API ops tests Model.findOne()', async () => {
            const product1 = new Product({ name: 'Product 1', price: 10, isCertified: true, category: 'cat 2' });
            const product2 = new Product({ name: 'Product 2', price: 10, isCertified: true, category: 'cat 2' });
            const product3 = new Product({ name: 'Product 3', price: 10, isCertified: true, category: 'cat 1' });
            await Product.insertMany([product1, product2, product3]);
            const findResp = await Product.findOne({ category: 'cat 1' });
            assert_1.default.strictEqual(findResp?.category, 'cat 1');
        });
        it('API ops tests Model.findOneAndUpdate()', async function () {
            await assert_1.default.rejects(Product.findOneAndUpdate({ category: 'cat 1' }, { name: 'Product 4' }), { message: 'Cannot use findOneAndUpdate() with tables' });
        });
        it('API ops tests Model.insertMany()', async () => {
            const product1Id = new mongoose_1.default.Types.ObjectId('0'.repeat(24));
            const product2Id = new mongoose_1.default.Types.ObjectId('1'.repeat(24));
            const product3Id = new mongoose_1.default.Types.ObjectId('2'.repeat(24));
            const product1 = { _id: product1Id, name: 'Product 1', price: 10, isCertified: true, category: 'cat 2' };
            const product2 = { _id: product2Id, name: 'Product 2', price: 10, isCertified: true, category: 'cat 2' };
            const product3 = { _id: product3Id, name: 'Product 3', price: 10, isCertified: true, category: 'cat 1' };
            const insertResp = await Product.insertMany([product1, product2, product3], { ordered: true, rawResult: true });
            assert_1.default.strictEqual(insertResp.insertedCount, 3);
            let docs = [];
            for (let i = 0; i < 21; ++i) {
                docs.push({ name: 'Test product ' + i, price: 10, isCertified: true });
            }
            const respOrdered = await Product.insertMany(docs, { rawResult: true });
            assert_1.default.strictEqual(respOrdered.insertedCount, 21);
            docs = [];
            for (let i = 0; i < 21; ++i) {
                docs.push({ name: 'Test product ' + i, price: 10, isCertified: true });
            }
            const respUnordered = await Product.insertMany(docs, { ordered: false, rawResult: true });
            assert_1.default.strictEqual(respUnordered.insertedCount, 21);
        });
        it.skip('API ops tests Model.insertMany() with returnDocumentResponses', async () => {
            const product1Id = new mongoose_1.default.Types.ObjectId('0'.repeat(24));
            const product2Id = new mongoose_1.default.Types.ObjectId('1'.repeat(24));
            const product3Id = new mongoose_1.default.Types.ObjectId('2'.repeat(24));
            const product1 = { _id: product1Id, name: 'Product 1', price: 10, isCertified: true, category: 'cat 2' };
            const product2 = { _id: product2Id, name: 'Product 2', price: 10, isCertified: true, category: 'cat 2' };
            const product3 = { _id: product3Id, name: 'Product 3', price: 10, isCertified: true, category: 'cat 1' };
            const respWithResponses = await Product.insertMany([product1, product2, product3], { returnDocumentResponses: true, rawResult: true });
            // @ts-expect-error
            assert_1.default.deepStrictEqual(respWithResponses.documentResponses, [
                { _id: '0'.repeat(24), status: 'OK' },
                { _id: '1'.repeat(24), status: 'OK' },
                { _id: '2'.repeat(24), status: 'OK' }
            ]);
            const err = await Product.insertMany([product1, product2, product3], { returnDocumentResponses: true }).then(() => null, err => err);
            assert_1.default.deepStrictEqual(err.status.documentResponses, [
                { _id: '0'.repeat(24), status: 'ERROR', errorsIdx: 0 },
                { _id: '1'.repeat(24), status: 'ERROR', errorsIdx: 1 },
                { _id: '2'.repeat(24), status: 'ERROR', errorsIdx: 2 }
            ]);
        });
        //Model.inspect can not be tested since it is a helper for console logging. More info here: https://mongoosejs.com/docs/api/model.html#Model.inspect()
        it('API ops tests Model.listIndexes()', async () => {
            const collection = mongooseInstance.connection.collection(Product.collection.collectionName);
            await collection.createIndex({ name: true }, { name: 'test_index' });
            const indexes = await Product.listIndexes();
            assert_1.default.deepStrictEqual(indexes, [
                {
                    name: 'test_index',
                    definition: {
                        column: 'name',
                        options: { ascii: false, caseSensitive: true, normalize: false }
                    },
                    indexType: 'regular',
                    key: { name: 1 }
                }
            ]);
            await collection.dropIndex('test_index');
        });
        it('API ops tests Model.populate()', async () => {
            const product1 = new Product({ name: 'Product 1', price: 10, isCertified: true, category: 'cat 2' });
            const product2 = new Product({ name: 'Product 2', price: 10, isCertified: true, category: 'cat 2' });
            const product3 = new Product({ name: 'Product 3', price: 10, isCertified: true, category: 'cat 1' });
            await Product.insertMany([product1, product2, product3]);
            const cart1 = new Cart({ name: 'Cart 1', products: [product1._id, product2._id] });
            await Cart.insertMany([cart1]);
            const populateResp = await Cart.findOne({ name: 'Cart 1' }).populate('products');
            assert_1.default.strictEqual(populateResp?.products.length, 2);
            assert_1.default.strictEqual(populateResp?.products[0].name, 'Product 1');
            assert_1.default.strictEqual(populateResp?.products[1].name, 'Product 2');
        });
        it('API ops tests Model.findOneAndDelete()', async function () {
            await assert_1.default.rejects(Product.findOneAndDelete({ category: 'cat 1' }), { message: 'Cannot use findOneAndDelete() with tables' });
        });
        it('API ops tests Model.prototype.deleteOne()', async () => {
            const product1 = new Product({ name: 'Product 1', price: 10, isCertified: true, category: 'cat 1' });
            await product1.save();
            const docSaved = await Product.findOne({ name: 'Product 1' });
            assert_1.default.strictEqual(docSaved.name, 'Product 1');
            await product1.deleteOne();
            const findDeletedDoc = await Product.findOne({ name: 'Product 1' });
            assert_1.default.strictEqual(findDeletedDoc, null);
        });
        it('API ops tests Model.replaceOne()', async function () {
            await assert_1.default.rejects(Product.replaceOne({ category: 'cat 1' }, { name: 'Product 4' }), /Cannot use replaceOne\(\) with tables/);
        });
        //Model.schema() is skipped since it doesn't make any database calls. More info here: https://mongoosejs.com/docs/api/model.html#Model.schema
        it('API ops tests Model.startSession()', async () => {
            const product1 = new Product({ name: 'Product 1', price: 10, isCertified: true, category: 'cat 2' });
            const product2 = new Product({ name: 'Product 2', price: 10, isCertified: true, category: 'cat 2' });
            const product3 = new Product({ name: 'Product 3', price: 10, isCertified: true, category: 'cat 1' });
            await Product.insertMany([product1, product2, product3]);
            assert_1.default.throws(() => Product.startSession(), { message: 'startSession() Not Implemented' });
        });
        it('API ops tests Model.syncIndexes()', async () => {
            const collection = mongooseInstance.connection.collection(Product.collection.collectionName);
            await collection.createIndex({ category: true }, { name: 'will_drop_index' });
            await collection.createIndex({ price: true });
            const testProductSchema = new mongooseInstance.Schema({
                name: { type: String, index: true }, // Index doesn't exist in db, will create
                price: { type: Number, index: true }, // Index exists in db
                expiryDate: Date,
                isCertified: Boolean,
                category: String // Index exists in db but not in schema, will drop
            }, { autoCreate: false, autoIndex: false });
            const ProductIndexModel = mongooseInstance.model('ProductIndexes', testProductSchema, Product.collection.collectionName);
            const stringIndexOptions = { ascii: false, caseSensitive: true, normalize: false };
            let indexes = await ProductIndexModel.listIndexes();
            assert_1.default.deepStrictEqual(indexes.sort((i1, i2) => i1.name.localeCompare(i2.name)), [
                {
                    name: 'price',
                    definition: {
                        column: 'price',
                        options: {}
                    },
                    indexType: 'regular',
                    key: { price: 1 }
                },
                {
                    name: 'will_drop_index',
                    definition: {
                        column: 'category',
                        options: stringIndexOptions
                    },
                    indexType: 'regular',
                    key: { category: 1 }
                }
            ]);
            try {
                const droppedIndexes = await ProductIndexModel.syncIndexes();
                // Drop "will_drop_index" because not in schema, but keep index on `price`
                assert_1.default.deepStrictEqual(droppedIndexes, ['will_drop_index']);
                indexes = await ProductIndexModel.listIndexes();
                assert_1.default.deepStrictEqual(indexes, [
                    {
                        name: 'name',
                        definition: {
                            column: 'name',
                            options: stringIndexOptions
                        },
                        indexType: 'regular',
                        key: { name: 1 }
                    },
                    {
                        name: 'price',
                        definition: {
                            column: 'price',
                            options: {}
                        },
                        indexType: 'regular',
                        key: { price: 1 }
                    }
                ]);
            }
            finally {
                await collection.dropIndex('name').catch(() => { });
                await collection.dropIndex('price').catch(() => { });
            }
        });
        it('API ops tests Model.updateOne()', async () => {
            const product1 = new Product({ name: 'Product 1', price: 10, isCertified: true, category: 'cat 2' });
            const product2 = new Product({ name: 'Product 2', price: 10, isCertified: true, category: 'cat 2' });
            const product3 = new Product({ name: 'Product 3', price: 10, isCertified: true, category: 'cat 1' });
            await Product.insertMany([product1, product2, product3]);
            await Product.updateOne({ _id: product3._id }, { category: 'cat 3' });
            const findUpdatedDoc = await Product.findOne({ category: 'cat 3' });
            assert_1.default.strictEqual(findUpdatedDoc?.name, 'Product 3');
        });
        it('API ops tests Model.updateMany()', async function () {
            await assert_1.default.rejects(Product.updateMany({ category: 'cat 1' }, { name: 'Product 4' }), { message: 'Cannot use updateMany() with tables' });
        });
        it('API ops tests Model.updateOne() with upsert', async function () {
            const _id = new mongoose_1.default.Types.ObjectId();
            await Product.updateOne({ _id }, { name: 'Product upsert' }, { upsert: true });
            const doc = await Product.findOne({ _id }).orFail();
            assert_1.default.strictEqual(doc.name, 'Product upsert');
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
            assert_1.default.deepStrictEqual(doc.toObject().user, { name: 'test updated subdoc' });
        });
        //Model.validate is skipped since it doesn't make any database calls. More info here: https://mongoosejs.com/docs/api/model.html#Model.validate
        it('API ops tests Model.watch()', async () => {
            const product1 = new Product({ name: 'Product 1', price: 10, isCertified: true, category: 'cat 2' });
            await product1.save();
            assert_1.default.throws(() => Product.watch().on('change', (change) => {
                assert_1.default.strictEqual(change.operationType, 'delete');
                assert_1.default.strictEqual(change.documentKey._id.toString(), product1._id.toString());
            }), { message: 'watch() Not Implemented' });
        });
        it('API ops tests Model.where()', async () => {
            const product1 = new Product({ name: 'Product 1', price: 10, isCertified: true, category: 'cat 2' });
            await product1.save();
            const whereResp = await Product.where('name').equals('Product 1');
            assert_1.default.strictEqual(whereResp.length, 1);
            assert_1.default.strictEqual(whereResp[0].name, 'Product 1');
        });
        it('API ops tests Query cursor', async () => {
            await Product.create(
            // Product 01 -> Product 25
            Array.from({ length: 25 }, (_, index) => ({
                name: `Product ${(index + 1).toString().padStart(2, '0')}`,
                price: 10
            })));
            let cursor = Product.find().sort({ name: 1 }).cursor();
            for (let i = 0; i < 20; ++i) {
                const product = await cursor.next();
                assert_1.default.equal(product?.name, `Product ${(i + 1).toString().padStart(2, '0')}`, 'Failed at index ' + i);
            }
            assert_1.default.equal(await cursor.next(), null);
            cursor = await Product.find().sort({ name: 1 }).limit(20).cursor();
            for (let i = 0; i < 20; ++i) {
                await cursor.next();
            }
            assert_1.default.equal(await cursor.next(), null);
        });
        it('API ops tests Model.db.collection()', async () => {
            const product1 = new Product({ name: 'Product 1', price: 10, isCertified: true, category: 'cat 2' });
            await product1.save();
            const res = await mongooseInstance.connection.collection(Product.collection.collectionName).findOne({});
            assert_1.default.equal(res.name, 'Product 1');
        });
        it('API ops tests connection.runCommand()', async () => {
            const res = await mongooseInstance.connection.runCommand({ listTables: {} });
            assert_1.default.ok(res.status?.tables?.includes(Cart.collection.collectionName));
        });
        it('API ops tests collection.runCommand()', async function () {
            const res = await mongooseInstance.connection.collection('carts').runCommand({ find: {} });
            assert_1.default.ok(Array.isArray(res.data.documents));
        });
        it('API ops tests createConnection() with uri and options', async function () {
            const connection = mongooseInstance.createConnection(fixtures_1.testClient.uri, fixtures_1.testClient.options);
            await connection.asPromise();
            const promise = connection.listTables({ nameOnly: false });
            assert_1.default.ok((await promise.then(res => res.map(obj => obj.name))).includes(Product.collection.collectionName));
            await assert_1.default.rejects(mongooseInstance.createConnection('invalid url', fixtures_1.testClient.options).asPromise(), /Invalid URL/);
            await assert_1.default.rejects(mongooseInstance.createConnection('', fixtures_1.testClient.options).asPromise(), /Invalid URI: keyspace is required/);
            await assert_1.default.rejects(mongooseInstance.createConnection('http://localhost:8181', fixtures_1.testClient.options).asPromise(), /Invalid URI: keyspace is required/);
            await assert_1.default.rejects(mongooseInstance.createConnection('https://apps.astra.datastax.com/api/json/v1/test?applicationToken=test1&applicationToken=test2', fixtures_1.testClient.options).asPromise(), /Invalid URI: multiple application tokens/);
            await assert_1.default.rejects(mongooseInstance.createConnection('https://apps.astra.datastax.com/api/json/v1/test?authHeaderName=test1&authHeaderName=test2', fixtures_1.testClient.options).asPromise(), /Invalid URI: multiple application auth header names/);
            if (!fixtures_1.testClient?.isAstra) {
                // Omit username and password from options
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                const { username: _username, password: _password, ...options } = fixtures_1.testClient.options;
                await assert_1.default.rejects(mongooseInstance.createConnection(fixtures_1.testClient.uri, options).asPromise(), /Username and password are required when connecting to self-hosted DSE/);
            }
        });
        it('API ops tests createConnection() with queueing', async function () {
            const connection = mongooseInstance.createConnection();
            const promise = connection.listTables({ nameOnly: false });
            await connection.openUri(fixtures_1.testClient.uri, fixtures_1.testClient.options);
            assert_1.default.ok((await promise.then(res => res.map(obj => obj.name))).includes(Product.collection.collectionName));
        });
        it('API ops tests createConnection() with no buffering', async function () {
            const connection = mongooseInstance.createConnection(fixtures_1.testClient.uri, { ...fixtures_1.testClient.options, bufferCommands: false });
            await connection.asPromise();
            await connection.close();
            await assert_1.default.rejects(connection.listCollections({}), /Connection is not connected/);
        });
        it('API ops tests dropIndex()', async function () {
            const collection = mongooseInstance.connection.collection(Product.collection.collectionName);
            await collection.createIndex({ name: true }, { name: 'test_index' });
            let indexes = await Product.listIndexes();
            assert_1.default.deepStrictEqual(indexes, [
                {
                    name: 'test_index',
                    definition: {
                        column: 'name',
                        options: { ascii: false, caseSensitive: true, normalize: false }
                    },
                    indexType: 'regular',
                    key: { name: 1 }
                }
            ]);
            await collection.dropIndex('test_index');
            indexes = await Product.listIndexes();
            assert_1.default.deepStrictEqual(indexes, []);
        });
        it('API ops tests setClient()', async function () {
            assert_1.default.throws(() => mongooseInstance.connection.setClient(mongooseInstance.connection.client), /SetClient not supported/);
        });
    });
});
//# sourceMappingURL=tables.api.test.js.map
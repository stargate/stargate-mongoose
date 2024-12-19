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
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const assert_1 = __importDefault(require("assert"));
const mongoose_1 = __importDefault(require("mongoose"));
const StargateMongooseDriver = __importStar(require("../../src/driver"));
const fixtures_1 = require("../fixtures");
const mongooseFixtures_1 = require("../mongooseFixtures");
describe('Driver based tests', async () => {
    let dbUri;
    let isAstra;
    before(async function () {
        if (fixtures_1.testClient == null) {
            return this.skip();
        }
        dbUri = fixtures_1.testClient.uri;
        isAstra = fixtures_1.testClient.isAstra;
    });
    describe('StargateMongoose - index', () => {
        it('should leverage astradb', async function () {
            await Promise.all([mongooseFixtures_1.Product.deleteMany({}), mongooseFixtures_1.Cart.deleteMany({})]);
            const product1 = new mongooseFixtures_1.Product({
                name: 'Product 1',
                price: 10,
                expiryDate: new Date('2024-04-20T00:00:00.000Z'),
                isCertified: true
            });
            await product1.save();
            const product2 = new mongooseFixtures_1.Product({
                name: 'Product 2',
                price: 10,
                expiryDate: new Date('2024-11-20T00:00:00.000Z'),
                isCertified: false
            });
            await product2.save();
            const cart = new mongooseFixtures_1.Cart({
                name: 'My Cart',
                cartName: 'wewson',
                products: [product1._id, product2._id]
            });
            await cart.save();
            assert_1.default.strictEqual(await mongooseFixtures_1.Cart.findOne({ cartName: 'wewson' }).select('name').orFail().exec().then((doc) => doc.name), cart.name);
            //compare if product expiryDate is same as saved
            assert_1.default.strictEqual(await mongooseFixtures_1.Product.findOne({ name: 'Product 1' }).select('expiryDate').orFail().exec().then((doc) => doc.expiryDate.toISOString()), product1.expiryDate.toISOString());
            const findOneAndReplaceResp = await mongooseFixtures_1.Cart.findOneAndReplace({ cartName: 'wewson' }, {
                name: 'My Cart 2',
                cartName: 'wewson1'
            }, { returnDocument: 'after' }).exec();
            assert_1.default.strictEqual(findOneAndReplaceResp.name, 'My Cart 2');
            assert_1.default.strictEqual(findOneAndReplaceResp.cartName, 'wewson1');
            const productNames = [];
            const cursor = await mongooseFixtures_1.Product.find().cursor();
            await cursor.eachAsync(p => productNames.push(p.name));
            assert_1.default.deepEqual(productNames.sort(), ['Product 1', 'Product 2']);
            await cart.deleteOne();
            assert_1.default.strictEqual(await mongooseFixtures_1.Cart.findOne({ cartName: 'wewson' }), null);
        });
    });
    describe('Mongoose API', () => {
        const personSchema = new mongooseFixtures_1.mongooseInstance.Schema({
            name: { type: String, required: true }
        });
        const Person = mongooseFixtures_1.mongooseInstance.model('Person', personSchema, fixtures_1.TEST_COLLECTION_NAME);
        before(async function () {
            const collections = await mongooseFixtures_1.mongooseInstance.connection.listCollections();
            const collectionNames = collections.map(({ name }) => name);
            if (!collectionNames.includes(fixtures_1.TEST_COLLECTION_NAME)) {
                await Person.createCollection();
            }
        });
        after(async () => {
            await Person.deleteMany({});
        });
        it('handles find cursors', async () => {
            const Person = mongooseFixtures_1.mongooseInstance.model('Person');
            await Person.deleteMany({});
            await Person.create([{ name: 'John' }, { name: 'Bill' }]);
            const names = [];
            const cursor = await Person.find().cursor();
            await cursor.eachAsync(doc => names.push(doc.name));
            assert_1.default.deepEqual(names.sort(), ['Bill', 'John']);
        });
        it('handles document deleteOne() and updateOne()', async () => {
            const Person = mongooseFixtures_1.mongooseInstance.model('Person');
            await Person.deleteMany({});
            const [person1] = await Person.create([{ name: 'John' }, { name: 'Bill' }]);
            await person1.updateOne({ name: 'Joe' });
            let names = await Person.find();
            assert_1.default.deepEqual(names.map(doc => doc.name).sort(), ['Bill', 'Joe']);
            await person1.deleteOne();
            names = await Person.find();
            assert_1.default.deepEqual(names.map(doc => doc.name).sort(), ['Bill']);
        });
        it('handles updating existing document with save()', async () => {
            const Person = mongooseFixtures_1.mongooseInstance.model('Person');
            await Person.deleteMany({});
            const [person] = await Person.create([{ name: 'John' }]);
            person.name = 'Joe';
            await person.save();
            const names = await Person.find();
            assert_1.default.deepEqual(names.map(doc => doc.name).sort(), ['Joe']);
        });
        it('handles populate()', async () => {
            const Product = mongooseFixtures_1.mongooseInstance.model('Product');
            await Promise.all([mongooseFixtures_1.Cart.deleteMany({}), Product.deleteMany({})]);
            const [{ _id: productId }] = await Product.create([
                { name: 'iPhone 12', price: 500 },
                { name: 'MacBook Air', price: 1400 }
            ]);
            const { _id: cartId } = await mongooseFixtures_1.Cart.create({ name: 'test', products: [productId] });
            const cart = await mongooseFixtures_1.Cart.findById(cartId).populate('products').orFail();
            assert_1.default.deepEqual(cart.products.map(p => p.name), ['iPhone 12']);
        });
        it('handles exists()', async () => {
            const Person = mongooseFixtures_1.mongooseInstance.model('Person');
            await Person.deleteMany({});
            await Person.create([{ name: 'John' }]);
            assert_1.default.ok(await Person.exists({ name: 'John' }));
            assert_1.default.ok(!(await Person.exists({ name: 'James' })));
        });
        it('handles insertMany()', async () => {
            const Person = mongooseFixtures_1.mongooseInstance.model('Person');
            await Person.deleteMany({});
            await Person.insertMany([{ name: 'John' }, { name: 'Bill' }]);
            const docs = await Person.find();
            assert_1.default.deepEqual(docs.map(doc => doc.name).sort(), ['Bill', 'John']);
        });
        it('throws readable error on bulkWrite()', async () => {
            const Person = mongooseFixtures_1.mongooseInstance.model('Person');
            await Person.deleteMany({});
            await assert_1.default.rejects(Person.bulkWrite([{ insertOne: { document: { name: 'John' } } }]), /bulkWrite\(\) Not Implemented/);
        });
        it('throws readable error on aggregate()', async () => {
            const Person = mongooseFixtures_1.mongooseInstance.model('Person');
            await Person.deleteMany({});
            await assert_1.default.rejects(Person.aggregate([{ $match: { name: 'John' } }]), /aggregate\(\) Not Implemented/);
        });
        it('throws readable error on change stream', async () => {
            const Person = mongooseFixtures_1.mongooseInstance.model('Person');
            await Person.init();
            await Person.deleteMany({});
            await assert_1.default.throws(() => Person.watch([{ $match: { name: 'John' } }]), /watch\(\) Not Implemented/);
        });
        it('handles reconnecting after disconnecting', async () => {
            const mongooseInstance = await createMongooseInstance();
            const TestModel = mongooseInstance.model('Person', Person.schema, fixtures_1.TEST_COLLECTION_NAME);
            const collectionNames = await TestModel.db.listCollections().then(collections => collections.map(c => c.name));
            if (!collectionNames.includes(fixtures_1.TEST_COLLECTION_NAME)) {
                await TestModel.createCollection();
            }
            await TestModel.findOne();
            await mongooseInstance.disconnect();
            const options = isAstra ? { isAstra: true } : { username: process.env.STARGATE_USERNAME, password: process.env.STARGATE_PASSWORD };
            await mongooseInstance.connect(dbUri, options);
            // Should be able to execute query after reconnecting
            await TestModel.findOne();
            await mongooseInstance.disconnect();
        });
        it('handles listCollections()', async () => {
            const collections = await mongooseFixtures_1.mongooseInstance.connection.listCollections();
            const collectionNames = collections.map(({ name }) => name);
            assert_1.default.ok(typeof collectionNames[0] === 'string', collectionNames.join(','));
        });
        async function createMongooseInstance() {
            const mongooseInstance = new mongoose_1.default.Mongoose();
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
            const mongooseInstance = new mongoose_1.default.Mongoose();
            mongooseInstance.setDriver(StargateMongooseDriver);
            mongooseInstance.set('autoCreate', false);
            mongooseInstance.set('autoIndex', false);
            const options = isAstra ? { isAstra: true } : { username: process.env.STARGATE_USERNAME, password: process.env.STARGATE_PASSWORD };
            await mongooseInstance.connect(dbUri, options);
            await assert_1.default.rejects(() => mongooseInstance.connection.dropDatabase(), { message: 'dropDatabase() Not Implemented' });
            mongooseInstance.connection.getClient().close();
        });
    });
});
//# sourceMappingURL=index.test.js.map
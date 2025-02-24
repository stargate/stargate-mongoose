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
const mongoose_1 = __importDefault(require("mongoose"));
const StargateMongooseDriver = __importStar(require("../../src/driver"));
const fixtures_1 = require("../fixtures");
const mongooseFixtures_1 = require("../mongooseFixtures");
const tableDefinitionFromSchema_1 = __importDefault(require("../../src/tableDefinitionFromSchema"));
describe('TABLES: driver based tests', async () => {
    let Product;
    let Cart;
    let mongooseInstance;
    before(async function createTables() {
        ({ Product, Cart, mongooseInstance } = await (0, mongooseFixtures_1.createMongooseCollections)(true));
    });
    let dbUri;
    let isAstra;
    before(function () {
        dbUri = fixtures_1.testClient.uri;
        isAstra = fixtures_1.testClient.isAstra;
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
            assert_1.default.strictEqual(await Cart.findOne({ cartName: 'wewson' }).select('name').orFail().exec().then((doc) => doc.name), cart.name);
            //compare if product expiryDate is same as saved
            assert_1.default.strictEqual(await Product.findOne({ name: 'Product 1' }).select('expiryDate').orFail().exec().then((doc) => doc.expiryDate.toISOString()), product1.expiryDate.toISOString());
            await Cart.updateOne({ _id: cart._id }, {
                name: 'My Cart 2',
                cartName: 'wewson1',
                products: null
            });
            const doc = await Cart.findOne({ cartName: 'wewson1' }).orFail();
            assert_1.default.strictEqual(doc.name, 'My Cart 2');
            assert_1.default.strictEqual(doc.cartName, 'wewson1');
            const productNames = [];
            const cursor = await Product.find().cursor();
            await cursor.eachAsync(p => productNames.push(p.name));
            assert_1.default.deepEqual(productNames.sort(), ['Product 1', 'Product 2']);
            await cart.deleteOne();
            assert_1.default.strictEqual(await Cart.findOne({ cartName: 'wewson' }), null);
        });
    });
    describe('Mongoose API', () => {
        const personSchema = new mongoose_1.default.Schema({
            name: { type: String, required: true }
        });
        let Person;
        before(async function () {
            mongooseInstance.deleteModel(/Person/);
            Person = mongooseInstance.model('Person', personSchema, fixtures_1.TEST_TABLE_NAME);
            const tables = await mongooseInstance.connection.listTables();
            const table = tables.find(table => table.name === fixtures_1.TEST_TABLE_NAME);
            if (table == null) {
                await mongooseInstance.connection.createTable(fixtures_1.TEST_TABLE_NAME, (0, tableDefinitionFromSchema_1.default)(personSchema));
            }
            else {
                const columns = (0, tableDefinitionFromSchema_1.default)(personSchema).columns;
                if (Object.keys(columns).find(columnName => !table.definition.columns[columnName])) {
                    await mongooseInstance.connection.dropTable(fixtures_1.TEST_TABLE_NAME);
                    await mongooseInstance.connection.createTable(fixtures_1.TEST_TABLE_NAME, (0, tableDefinitionFromSchema_1.default)(personSchema));
                }
            }
        });
        after(async () => {
            await Person.deleteMany({});
        });
        it('handles find cursors', async () => {
            const Person = mongooseInstance.model('Person');
            await Person.deleteMany({});
            await Person.create([{ name: 'John' }, { name: 'Bill' }]);
            const names = [];
            const cursor = await Person.find().cursor();
            await cursor.eachAsync(doc => names.push(doc.name));
            assert_1.default.deepEqual(names.sort(), ['Bill', 'John']);
        });
        it('handles document deleteOne() and updateOne()', async () => {
            const Person = mongooseInstance.model('Person');
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
            const Person = mongooseInstance.model('Person');
            await Person.deleteMany({});
            const [person] = await Person.create([{ name: 'John' }]);
            person.name = 'Joe';
            await person.save();
            const names = await Person.find();
            assert_1.default.deepEqual(names.map(doc => doc.name).sort(), ['Joe']);
        });
        it('handles populate()', async () => {
            // Skip for now because populate is blocked by stargate/data-api#1532
            const Product = mongooseInstance.model('Product');
            await Promise.all([Cart.deleteMany({}), Product.deleteMany({})]);
            const [{ _id: productId }] = await Product.create([
                { name: 'iPhone 12', price: 500 },
                { name: 'MacBook Air', price: 1400 }
            ]);
            const { _id: cartId } = await Cart.create({ name: 'test', products: [productId] });
            const cart = await Cart.findById(cartId).populate('products').orFail();
            assert_1.default.deepEqual(cart.products.map(p => p.name), ['iPhone 12']);
        });
        it('handles exists()', async () => {
            const Person = mongooseInstance.model('Person');
            await Person.deleteMany({});
            await Person.create([{ name: 'John' }]);
            assert_1.default.ok(await Person.exists({ name: 'John' }));
            assert_1.default.ok(!(await Person.exists({ name: 'James' })));
        });
        it('handles insertMany()', async () => {
            const Person = mongooseInstance.model('Person');
            await Person.deleteMany({});
            await Person.insertMany([{ name: 'John' }, { name: 'Bill' }]);
            const docs = await Person.find();
            assert_1.default.deepEqual(docs.map(doc => doc.name).sort(), ['Bill', 'John']);
        });
        it('throws readable error on bulkWrite()', async () => {
            const Person = mongooseInstance.model('Person');
            await Person.deleteMany({});
            await assert_1.default.rejects(Person.bulkWrite([{ insertOne: { document: { name: 'John' } } }]), /bulkWrite\(\) Not Implemented/);
        });
        it('throws readable error on aggregate()', async () => {
            const Person = mongooseInstance.model('Person');
            await Person.deleteMany({});
            await assert_1.default.rejects(Person.aggregate([{ $match: { name: 'John' } }]), /aggregate\(\) Not Implemented/);
        });
        it('throws readable error on change stream', async () => {
            const Person = mongooseInstance.model('Person');
            await Person.init();
            await Person.deleteMany({});
            assert_1.default.throws(() => Person.watch([{ $match: { name: 'John' } }]), /watch\(\) Not Implemented/);
        });
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
//# sourceMappingURL=tables.driver.test.js.map
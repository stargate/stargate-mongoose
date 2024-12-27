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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const assert_1 = __importDefault(require("assert"));
const mongoose_1 = __importDefault(require("mongoose"));
const mongooseFixtures_1 = require("../../tests/mongooseFixtures");
describe('Options tests', async () => {
    beforeEach(async function () {
        await mongooseFixtures_1.Product.deleteMany({});
    });
    afterEach(async function () {
        await mongooseFixtures_1.Product.deleteMany({});
    });
    describe('options cleanup tests', () => {
        it('should cleanup insertManyOptions', async () => {
            // @ts-expect-error
            const products = [new mongooseFixtures_1.Product({ name: 'Product 2', price: 10, isCertified: true }), new mongooseFixtures_1.Product({ name: 'Product 1', price: 10, isCertified: false })];
            //rawResult options should be cleaned up by stargate-mongoose, but 'ordered' should be preserved
            const insertManyResp = await mongooseFixtures_1.Product.insertMany(products, { ordered: true, rawResult: false });
            assert_1.default.strictEqual(insertManyResp.length, 2);
            assert_1.default.strictEqual(insertManyResp[0].name, 'Product 2');
            assert_1.default.strictEqual(insertManyResp[1].name, 'Product 1');
            //check if products are inserted
            const productsSaved = await mongooseFixtures_1.Product.find({});
            assert_1.default.strictEqual(productsSaved.length, 2);
            //check if product name is one of the inserted products names
            const productNames = new Set();
            products.map(product => product.name).forEach(name => productNames.add(name));
            assert_1.default.ok(productNames.has(productsSaved[0].name));
            productNames.delete(productsSaved[0].name);
            assert_1.default.ok(productNames.has(productsSaved[1].name));
            productNames.delete(productsSaved[1].name);
            assert_1.default.strictEqual(productNames.size, 0);
        });
        it('should cleanup updateOneOptions', async () => {
            // @ts-expect-error
            const products = [new mongooseFixtures_1.Product({ name: 'Product 2', price: 10, isCertified: true }),
                new mongooseFixtures_1.Product({ name: 'Product 1', price: 10, isCertified: false }),
                new mongooseFixtures_1.Product({ name: 'Product 3', price: 10, isCertified: true })];
            const insertManyResp = await mongooseFixtures_1.Product.insertMany(products, { ordered: true, rawResult: false });
            assert_1.default.strictEqual(insertManyResp.length, 3);
            assert_1.default.strictEqual(insertManyResp[0].name, 'Product 2');
            assert_1.default.strictEqual(insertManyResp[1].name, 'Product 1');
            assert_1.default.strictEqual(insertManyResp[2].name, 'Product 3');
            //rawResult options should be cleaned up by stargate-mongoose, but 'upsert' should be preserved
            const updateOneResp = await mongooseFixtures_1.Product.updateOne({ _id: new mongoose_1.default.Types.ObjectId() }, { $set: { isCertified: true, name: 'Product 4', price: 5 } }, { upsert: true, rawResult: false, setDefaultsOnInsert: false });
            if (!process.env.DATA_API_TABLES) {
                assert_1.default.strictEqual(updateOneResp.matchedCount, 0);
                assert_1.default.strictEqual(updateOneResp.modifiedCount, 0);
                assert_1.default.strictEqual(updateOneResp.upsertedCount, 1);
                assert_1.default.ok(updateOneResp.upsertedId);
            }
            //find product 4
            const product4 = await mongooseFixtures_1.Product.findOne({ name: 'Product 4' });
            assert_1.default.strictEqual(product4?.name, 'Product 4');
            assert_1.default.strictEqual(product4?.price, 5);
            assert_1.default.strictEqual(product4?.isCertified, true);
        });
        it('should cleanup updateManyOptions', async function () {
            if (process.env.DATA_API_TABLES) {
                this.skip();
                return;
            }
            // @ts-expect-error
            const products = [new mongooseFixtures_1.Product({ name: 'Product 2', price: 10, isCertified: true, category: 'cat1' }), new mongooseFixtures_1.Product({ name: 'Product 1', price: 10, isCertified: false, category: 'cat1' }), new mongooseFixtures_1.Product({ name: 'Product 3', price: 10, isCertified: false, category: 'cat2' })];
            const insertManyResp = await mongooseFixtures_1.Product.insertMany(products, { ordered: true, rawResult: false });
            assert_1.default.strictEqual(insertManyResp.length, 3);
            assert_1.default.strictEqual(insertManyResp[0].name, 'Product 2');
            assert_1.default.strictEqual(insertManyResp[1].name, 'Product 1');
            assert_1.default.strictEqual(insertManyResp[2].name, 'Product 3');
            //rawResult options should be cleaned up by stargate-mongoose, but 'upsert' should be preserved
            const updateManyResp = await mongooseFixtures_1.Product.updateMany({ category: 'cat1' }, { $set: { isCertified: true }, $inc: { price: 5 } }, { upsert: true, rawResult: false, sort: { name: 1 } });
            assert_1.default.strictEqual(updateManyResp.matchedCount, 2);
            assert_1.default.strictEqual(updateManyResp.modifiedCount, 2);
            assert_1.default.strictEqual(updateManyResp.upsertedCount, 0);
            assert_1.default.strictEqual(updateManyResp.upsertedId, undefined);
            //find product 4
            const cat1Products = await mongooseFixtures_1.Product.find({ category: 'cat1' });
            assert_1.default.strictEqual(cat1Products.length, 2);
            cat1Products.forEach(product => {
                assert_1.default.strictEqual(product.price, 15);
                assert_1.default.strictEqual(product.isCertified, true);
            });
        });
        it('should cleanup deleteOneOptions', async () => {
            const product1 = new mongooseFixtures_1.Product({ name: 'Product 1', price: 10, isCertified: true });
            await product1.save();
            //runValidations is not a flag supported by Data API, so it should be removed by stargate-mongoose
            await mongooseFixtures_1.Product.deleteOne({ _id: product1._id }, { runValidations: true });
            const product1Deleted = await mongooseFixtures_1.Product.findOne({ name: 'Product 1' });
            assert_1.default.strictEqual(product1Deleted, null);
        });
        it('should cleanup findOptions', async () => {
            //create 20 products using Array with id suffixed to prduct name
            let products = [];
            for (let i = 0; i < 20; i++) {
                products.push(new mongooseFixtures_1.Product({ name: `Product ${i}`, price: 10, isCertified: true }));
            }
            await mongooseFixtures_1.Product.insertMany(products, { ordered: true, rawResult: false });
            //insert next 20 products using Array with id suffixed to product name
            products = [];
            for (let i = 20; i < 40; i++) {
                products.push(new mongooseFixtures_1.Product({ name: `Product ${i}`, price: 10, isCertified: true }));
            }
            await mongooseFixtures_1.Product.insertMany(products, { ordered: true, rawResult: false });
            //find 30 products with rawResult option
            //rawResult must be removed and the limit must be preserved by stargate-mongoose
            const findResp = await mongooseFixtures_1.Product.find({}, {}, { rawResult: false, limit: 30 });
            assert_1.default.strictEqual(findResp.length, 30);
        });
        it('should cleanup findOneAndReplaceOptions', async function () {
            if (process.env.DATA_API_TABLES) {
                this.skip();
                return;
            }
            //create 20 products using Array with id suffixed to prduct name
            const products = [];
            for (let i = 0; i < 20; i++) {
                products.push(new mongooseFixtures_1.Product({ name: `Product ${i}`, price: 10, isCertified: true }));
            }
            await mongooseFixtures_1.Product.insertMany(products, { ordered: true, rawResult: false });
            const findOneAndReplaceResp = await mongooseFixtures_1.Product.findOneAndReplace({ name: 'Product 25' }, { price: 20, isCertified: false, name: 'Product 25' }, { upsert: true, returnDocument: 'after' });
            assert_1.default.strictEqual(findOneAndReplaceResp.isCertified, false);
            assert_1.default.strictEqual(findOneAndReplaceResp.price, 20);
            assert_1.default.ok(findOneAndReplaceResp._id);
            //find product 25
            const product25 = await mongooseFixtures_1.Product.findOne({ name: 'Product 25' });
            assert_1.default.strictEqual(product25?.isCertified, false);
            assert_1.default.strictEqual(product25?.price, 20);
            assert_1.default.strictEqual(product25?.name, 'Product 25');
        });
        it('should cleanup findOneAndDeleteOptions', async function () {
            if (process.env.DATA_API_TABLES) {
                this.skip();
                return;
            }
            //create 20 products using Array with id suffixed to prduct name
            const products = [];
            for (let i = 0; i < 20; i++) {
                if (i === 5 || i === 6) {
                    products.push(new mongooseFixtures_1.Product({ name: `Product ${i}`, price: 10, isCertified: true, category: 'cat 6' }));
                }
                else {
                    products.push(new mongooseFixtures_1.Product({ name: `Product ${i}`, price: 10, isCertified: true, category: `cat ${i}` }));
                }
            }
            await mongooseFixtures_1.Product.insertMany(products, { ordered: true, rawResult: false });
            //findOneAndDelete with rawResult option and sort with name in ascending order
            await mongooseFixtures_1.Product.findOneAndDelete({ category: 'cat 6' }, { rawResult: false, sort: { name: 1 } });
            //check if Product 5 is deleted
            const product5 = await mongooseFixtures_1.Product.findOne({ name: 'Product 5' });
            assert_1.default.strictEqual(product5, null);
            //check if Product 6 is not deleted
            const product6 = await mongooseFixtures_1.Product.findOne({ name: 'Product 6' });
            assert_1.default.strictEqual(product6?.name, 'Product 6');
            assert_1.default.strictEqual(product6?.price, 10);
            assert_1.default.strictEqual(product6?.isCertified, true);
            assert_1.default.strictEqual(product6?.category, 'cat 6');
        });
        it('should cleanup findOneAndUpdateOptions', async function () {
            if (process.env.DATA_API_TABLES) {
                this.skip();
                return;
            }
            //create 20 products using Array with id suffixed to product name
            const products = [];
            for (let i = 0; i < 20; i++) {
                products.push(new mongooseFixtures_1.Product({ name: `Product ${i}`, price: 10, isCertified: true }));
            }
            await mongooseFixtures_1.Product.insertMany(products, { ordered: true, rawResult: false });
            //findOneAndUpdate with rawResult option
            const upsertId = new mongoose_1.default.Types.ObjectId();
            const findOneAndUpdateResp = await mongooseFixtures_1.Product.findOneAndUpdate({ name: 'Product 25' }, { '$set': { price: 20, isCertified: false, name: 'Product 25' }, '$setOnInsert': { _id: upsertId } }, { rawResult: false, upsert: true, returnDocument: 'after' });
            assert_1.default.strictEqual(findOneAndUpdateResp.isCertified, false);
            assert_1.default.strictEqual(findOneAndUpdateResp.price, 20);
            assert_1.default.strictEqual(findOneAndUpdateResp.name, 'Product 25');
            assert_1.default.strictEqual(findOneAndUpdateResp._id.toString(), upsertId.toString());
            //find product 25
            const product25 = await mongooseFixtures_1.Product.findOne({ name: 'Product 25' });
            assert_1.default.strictEqual(product25?._id.toString(), upsertId.toString());
            assert_1.default.strictEqual(product25?.isCertified, false);
            assert_1.default.strictEqual(product25?.price, 20);
            assert_1.default.strictEqual(product25?.name, 'Product 25');
        });
    });
});
//# sourceMappingURL=options.test.js.map
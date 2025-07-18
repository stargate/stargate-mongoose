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
import { Product, ProductHydratedDoc, createMongooseCollections } from '../../tests/mongooseFixtures';

describe('Options tests', async () => {
    before(async function() {
        this.timeout(120_000);
        await createMongooseCollections(false);
    });

    beforeEach(async function() {
        await Product.deleteMany({});
    });

    afterEach(async function() {
        await Product.deleteMany({});
    });

    describe('options cleanup tests', () => {
        it('should cleanup insertManyOptions', async () => {
            const products: ProductHydratedDoc[] = [
                new Product({ name: 'Product 2', price: 10, isCertified: true }),
                new Product({ name: 'Product 1', price: 10, isCertified: false})
            ];
            //rawResult options should be cleaned up by astra-mongoose, but 'ordered' should be preserved
            const insertManyResp = await Product.insertMany(products, { ordered: true, rawResult: false });
            assert.strictEqual(insertManyResp.length, 2);
            assert.strictEqual(insertManyResp[0].name, 'Product 2');
            assert.strictEqual(insertManyResp[1].name, 'Product 1');
            //check if products are inserted
            const productsSaved = await Product.find({});
            assert.strictEqual(productsSaved.length, 2);
            //check if product name is one of the inserted products names
            const productNames:Set<string> = new Set<string>();
            products.map(product => product.name!).forEach(name => productNames.add(name));
            assert.ok(productNames.has(productsSaved[0].name!));
            productNames.delete(productsSaved[0].name!);
            assert.ok(productNames.has(productsSaved[1].name!));
            productNames.delete(productsSaved[1].name!);
            assert.strictEqual(productNames.size, 0);
        });
        it('should cleanup updateOneOptions', async () => {
            const products: ProductHydratedDoc[] = [
                new Product({ name: 'Product 2', price: 10, isCertified: true }),
                new Product({ name: 'Product 1', price: 10, isCertified: false }),
                new Product({ name: 'Product 3', price: 10, isCertified: true })
            ];
            const insertManyResp = await Product.insertMany(products, { ordered: true, rawResult: false });
            assert.strictEqual(insertManyResp.length, 3);
            assert.strictEqual(insertManyResp[0].name, 'Product 2');
            assert.strictEqual(insertManyResp[1].name, 'Product 1');
            assert.strictEqual(insertManyResp[2].name, 'Product 3');
            //rawResult options should be cleaned up by astra-mongoose, but 'upsert' should be preserved
            const updateOneResp = await Product.updateOne({ _id: new mongoose.Types.ObjectId() },
                { $set: { isCertified: true, name: 'Product 4', price: 5 } },
                { upsert: true, rawResult: false, setDefaultsOnInsert: false } as unknown as Record<string, never>
            );
            if (!process.env.DATA_API_TABLES) {
                assert.strictEqual(updateOneResp.matchedCount, 0);
                assert.strictEqual(updateOneResp.modifiedCount, 0);
                assert.strictEqual(updateOneResp.upsertedCount, 1);
                assert.ok(updateOneResp.upsertedId);
            }
            //find product 4
            const product4 = await Product.findOne({ name : 'Product 4' });
            assert.strictEqual(product4?.name, 'Product 4');
            assert.strictEqual(product4?.price, 5);
            assert.strictEqual(product4?.isCertified, true);
        });
        it('should cleanup updateManyOptions', async function() {
            const products: ProductHydratedDoc[] = [
                new Product({ name: 'Product 2', price: 10, isCertified: true, category: 'cat1' }),
                new Product({ name: 'Product 1', price: 10, isCertified: false, category: 'cat1' }),
                new Product({ name: 'Product 3', price: 10, isCertified: false, category: 'cat2' })
            ];
            const insertManyResp = await Product.insertMany(products, { ordered: true, rawResult: false });
            assert.strictEqual(insertManyResp.length, 3);
            assert.strictEqual(insertManyResp[0].name, 'Product 2');
            assert.strictEqual(insertManyResp[1].name, 'Product 1');
            assert.strictEqual(insertManyResp[2].name, 'Product 3');
            //rawResult options should be cleaned up by astra-mongoose, but 'upsert' should be preserved
            const updateManyResp = await Product.updateMany(
                { category: 'cat1' },
                { $set : { isCertified : true }, $inc: { price: 5 } },
                { upsert: true, rawResult: false, sort: { name : 1 } } as unknown as Record<string, never>
            );
            assert.strictEqual(updateManyResp.matchedCount, 2);
            assert.strictEqual(updateManyResp.modifiedCount, 2);
            assert.strictEqual(updateManyResp.upsertedCount, 0);
            assert.strictEqual(updateManyResp.upsertedId, undefined);
            //find product 4
            const cat1Products = await Product.find({ category : 'cat1' });
            assert.strictEqual(cat1Products.length, 2);
            cat1Products.forEach(product => {
                assert.strictEqual(product.price, 15);
                assert.strictEqual(product.isCertified, true);
            });
        });
        it('should cleanup deleteOneOptions', async () => {
            const product1 = new Product({ name: 'Product 1', price: 10, isCertified: true });
            await product1.save();
            //runValidations is not a flag supported by Data API, so it should be removed by astra-mongoose
            await Product.deleteOne({ _id: product1._id }, { runValidations: true } as unknown as Record<string, never>);
            const product1Deleted = await Product.findOne({ name: 'Product 1' });
            assert.strictEqual(product1Deleted, null);
        });
        it('should cleanup findOptions', async () => {
            //create 20 products using Array with id suffixed to prduct name
            let products: ReturnType<(typeof Product)['hydrate']>[] = [];
            for (let i = 0; i < 20; i++) {
                products.push(new Product({ name: `Product ${i}`, price: 10, isCertified: true }));
            }
            await Product.insertMany(products, { ordered: true, rawResult: false });
            //insert next 20 products using Array with id suffixed to product name
            products = [];
            for (let i = 20; i < 40; i++) {
                products.push(new Product({ name: `Product ${i}`, price: 10, isCertified: true }));
            }
            await Product.insertMany(products, { ordered: true, rawResult: false });
            //find 30 products with rawResult option
            //rawResult must be removed and the limit must be preserved by astra-mongoose
            const findResp = await Product.find({ }, {}, { rawResult: false, limit : 30 });
            assert.strictEqual(findResp.length, 30);
        });
        it('should cleanup findOneAndReplaceOptions', async function() {
            //create 20 products using Array with id suffixed to prduct name
            const products: ReturnType<(typeof Product)['hydrate']>[] = [];
            for (let i = 0; i < 20; i++) {
                products.push(new Product({ name: `Product ${i}`, price: 10, isCertified: true }));
            }
            await Product.insertMany(products, { ordered: true, rawResult: false });
            const findOneAndReplaceResp = await Product.findOneAndReplace({ name: 'Product 25' },
                { price: 20, isCertified: false, name: 'Product 25'},
                { upsert: true, returnDocument: 'after' }
            );
            assert.strictEqual(findOneAndReplaceResp.isCertified,false);
            assert.strictEqual(findOneAndReplaceResp.price,20);
            assert.ok(findOneAndReplaceResp._id);
            //find product 25
            const product25 = await Product.findOne({ name: 'Product 25' });
            assert.strictEqual(product25?.isCertified,false);
            assert.strictEqual(product25?.price,20);
            assert.strictEqual(product25?.name,'Product 25');
        });
        it('should cleanup findOneAndDeleteOptions', async function() {
            //create 20 products using Array with id suffixed to prduct name
            const products: ReturnType<(typeof Product)['hydrate']>[] = [];
            for (let i = 0; i < 20; i++) {
                if(i === 5 || i === 6) {
                    products.push(new Product({ name: `Product ${i}`, price: 10, isCertified: true, category: 'cat 6' }));
                } else {
                    products.push(new Product({ name: `Product ${i}`, price: 10, isCertified: true, category: `cat ${i}` }));
                }
            }
            await Product.insertMany(products, { ordered: true, rawResult: false });
            //findOneAndDelete with rawResult option and sort with name in ascending order
            await Product.findOneAndDelete({ category: 'cat 6' }, { rawResult: false, sort : { name : 1} });
            //check if Product 5 is deleted
            const product5 = await Product.findOne({ name: 'Product 5' });
            assert.strictEqual(product5, null);
            //check if Product 6 is not deleted
            const product6 = await Product.findOne({ name: 'Product 6' });
            assert.strictEqual(product6?.name, 'Product 6');
            assert.strictEqual(product6?.price, 10);
            assert.strictEqual(product6?.isCertified, true);
            assert.strictEqual(product6?.category, 'cat 6');
        });
        it('should cleanup findOneAndUpdateOptions', async function() {
            //create 20 products using Array with id suffixed to product name
            const products: ReturnType<(typeof Product)['hydrate']>[] = [];
            for (let i = 0; i < 20; i++) {
                products.push(new Product({ name: `Product ${i}`, price: 10, isCertified: true }));
            }
            await Product.insertMany(products, { ordered: true, rawResult: false });
            //findOneAndUpdate with rawResult option
            const upsertId = new mongoose.Types.ObjectId();
            const findOneAndUpdateResp = await Product.findOneAndUpdate({ name: 'Product 25' },
                { '$set' : {price: 20, isCertified: false, name: 'Product 25'}, '$setOnInsert' : {_id: upsertId} },
                { rawResult: false, upsert: true, returnDocument: 'after' });
            assert.strictEqual(findOneAndUpdateResp.isCertified,false);
            assert.strictEqual(findOneAndUpdateResp.price,20);
            assert.strictEqual(findOneAndUpdateResp.name,'Product 25');
            assert.strictEqual(findOneAndUpdateResp._id.toString(), upsertId.toString());
            //find product 25
            const product25 = await Product.findOne({ name: 'Product 25' });
            assert.strictEqual(product25?._id.toString(), upsertId.toString());
            assert.strictEqual(product25?.isCertified,false);
            assert.strictEqual(product25?.price,20);
            assert.strictEqual(product25?.name,'Product 25');
        });
    });
});

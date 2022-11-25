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
import { astraUri } from '@/tests/fixtures';
import * as StargateMongooseDriver from '@/src/driver';
import { delay } from 'lodash';

// @ts-ignore
mongoose.setDriver(StargateMongooseDriver);

const cartSchema = new mongoose.Schema({
  name: String,
  cartName: { type: String, lowercase: true, unique: true, index: true },
  products: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }]
});

const productSchema = new mongoose.Schema({
  name: String,
  price: Number
});

const Cart = mongoose.model('Cart', cartSchema);
const Product = mongoose.model('Product', productSchema);

describe('StargateMongoose - index', () => {
  it('should leverage astradb', async function () {
    if (!process.env.ASTRA_DB_ID || !process.env.ASTRA_DB_APPLICATION_TOKEN) {
      return this.skip();
    }
    await mongoose.connect(astraUri);
    await new Promise(fn => setTimeout(fn, 1000));//TODOV3 check later - without this delay, this test fails sometimes
    const product1 = new Product({ name: 'Product 1', price: 10 });
    await product1.save();

    const product2 = new Product({ name: 'Product 2', price: 10 });
    await product2.save();

    const cart = new Cart({
      name: 'My Cart',
      cartName: 'wewson',
      products: [product1._id, product2._id]
    });
    await cart.save();

    // const res = await Cart.findOne({ name: { $eq: 'My Cart' } })
    //   .populate('products')
    //   .exec();
    // console.log(res);

    // const count = await Cart.find({
    //   name: { $eq: 'My Cart' }
    // }).countDocuments();
    // console.log(count);

    mongoose.connection.dropCollection('carts');
    mongoose.connection.dropCollection('products');
  });

  it('asPromise() resolves to connection', async () => {
    const conn = mongoose.createConnection(astraUri);

    assert.strictEqual(await conn.asPromise(), conn);
  });
});

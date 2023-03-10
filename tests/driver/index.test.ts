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
mongoose.set('autoCreate', true);
mongoose.set('autoIndex', false);

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
  //TODOV3 skipping this test for now, this can be only run against real server, otherwise we will have to keep adding multiple mock collections in the Postman for this.
  it('should leverage astradb', async function () {    
    await mongoose.connect(astraUri, {
      username: "cassandra",
      password: "cassandra",
      authUrl: "http://localhost:8081/v1/auth"
    });
    await Promise.all(Object.values(mongoose.connection.models).map(Model => Model.init()));
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

    mongoose.connection.dropCollection('carts');
    mongoose.connection.dropCollection('products');
  });

  it('asPromise() resolves to connection', async () => {
    const conn = mongoose.createConnection(astraUri, 
        {
          username: "cassandra",
          password: "cassandra",
          authUrl: "http://localhost:8081/v1/auth"
        });

    assert.strictEqual(await conn.asPromise(), conn);
  });
});

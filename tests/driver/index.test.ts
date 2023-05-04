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
import * as StargateMongooseDriver from '@/src/driver';
import { testClient } from '@/tests/fixtures';
import { logger } from '@/src/logger';
import { parseUri } from '@/src/collections/utils';

describe(`Driver based tests`, async () => {
  let dbUri: string;
  let isAstra: boolean;
  before(async function () {
    if (testClient == null) {
      return this.skip();
    }
    const astraClient = await testClient.client;
    if (astraClient == null) {
      logger.info('Skipping tests for client: %s', testClient);
      return this.skip();
    }
    dbUri = testClient.uri;
    isAstra = testClient.isAstra;
  });
  describe('StargateMongoose - index', () => {
    it('should leverage astradb', async function () {
      const cartSchema = new mongoose.Schema({
        name: String,
        cartName: { type: String, lowercase: true, unique: true, index: true },
        products: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }]
      });

      const productSchema = new mongoose.Schema({
        name: String,
        price: Number,
        expiryDate: Date,
        isCertified: Boolean
      });
      let Cart, Product;
      let astraMongoose, jsonAPIMongoose;
      if (isAstra) {
        astraMongoose = new mongoose.Mongoose();
        astraMongoose.setDriver(StargateMongooseDriver);
        astraMongoose.set('autoCreate', true);
        astraMongoose.set('autoIndex', false);
        Cart = astraMongoose.model('Cart', cartSchema);
        Product = astraMongoose.model('Product', productSchema);

        await astraMongoose.connect(dbUri, { isAstra: true });
        await Promise.all(Object.values(astraMongoose.connection.models).map(Model => Model.init()));
      } else {
        // @ts-ignore
        jsonAPIMongoose = new mongoose.Mongoose();
        jsonAPIMongoose.setDriver(StargateMongooseDriver);
        jsonAPIMongoose.set('autoCreate', true);
        jsonAPIMongoose.set('autoIndex', false);
        Cart = jsonAPIMongoose.model('Cart', cartSchema);
        Product = jsonAPIMongoose.model('Product', productSchema);

        await jsonAPIMongoose.connect(dbUri, {
          username: process.env.STARGATE_USERNAME,
          password: process.env.STARGATE_PASSWORD,
          authUrl: process.env.STARGATE_AUTH_URL,
          logSkippedOptions: true
        });
        await Promise.all(Object.values(jsonAPIMongoose.connection.models).map(Model => Model.init()));
      }
      const product1 = new Product({ name: 'Product 1', price: 10, expiryDate: new Date('2024-04-20T00:00:00.000Z'), isCertified: true });
      await product1.save();

      const product2 = new Product({ name: 'Product 2', price: 10, expiryDate: new Date('2024-11-20T00:00:00.000Z'), isCertified: false });
      await product2.save();

      const cart = new Cart({
        name: 'My Cart',
        cartName: 'wewson',
        products: [product1._id, product2._id]
      });
      await cart.save();
      assert.strictEqual(await Cart.findOne({ cartName: 'wewson' }).select('name').exec().then((doc: any) => doc.name), cart.name);
      //compare if product expiryDate is same as saved
      assert.strictEqual(await Product.findOne({ name: 'Product 1' }).select('expiryDate').exec().then((doc: any) => doc.expiryDate.toISOString()), product1.expiryDate!.toISOString());

      const findOneAndReplaceResp = await Cart.findOneAndReplace({ cartName: 'wewson' }, { name: 'My Cart 2', cartName: 'wewson1' }, { returnDocument: 'after'}).exec();
      assert.strictEqual(findOneAndReplaceResp!.name, 'My Cart 2');
      assert.strictEqual(findOneAndReplaceResp!.cartName, 'wewson1');

      if (isAstra) {
        astraMongoose?.connection.dropCollection('carts');
        astraMongoose?.connection.dropCollection('products');
      } else {
        jsonAPIMongoose?.connection.dropCollection('carts');
        jsonAPIMongoose?.connection.dropCollection('products');
      }
    });
  });
  describe('namespace management tests', () => {
    it('should fail when dropDatabase is called for AstraDB', async () => {
      const mongooseInstance = new mongoose.Mongoose();
      mongooseInstance.setDriver(StargateMongooseDriver);
      mongooseInstance.set('autoCreate', true);
      mongooseInstance.set('autoIndex', false);
      let options = isAstra ? { isAstra: true } : { username: process.env.STARGATE_USERNAME, password: process.env.STARGATE_PASSWORD, authUrl: process.env.STARGATE_AUTH_URL };
      await mongooseInstance.connect(dbUri, options);
      if (isAstra) {
        let error: any;
        try {
          await mongooseInstance.connection.dropDatabase();
        } catch (e: any) {
          error = e;
        }
        assert.strictEqual(error.message, 'Cannot drop database in Astra. Please use the Astra UI to drop the database.');
      } else {
        const resp = await mongooseInstance.connection.dropDatabase();
        assert.strictEqual(resp.status?.ok, 1);
      }
    });
    it('should createDatabase if not exists in createCollection call for non-AstraDB', async () => {
      const mongooseInstance = new mongoose.Mongoose();
      mongooseInstance.setDriver(StargateMongooseDriver);
      mongooseInstance.set('autoCreate', true);
      mongooseInstance.set('autoIndex', false);
      let options = isAstra ? { isAstra: true } : { username: process.env.STARGATE_USERNAME, password: process.env.STARGATE_PASSWORD, authUrl: process.env.STARGATE_AUTH_URL };
      //split dbUri by / and replace last element with newKeyspaceName
      const dbUriSplit = dbUri.split('/');
      const token = parseUri(dbUri).applicationToken;
      const newKeyspaceName = 'new_keyspace';
      dbUriSplit[dbUriSplit.length - 1] = newKeyspaceName;
      let newDbUri = dbUriSplit.join('/');
      //if token is not null, append it to the new dbUri
      newDbUri = token ? newDbUri + '?applicationToken=' + token : newDbUri;
      await mongooseInstance.connect(newDbUri, options);
      if (isAstra) {
        let error: any;
        try {
          await mongooseInstance.connection.createCollection('new_collection');
        } catch (e: any) {
          error = e;
        }
        assert.strictEqual(error.errors[0].message, 'INVALID_ARGUMENT: Unknown keyspace ' + newKeyspaceName);
      } else {
        const resp = await mongooseInstance.connection.createCollection('new_collection');
        assert.strictEqual(resp.status?.ok, 1);
      }
    });
  });
});

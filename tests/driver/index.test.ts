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
import { delay } from 'lodash';
import { testClients } from '@/tests/fixtures';
import { logger } from '@/src/logger';

for (const testClient in testClients) {
  describe(`Driver based tests`, async () => {  
  let dbUri : string;
  let isAstra: boolean;
  before(async function() {
    const astraClientInfo = testClients[testClient];
    const astraClient = await astraClientInfo?.client;      
    if (astraClient == null) {
      logger.info('Skipping tests for client: %s', testClient);
      return this.skip();
    }      
    dbUri = astraClientInfo.uri;
    isAstra = astraClientInfo.isAstra;
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
        price: Number
      });
      let Cart, Product;
      let astraMongoose, jsonAPIMongoose;
      if(isAstra){
        astraMongoose = new mongoose.Mongoose();
        astraMongoose.setDriver(StargateMongooseDriver);
        astraMongoose.set('autoCreate', true);
        astraMongoose.set('autoIndex', false);
        Cart = astraMongoose.model('Cart', cartSchema);
        Product = astraMongoose.model('Product', productSchema);

        await astraMongoose.connect(dbUri, {createNamespaceOnConnect: false});
        await Promise.all(Object.values(astraMongoose.connection.models).map(Model => Model.init()));
      } else{
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
          authUrl: process.env.STARGATE_AUTH_URL
        });
        await Promise.all(Object.values(jsonAPIMongoose.connection.models).map(Model => Model.init()));
      }
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
      if(isAstra){
        astraMongoose?.connection.dropCollection('carts');
        astraMongoose?.connection.dropCollection('products');
      } else{
        jsonAPIMongoose?.connection.dropCollection('carts');
        jsonAPIMongoose?.connection.dropCollection('products');
      }
    });  
  });
})};

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
import { Db } from '@/src/collections/db';
import { Collection } from '@/src/collections/collection';
import { Client } from '@/src/collections/client';
import { testClient, testClientName, createSampleDoc, sampleUsersList, createSampleDocWithMultiLevel, createSampleDocWithMultiLevelWithId, getSampleDocs, sleep, TEST_COLLECTION_NAME } from '@/tests/fixtures';
import mongoose from "mongoose";
import * as StargateMongooseDriver from "@/src/driver";

describe(`Options tests`, async () => {
    let astraClient: Client | null;
    let db: Db;
    let collection: Collection;
    const sampleDoc = createSampleDoc();
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

    async function createClientsAndModels(isAstra: boolean) {
        let Product, astraMongoose, jsonAPIMongoose;
        const productSchema = new mongoose.Schema({
            name: String,
            price: Number,
            expiryDate: Date,
            isCertified: Boolean
        });
        if(isAstra){
            astraMongoose = new mongoose.Mongoose();
            astraMongoose.setDriver(StargateMongooseDriver);
            astraMongoose.set('autoCreate', true);
            astraMongoose.set('autoIndex', false);
            Product = astraMongoose.model('Product', productSchema);
            // @ts-ignore - these are config options supported by stargate-mongoose but not mongoose
            await astraMongoose.connect(dbUri, { isAstra: true, logSkippedOptions: true });
            await Promise.all(Object.values(astraMongoose.connection.models).map(Model => Model.init()));
        } else{
            // @ts-ignore
            jsonAPIMongoose = new mongoose.Mongoose();
            jsonAPIMongoose.setDriver(StargateMongooseDriver);
            jsonAPIMongoose.set('autoCreate', true);
            jsonAPIMongoose.set('autoIndex', false);
            Product = jsonAPIMongoose.model('Product', productSchema);
            // @ts-ignore - these are config options supported by stargate-mongoose but not mongoose
            await jsonAPIMongoose.connect(dbUri, {
                username: process.env.STARGATE_USERNAME,
                password: process.env.STARGATE_PASSWORD,
                authUrl: process.env.STARGATE_AUTH_URL,
                logSkippedOptions: true
            });
            await Promise.all(Object.values(jsonAPIMongoose.connection.models).map(Model => Model.init()));
        }
        return { Product, astraMongoose, jsonAPIMongoose };
    }

    async function dropCollections(isAstra: boolean, astraMongoose: mongoose.Mongoose, jsonAPIMongoose: mongoose.Mongoose, collectionName: string) {
        if (isAstra) {
            astraMongoose?.connection.dropCollection(collectionName);
        } else {
            jsonAPIMongoose?.connection.dropCollection(collectionName);
        }
    }

    describe('options cleanup tests', () => {
        it('should cleanup deleteOneOptions', async () => {
            let Product, astraMongoose, jsonAPIMongoose;
            try {
                ({ Product, astraMongoose, jsonAPIMongoose } = await createClientsAndModels(isAstra));
                // @ts-ignore
                const product1 = new Product({
                    name: 'Product 1',
                    price: 10,
                    expiryDate: new Date('2024-04-20T00:00:00.000Z'),
                    isCertified: true
                });
                await product1.save();
                await Product.deleteOne({ name: 'Product 1' }, { runValidations: true });
            } finally {
                // @ts-ignore
                await dropCollections(isAstra, astraMongoose, jsonAPIMongoose, 'products');
            }
        });
        it('should cleanup insertManyOptions', async () => {
            let Product, astraMongoose, jsonAPIMongoose;
            try {
                ({ Product, astraMongoose, jsonAPIMongoose } = await createClientsAndModels(isAstra));
                // @ts-ignore
                const product1 = new Product({
                    name: 'Product 1',
                    price: 10,
                    expiryDate: new Date('2024-04-20T00:00:00.000Z'),
                    isCertified: true
                });
                const product2 = new Product({
                    name: 'Product 1',
                    price: 10,
                    expiryDate: new Date('2024-04-20T00:00:00.000Z'),
                    isCertified: true
                });
                //rawResult options should be cleaned up by stargate-mongoose
                await Product.insertMany([product1, product2], { ordered: false, rawResult: false });
            } finally {
                // @ts-ignore
                await dropCollections(isAstra, astraMongoose, jsonAPIMongoose, 'products');
            }
        });
    });
});

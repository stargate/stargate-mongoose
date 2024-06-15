import { isAstra, testClient } from './fixtures';
import { Schema, Mongoose } from 'mongoose';
import * as StargateMongooseDriver from '@/src/driver';
import { parseUri, createNamespace } from '@/src/collections/utils';

const cartSchema = new Schema({
    name: String,
    cartName: {type: String, lowercase: true, unique: true, index: true},
    products: [{type: Schema.Types.ObjectId, ref: 'Product'}],
    user: new Schema({
        name: String
    }, { _id: false })
});

const productSchema = new Schema({
    name: String,
    price: Number,
    expiryDate: Date,
    isCertified: Boolean,
    category: String,
    tags: [{ _id: false, name: String }]
});

export const mongooseInstance = new Mongoose();
mongooseInstance.setDriver(StargateMongooseDriver);
mongooseInstance.set('autoCreate', false);
mongooseInstance.set('autoIndex', false);
export const Cart = mongooseInstance.model('Cart', cartSchema);
export const Product = mongooseInstance.model('Product', productSchema);

export async function createMongooseCollections() {
    this.timeout(120_000);
    const collections = await mongooseInstance.connection.listCollections();
    const collectionNames = collections.map(({ name }) => name);
    if (!collectionNames.includes(Cart.collection.collectionName)) {
        await Cart.createCollection();
    } else {
        await Cart.deleteMany({});
    }
    if (!collectionNames.includes(Product.collection.collectionName)) {
        await Product.createCollection();
    } else {
        await Product.deleteMany({});
    }
}

before(async function connectMongooseFixtures() {
    if (isAstra) {
    // @ts-ignore - these are config options supported by stargate-mongoose but not mongoose
        await mongooseInstance.connect(testClient.uri, {isAstra: true});
    } else {
        const options = {
            username: process.env.STARGATE_USERNAME,
            password: process.env.STARGATE_PASSWORD,
            logSkippedOptions: true
        };
        // @ts-ignore - these are config options supported by stargate-mongoose but not mongoose
        await mongooseInstance.connect(testClient.uri, options);
        const client = await testClient.client;
        const keyspace = parseUri(testClient!.uri).keyspaceName;
        await createNamespace(client.httpClient, keyspace);
    }
});

before(createMongooseCollections);

after(async function cleanupMongooseCollections() {
    await Cart.db.dropCollection(Cart.collection.collectionName);
    await Product.db.dropCollection(Product.collection.collectionName);
});

after(async function disconnectMongooseFixtures() {
    await mongooseInstance.disconnect();
});
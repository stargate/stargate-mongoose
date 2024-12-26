import { isAstra, testClient } from './fixtures';
import { Schema, Mongoose } from 'mongoose';
import * as StargateMongooseDriver from '../src/driver';
import { parseUri } from '../src/driver/connection';
import { plugins } from '../src/driver';

const useTables = !!process.env.DATA_API_TABLES;

const cartSchema = new Schema({
    name: String,
    cartName: {type: String, lowercase: true, unique: true, index: true},
    products: [{type: Schema.Types.ObjectId, ref: 'Product'}],
    user: new Schema({
        name: String
    }, { _id: false })
});

export const productSchema = new Schema({
    name: String,
    price: Number,
    expiryDate: Date,
    isCertified: Boolean,
    category: String,
    tags: {
        type: [{ _id: false, name: String }],
        ...(process.env.DATA_API_TABLES ? { default: undefined } : {})
    }
}, { versionKey: false });

export const mongooseInstance = new Mongoose() as unknown as Omit<Mongoose, 'connection'> & { connection: StargateMongooseDriver.Connection };
mongooseInstance.setDriver(StargateMongooseDriver);
mongooseInstance.set('autoCreate', false);
mongooseInstance.set('autoIndex', false);

for (const plugin of plugins) {
    mongooseInstance.plugin(plugin);
}

export const Cart = mongooseInstance.model('Cart', cartSchema);
export const Product = mongooseInstance.model('Product', productSchema);

async function createNamespace() {
    const connection = mongooseInstance.connection;
    return connection.db!.httpClient._request({
        url: connection.baseUrl + '/' + connection.baseApiPath,
        method: 'POST',
        data: JSON.stringify({
            createNamespace: {
                name: connection.keyspaceName
            }
        }),
        timeoutManager: connection.db!.httpClient.tm.single('databaseAdminTimeoutMs', { timeout: 120_000 })
    });
}

export async function createMongooseCollections() {
    await createNamespace();

    const tables = await mongooseInstance.connection.listTables();
    const tableNames = tables.map(t => t.name);

    if (useTables) {
        await mongooseInstance.connection.dropTable(Cart.collection.collectionName);
        await mongooseInstance.connection.dropTable(Product.collection.collectionName);
        await mongooseInstance.connection.createTable(Cart.collection.collectionName, {
            primaryKey: '_id',
            columns: {
                _id: { type: 'text' },
                __v: { type: 'int' },
                name: { type: 'text' },
                cartName: { type: 'text' },
                products: {
                    type: 'list',
                    valueType: 'text'
                },
                user: {
                    type: 'map',
                    keyType: 'text',
                    valueType: 'text'
                }
            }
        });
        await mongooseInstance.connection.createTable(Product.collection.collectionName, {
            primaryKey: '_id',
            columns: {
                _id: { type: 'text' },
                __v: { type: 'int' },
                __t: { type: 'text' },
                name: { type: 'text' },
                price: { type: 'decimal' },
                expiryDate: { type: 'timestamp' },
                isCertified: { type: 'boolean' },
                category: { type: 'text' },
                // `tags` omitted because no reasonable way to use document arrays in Data API tables
                // without converting to strings
                // Discriminator values
                url: { type: 'text' },
                // Extra key for testing strict mode
                extraCol: { type: 'text' }
            }
        });
    } else {
        const collections = await mongooseInstance.connection.listCollections();
        const collectionNames = collections.map(({ name }) => name);

        if (tableNames.includes(Cart.collection.collectionName)) {
            await mongooseInstance.connection.dropTable(Cart.collection.collectionName);
        }
        if (tableNames.includes(Product.collection.collectionName)) {
            await mongooseInstance.connection.dropTable(Product.collection.collectionName);
        }

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
}

before(async function connectMongooseFixtures() {
    if (isAstra) {
    // @ts-expect-error - these are config options supported by stargate-mongoose but not mongoose
        await mongooseInstance.connect(testClient.uri, testClient.options);
    } else {
        await mongooseInstance.connect(testClient!.uri, testClient!.options);
        const keyspace = parseUri(testClient!.uri).keyspaceName;
        await mongooseInstance.connection.createNamespace(keyspace);
    }
});

before(createMongooseCollections);

after(async function disconnectMongooseFixtures() {
    await mongooseInstance.disconnect();
});

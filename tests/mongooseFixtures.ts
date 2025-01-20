import { testClient } from './fixtures';
import { Schema, Mongoose, InferSchemaType, SubdocsToPOJOs } from 'mongoose';
import * as StargateMongooseDriver from '../src/driver';
import { plugins } from '../src/driver';
import tableDefinitionFromSchema from '../src/tableDefinitionFromSchema';

import type { ConnectOptions } from 'mongoose';

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
        default: undefined
    }
}, { versionKey: false });

export const mongooseInstance = new Mongoose().setDriver(StargateMongooseDriver);
mongooseInstance.set('autoCreate', false);
mongooseInstance.set('autoIndex', false);

for (const plugin of plugins) {
    mongooseInstance.plugin(plugin);
}

export const Cart = mongooseInstance.model('Cart', cartSchema);
export const Product = mongooseInstance.model('Product', productSchema);
export type ProductHydratedDoc = ReturnType<(typeof Product)['hydrate']>;
export type ProductRawDoc = SubdocsToPOJOs<InferSchemaType<typeof productSchema>>;

let lastConnectionOptions: ConnectOptions | null = null;

async function createNamespace() {
    const connection = mongooseInstance.connection;
    return connection.createNamespace(connection.namespace);
}

export async function createMongooseCollections(useTables: boolean) {
    if (lastConnectionOptions?.useTables === useTables) {
        return;
    }
    await mongooseInstance.connection.close();
    await mongooseInstance.connection.openUri(testClient!.uri, { ...testClient!.options, useTables });
    lastConnectionOptions = { ...testClient!.options, useTables };

    await createNamespace();

    for (const Model of Object.values(mongooseInstance.connection.models)) {
        // Bust collection cache, because otherwise models will keep a table/collection even if we switched modes
        // @ts-expect-error
        delete Model.collection._collection;
    }

    const tableNames = await mongooseInstance.connection.listTables({ nameOnly: true });

    if (useTables) {
        await mongooseInstance.connection.dropTable(Cart.collection.collectionName);
        await mongooseInstance.connection.dropTable(Product.collection.collectionName);
        await mongooseInstance.connection.createTable(Cart.collection.collectionName, tableDefinitionFromSchema(Cart.schema));
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

before(async function() {
    this.timeout(120_000);
    await createMongooseCollections();
});

after(async function disconnectMongooseFixtures() {
    await mongooseInstance.disconnect();
});

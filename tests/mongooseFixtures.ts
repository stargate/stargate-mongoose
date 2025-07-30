import { TEST_COLLECTION_NAME, testClient } from './fixtures';
import { Schema, Mongoose, InferSchemaType, SubdocsToPOJOs } from 'mongoose';
import * as AstraMongooseDriver from '../src/driver';
import assert from 'assert';
import { plugins } from '../src/driver';
import tableDefinitionFromSchema from '../src/tableDefinitionFromSchema';

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

export const mongooseInstance = new Mongoose().setDriver(AstraMongooseDriver);
mongooseInstance.set('autoCreate', false);
mongooseInstance.set('autoIndex', false);

for (const plugin of plugins) {
    mongooseInstance.plugin(plugin);
}

export const Cart = mongooseInstance.model('Cart', cartSchema);
export const Product = mongooseInstance.model('Product', productSchema);
export type CartModelType = typeof Cart;
export type ProductModelType = typeof Product;
export type ProductHydratedDoc = ReturnType<(typeof Product)['hydrate']>;
export type ProductRawDoc = SubdocsToPOJOs<InferSchemaType<typeof productSchema>>;

export const mongooseInstanceTables = new Mongoose().setDriver(AstraMongooseDriver);
mongooseInstanceTables.set('autoCreate', false);
mongooseInstanceTables.set('autoIndex', false);

for (const plugin of plugins) {
    mongooseInstanceTables.plugin(plugin);
}

export const CartTablesModel = mongooseInstanceTables.model('Cart', cartSchema, 'carts_table');
export const ProductTablesModel = mongooseInstanceTables.model('Product', productSchema, 'products_table');

export const testDebug = !!process.env.D;
const clearDB = !!process.env.CLEAR_DB;

export async function createMongooseCollections(isTable: boolean) {
    await mongooseInstance.connection.openUri(testClient!.uri, { ...testClient!.options, logging: testDebug ? 'commandStarted' : undefined });
    await mongooseInstanceTables.connection.openUri(testClient!.uri, { ...testClient!.options, isTable: true, logging: testDebug ? 'commandStarted' : undefined });

    assert.ok(mongooseInstance.connection.keyspaceName);
    await mongooseInstance.connection.createKeyspace(mongooseInstance.connection.keyspaceName as string);
    const { databases } = await mongooseInstance.connection.listDatabases();
    assert.ok(databases.find(db => db.name === mongooseInstance.connection.keyspaceName));

    if (clearDB) {
        await mongooseInstance.connection.dropTable(CartTablesModel.collection.collectionName);
        await mongooseInstance.connection.dropTable(ProductTablesModel.collection.collectionName);
        await mongooseInstance.connection.dropCollection(Cart.collection.collectionName);
        await mongooseInstance.connection.dropCollection(Product.collection.collectionName);
    }

    const tableNames = await mongooseInstance.connection.listTables({ nameOnly: true });
    const collectionNames = await mongooseInstance.connection.listCollections({ nameOnly: true });

    if (isTable) {
        if (collectionNames.includes(CartTablesModel.collection.collectionName)) {
            await mongooseInstance.connection.dropCollection(CartTablesModel.collection.collectionName);
        }
        if (collectionNames.includes(ProductTablesModel.collection.collectionName)) {
            await mongooseInstance.connection.dropCollection(ProductTablesModel.collection.collectionName);
        }
        if (!tableNames.includes(CartTablesModel.collection.collectionName)) {
            await mongooseInstance.connection.createTable(CartTablesModel.collection.collectionName, tableDefinitionFromSchema(CartTablesModel.schema));
        }
        if (!tableNames.includes(ProductTablesModel.collection.collectionName)) {
            await mongooseInstance.connection.createTable(ProductTablesModel.collection.collectionName, {
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
                    extraCol: { type: 'text' },
                    testMap: { type: 'map', keyType: 'text', valueType: 'decimal' }
                }
            });
        }

        if (testDebug) {
            mongooseInstanceTables.connection.collection(ProductTablesModel.collection.collectionName).collection.on('commandStarted', ev => {
                console.log(ev.target.url, JSON.stringify(ev.command, null, '    '));
            });
            mongooseInstanceTables.connection.collection(CartTablesModel.collection.collectionName).collection.on('commandStarted', ev => {
                console.log(ev.target.url, JSON.stringify(ev.command, null, '    '));
            });
            mongooseInstanceTables.connection.collection(TEST_COLLECTION_NAME).collection.on('commandStarted', ev => {
                console.log(ev.target.url, JSON.stringify(ev.command, null, '    '));
            });
        }

        return { mongooseInstance: mongooseInstanceTables, Product: ProductTablesModel, Cart: CartTablesModel };
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

        if (testDebug) {
            mongooseInstance.connection.collection(Product.collection.collectionName).collection.on('commandStarted', ev => {
                console.log(ev.target.url, JSON.stringify(ev.command, null, '    '));
            });
            mongooseInstance.connection.collection(Cart.collection.collectionName).collection.on('commandStarted', ev => {
                console.log(ev.target.url, JSON.stringify(ev.command, null, '    '));
            });
            mongooseInstance.connection.collection(TEST_COLLECTION_NAME).collection.on('commandStarted', ev => {
                console.log(ev.target.url, JSON.stringify(ev.command, null, '    '));
            });
        }

        return { mongooseInstance, Product, Cart };
    }
}

after(async function disconnectMongooseFixtures() {
    await mongooseInstance.disconnect();
});

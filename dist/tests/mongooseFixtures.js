"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProductTablesModel = exports.CartTablesModel = exports.mongooseInstanceTables = exports.Product = exports.Cart = exports.mongooseInstance = exports.productSchema = void 0;
exports.createMongooseCollections = createMongooseCollections;
const fixtures_1 = require("./fixtures");
const mongoose_1 = require("mongoose");
const StargateMongooseDriver = __importStar(require("../src/driver"));
const driver_1 = require("../src/driver");
const tableDefinitionFromSchema_1 = __importDefault(require("../src/tableDefinitionFromSchema"));
const cartSchema = new mongoose_1.Schema({
    name: String,
    cartName: { type: String, lowercase: true, unique: true, index: true },
    products: [{ type: mongoose_1.Schema.Types.ObjectId, ref: 'Product' }],
    user: new mongoose_1.Schema({
        name: String
    }, { _id: false })
});
exports.productSchema = new mongoose_1.Schema({
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
exports.mongooseInstance = new mongoose_1.Mongoose().setDriver(StargateMongooseDriver);
exports.mongooseInstance.set('autoCreate', false);
exports.mongooseInstance.set('autoIndex', false);
for (const plugin of driver_1.plugins) {
    exports.mongooseInstance.plugin(plugin);
}
exports.Cart = exports.mongooseInstance.model('Cart', cartSchema);
exports.Product = exports.mongooseInstance.model('Product', exports.productSchema);
exports.mongooseInstanceTables = new mongoose_1.Mongoose().setDriver(StargateMongooseDriver);
exports.mongooseInstanceTables.set('autoCreate', false);
exports.mongooseInstanceTables.set('autoIndex', false);
for (const plugin of driver_1.plugins) {
    exports.mongooseInstanceTables.plugin(plugin);
}
exports.CartTablesModel = exports.mongooseInstanceTables.model('Cart', cartSchema, 'carts_table');
exports.ProductTablesModel = exports.mongooseInstanceTables.model('Product', exports.productSchema, 'products_table');
async function createNamespace() {
    const connection = exports.mongooseInstance.connection;
    return connection.createNamespace(connection.namespace);
}
async function createMongooseCollections(useTables) {
    await exports.mongooseInstance.connection.openUri(fixtures_1.testClient.uri, { ...fixtures_1.testClient.options });
    await exports.mongooseInstanceTables.connection.openUri(fixtures_1.testClient.uri, { ...fixtures_1.testClient.options, useTables: true });
    const { databases } = await exports.mongooseInstance.connection.listDatabases();
    if (!databases.find(db => db.name === exports.mongooseInstance.connection.namespace)) {
        await createNamespace();
    }
    const tableNames = await exports.mongooseInstance.connection.listTables({ nameOnly: true });
    const collectionNames = await exports.mongooseInstance.connection.listCollections({ nameOnly: true });
    if (useTables) {
        if (collectionNames.includes(exports.CartTablesModel.collection.collectionName)) {
            await exports.mongooseInstance.connection.dropCollection(exports.CartTablesModel.collection.collectionName);
        }
        if (collectionNames.includes(exports.ProductTablesModel.collection.collectionName)) {
            await exports.mongooseInstance.connection.dropCollection(exports.ProductTablesModel.collection.collectionName);
        }
        if (!tableNames.includes(exports.CartTablesModel.collection.collectionName)) {
            await exports.mongooseInstance.connection.createTable(exports.CartTablesModel.collection.collectionName, (0, tableDefinitionFromSchema_1.default)(exports.CartTablesModel.schema));
        }
        if (!tableNames.includes(exports.ProductTablesModel.collection.collectionName)) {
            await exports.mongooseInstance.connection.createTable(exports.ProductTablesModel.collection.collectionName, {
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
        }
        return { mongooseInstance: exports.mongooseInstanceTables, Product: exports.ProductTablesModel, Cart: exports.CartTablesModel };
    }
    else {
        const collections = await exports.mongooseInstance.connection.listCollections();
        const collectionNames = collections.map(({ name }) => name);
        if (tableNames.includes(exports.Cart.collection.collectionName)) {
            await exports.mongooseInstance.connection.dropTable(exports.Cart.collection.collectionName);
        }
        if (tableNames.includes(exports.Product.collection.collectionName)) {
            await exports.mongooseInstance.connection.dropTable(exports.Product.collection.collectionName);
        }
        if (!collectionNames.includes(exports.Cart.collection.collectionName)) {
            await exports.Cart.createCollection();
        }
        else {
            await exports.Cart.deleteMany({});
        }
        if (!collectionNames.includes(exports.Product.collection.collectionName)) {
            await exports.Product.createCollection();
        }
        else {
            await exports.Product.deleteMany({});
        }
        return { mongooseInstance: exports.mongooseInstance, Product: exports.Product, Cart: exports.Cart };
    }
}
after(async function disconnectMongooseFixtures() {
    await exports.mongooseInstance.disconnect();
});
//# sourceMappingURL=mongooseFixtures.js.map
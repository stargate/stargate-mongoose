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
exports.Product = exports.Cart = exports.mongooseInstance = exports.productSchema = void 0;
exports.createMongooseCollections = createMongooseCollections;
const fixtures_1 = require("./fixtures");
const mongoose_1 = require("mongoose");
const StargateMongooseDriver = __importStar(require("../src/driver"));
const connection_1 = require("../src/driver/connection");
const driver_1 = require("../src/driver");
const tableDefinitionFromSchema_1 = __importDefault(require("../src/tableDefinitionFromSchema"));
const useTables = !!process.env.DATA_API_TABLES;
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
        ...(process.env.DATA_API_TABLES ? { default: undefined } : {})
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
async function createNamespace() {
    const connection = exports.mongooseInstance.connection;
    return connection.db.httpClient._request({
        url: connection.baseUrl + '/' + connection.baseApiPath,
        method: 'POST',
        data: JSON.stringify({
            createNamespace: {
                name: connection.keyspaceName
            }
        }),
        timeoutManager: connection.db.httpClient.tm.single('databaseAdminTimeoutMs', { timeout: 120000 })
    });
}
async function createMongooseCollections() {
    await createNamespace();
    const tableNames = await exports.mongooseInstance.connection.listTables({ nameOnly: true });
    if (useTables) {
        await exports.mongooseInstance.connection.dropTable(exports.Cart.collection.collectionName);
        await exports.mongooseInstance.connection.dropTable(exports.Product.collection.collectionName);
        await exports.mongooseInstance.connection.createTable(exports.Cart.collection.collectionName, (0, tableDefinitionFromSchema_1.default)(exports.Cart.schema));
        await exports.mongooseInstance.connection.createTable(exports.Product.collection.collectionName, {
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
    }
}
before(async function connectMongooseFixtures() {
    if (fixtures_1.isAstra) {
        // @ts-expect-error - these are config options supported by stargate-mongoose but not mongoose
        await exports.mongooseInstance.connect(fixtures_1.testClient.uri, fixtures_1.testClient.options);
    }
    else {
        await exports.mongooseInstance.connect(fixtures_1.testClient.uri, fixtures_1.testClient.options);
        const keyspace = (0, connection_1.parseUri)(fixtures_1.testClient.uri).keyspaceName;
        await exports.mongooseInstance.connection.createNamespace(keyspace);
    }
});
before(createMongooseCollections);
after(async function disconnectMongooseFixtures() {
    await exports.mongooseInstance.disconnect();
});
//# sourceMappingURL=mongooseFixtures.js.map
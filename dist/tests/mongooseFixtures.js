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
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createMongooseCollections = exports.Product = exports.Cart = exports.mongooseInstance = exports.productSchema = void 0;
const fixtures_1 = require("./fixtures");
const mongoose_1 = require("mongoose");
const StargateMongooseDriver = __importStar(require("../src/driver"));
const connection_1 = require("../src/driver/connection");
const driver_1 = require("../src/driver");
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
    tags: [{ _id: false, name: String }]
});
exports.mongooseInstance = new mongoose_1.Mongoose();
exports.mongooseInstance.setDriver(StargateMongooseDriver);
exports.mongooseInstance.set('autoCreate', false);
exports.mongooseInstance.set('autoIndex', false);
for (const plugin of driver_1.plugins) {
    exports.mongooseInstance.plugin(plugin);
}
exports.Cart = exports.mongooseInstance.model('Cart', cartSchema);
exports.Product = exports.mongooseInstance.model('Product', exports.productSchema);
async function createNamespace() {
    const connection = exports.mongooseInstance.connection;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return connection.db._httpClient._request({
        url: connection.baseUrl + '/' + connection.baseApiPath,
        method: 'POST',
        data: JSON.stringify({
            createNamespace: {
                name: connection.keyspaceName
            }
        }),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        timeoutManager: connection.db._httpClient.timeoutManager(120000)
    });
}
async function createMongooseCollections() {
    await createNamespace();
    const collections = await exports.mongooseInstance.connection.listCollections();
    const collectionNames = collections.map(({ name }) => name);
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
exports.createMongooseCollections = createMongooseCollections;
before(async function connectMongooseFixtures() {
    if (fixtures_1.isAstra) {
        // @ts-expect-error - these are config options supported by stargate-mongoose but not mongoose
        await exports.mongooseInstance.connect(fixtures_1.testClient.uri, { isAstra: true });
    }
    else {
        const options = {
            username: process.env.STARGATE_USERNAME,
            password: process.env.STARGATE_PASSWORD
        };
        const connection = exports.mongooseInstance.connection;
        await exports.mongooseInstance.connect(fixtures_1.testClient.uri, options);
        const keyspace = (0, connection_1.parseUri)(fixtures_1.testClient.uri).keyspaceName;
        await connection.admin.createNamespace(keyspace);
    }
});
before(createMongooseCollections);
after(async function disconnectMongooseFixtures() {
    await exports.mongooseInstance.disconnect();
});
//# sourceMappingURL=mongooseFixtures.js.map
"use strict";
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseUri = exports.Connection = void 0;
const collection_1 = require("./collection");
const astra_db_ts_1 = require("@datastax/astra-db-ts");
const db_1 = require("./db");
const connection_1 = __importDefault(require("mongoose/lib/connection"));
const mongoose_1 = require("mongoose");
const url_1 = __importDefault(require("url"));
const astra_db_ts_2 = require("@datastax/astra-db-ts");
const stargateMongooseError_1 = require("src/stargateMongooseError");
/**
 * Extends Mongoose's Connection class to provide compatibility with Data API. Responsible for maintaining the
 * connection to Data API.
 */
class Connection extends connection_1.default {
    constructor(base) {
        super(base);
        this.debugType = 'StargateMongooseConnection';
        this.initialConnection = null;
        this.client = null;
        this.admin = null;
        this.db = null;
        this.namespace = null;
        this.baseUrl = null;
        this.baseApiPath = null;
        this.models = {};
    }
    /**
     * Helper borrowed from Mongoose to wait for the connection to finish connecting. Because Mongoose
     * supports creating a new connection, registering some models, and connecting to the database later.
     * This method is private and should not be called by clients.
     *
     * #### Example:
     *     const conn = mongoose.createConnection();
     *     // This may call `createCollection()` internally depending on `autoCreate` option, even though
     *     // this connection hasn't connected to the database yet.
     *     conn.model('Test', mongoose.Schema({ name: String }));
     *     await conn.openUri(uri);
     *
     * @ignore
     */
    async _waitForClient() {
        const shouldWaitForClient = (this.readyState === mongoose_1.STATES.connecting || this.readyState === mongoose_1.STATES.disconnected) && this._shouldBufferCommands();
        if (shouldWaitForClient) {
            await this._waitForConnect();
        }
        else if (this.readyState !== mongoose_1.STATES.connected) {
            throw new stargateMongooseError_1.StargateMongooseError('Connection is not connected', { readyState: this.readyState });
        }
    }
    /**
     * Get a collection by name. Cached in `this.collections`.
     * @param name
     * @param options
     */
    collection(name, options) {
        if (!(name in this.collections)) {
            this.collections[name] = new collection_1.Collection(name, this, options);
        }
        return super.collection(name, options);
    }
    /**
     * Create a new collection in the database
     * @param name The name of the collection to create
     * @param options
     */
    async createCollection(name, options) {
        await this._waitForClient();
        return this.db.createCollection(name, options);
    }
    /**
     * Create a new table in the database
     * @param name
     * @param definition
     */
    async createTable(name, definition) {
        await this._waitForClient();
        return this.db.createTable(name, definition);
    }
    /**
     * Drop a collection from the database
     * @param name
     */
    async dropCollection(name) {
        await this._waitForClient();
        return this.db.dropCollection(name);
    }
    /**
     * Drop a table from the database
     * @param name The name of the table to drop
     */
    async dropTable(name) {
        await this._waitForClient();
        return this.db.dropTable(name);
    }
    /**
     * Create a new namespace in the database.
     * Throws an error if connecting to Astra, as Astra does not support creating namespaces through Data API.
     *
     * @param namespace The name of the namespace to create
     */
    async createNamespace(name) {
        await this._waitForClient();
        if (this.admin instanceof astra_db_ts_1.AstraAdmin) {
            throw new stargateMongooseError_1.StargateMongooseError('Cannot createNamespace() in Astra', { name });
        }
        return this.db.httpClient._request({
            url: this.baseUrl + '/' + this.baseApiPath,
            method: 'POST',
            data: JSON.stringify({
                createNamespace: {
                    name
                }
            }),
            timeoutManager: this.db.httpClient.tm.single('databaseAdminTimeoutMs', { timeout: 120000 })
        });
    }
    /**
     * Not implemented.
     *
     * @ignore
     */
    async dropDatabase() {
        throw new Error('dropDatabase() Not Implemented');
    }
    async listCollections(options) {
        await this._waitForClient();
        if (options?.nameOnly) {
            return this.db.listCollections({ ...options, nameOnly: true });
        }
        return this.db.listCollections({ ...options, nameOnly: false });
    }
    async listTables(options) {
        await this._waitForClient();
        if (options?.nameOnly) {
            return this.db.listTables({ ...options, nameOnly: true });
        }
        return this.db.listTables({ ...options, nameOnly: false });
    }
    /**
     * Run an arbitrary Data API command on the database
     * @param command The command to run
     */
    async runCommand(command) {
        await this._waitForClient();
        return this.db.command(command);
    }
    /**
     * List all keyspaces. Only available in local Data API, not Astra. Called "listDatabases" for Mongoose compatibility
     */
    async listDatabases() {
        if (this.admin instanceof astra_db_ts_1.AstraAdmin) {
            throw new stargateMongooseError_1.StargateMongooseError('Cannot listDatabases in Astra');
        }
        await this._waitForClient();
        return { databases: await this.admin.listKeyspaces().then(keyspaces => keyspaces.map(name => ({ name }))) };
    }
    /**
     * Logic for creating a connection to Data API. Mongoose calls `openUri()` internally when the
     * user calls `mongoose.create()` or `mongoose.createConnection(uri)`
     *
     * @param uri the connection string
     * @param options
     */
    async openUri(uri, options) {
        let _fireAndForget = false;
        if (options && '_fireAndForget' in options) {
            _fireAndForget = !!options._fireAndForget;
            delete options._fireAndForget;
        }
        // Set Mongoose-specific config options. Need to set
        // this in order to allow connection-level overrides for
        // these options.
        this.config = {
            autoCreate: options?.autoCreate,
            autoIndex: options?.autoIndex,
            sanitizeFilter: options?.sanitizeFilter,
            bufferCommands: options?.bufferCommands
        };
        for (const model of Object.values(this.models)) {
            model.init();
        }
        this.initialConnection = this.createClient(uri, options)
            .then(() => this)
            .catch(err => {
            this.readyState = mongoose_1.STATES.disconnected;
            throw err;
        });
        if (_fireAndForget) {
            return this;
        }
        await this.initialConnection;
        return this;
    }
    /**
     * Create an astra-db-ts client and corresponding objects: client, db, admin.
     * @param uri the connection string
     * @param options
     */
    async createClient(uri, options) {
        this._connectionString = uri;
        this._closeCalled = false;
        this.readyState = mongoose_1.STATES.connecting;
        const { baseUrl, keyspaceName, applicationToken, baseApiPath } = (0, exports.parseUri)(uri);
        const dbOptions = {
            dataApiPath: baseApiPath,
            additionalHeaders: {
                'Feature-Flag-tables': 'true'
            }
        };
        const { client, db, admin } = (() => {
            if (options?.isAstra) {
                const client = new astra_db_ts_2.DataAPIClient(applicationToken);
                return {
                    client,
                    db: options.useTables
                        ? new db_1.TablesDb(client.db(baseUrl, dbOptions), keyspaceName)
                        : new db_1.CollectionsDb(client.db(baseUrl, dbOptions), keyspaceName),
                    admin: client.admin({ adminToken: applicationToken })
                };
            }
            if (options?.username == null || options?.password == null) {
                throw new stargateMongooseError_1.StargateMongooseError('Username and password are required when connecting to self-hosted DSE', { uri, options });
            }
            const client = new astra_db_ts_2.DataAPIClient(new astra_db_ts_2.UsernamePasswordTokenProvider(options.username, options.password), { environment: 'dse' });
            const db = options?.useTables
                ? new db_1.TablesDb(client.db(baseUrl, dbOptions), keyspaceName)
                : new db_1.CollectionsDb(client.db(baseUrl, dbOptions), keyspaceName);
            return {
                client,
                db,
                admin: db.astraDb.admin({
                    environment: 'dse',
                    adminToken: new astra_db_ts_2.UsernamePasswordTokenProvider(options.username, options.password)
                })
            };
        })();
        const collections = Object.values(this.collections);
        for (const collection of collections) {
            collection._collection = undefined;
        }
        this.client = client;
        this.db = db;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        this.db.name = keyspaceName;
        this.admin = admin;
        this.baseUrl = baseUrl;
        this.namespace = keyspaceName;
        this.baseApiPath = baseApiPath;
        this.readyState = mongoose_1.STATES.connected;
        this.onOpen();
        return this;
    }
    /**
     * Not supported
     *
     * @param _client
     * @ignore
     */
    setClient(_client) {
        throw new stargateMongooseError_1.StargateMongooseError('SetClient not supported');
    }
    /**
     * For consistency with Mongoose's API. `mongoose.createConnection(uri)` returns the connection, **not** a promise,
     * so the Mongoose pattern to call `createConnection()` and wait for connection to succeed is
     * `await createConnection(uri).asPromise()`
     */
    asPromise() {
        return this.initialConnection;
    }
    /**
     * Not supported
     *
     * @ignore
     */
    startSession() {
        throw new stargateMongooseError_1.StargateMongooseError('startSession() Not Implemented');
    }
    /**
     * Mongoose calls `doClose()` to close the connection when the user calls `mongoose.disconnect()` or `conn.close()`.
     * Handles closing the astra-db-ts client.
     * This method is private and should not be called by clients directly. Mongoose will call this method internally when
     * the user calls `mongoose.disconnect()` or `conn.close()`.
     *
     * @returns Client
     * @ignore
     */
    doClose(_force) {
        if (this.client != null) {
            this.client.close();
        }
        return this;
    }
}
exports.Connection = Connection;
// Parse a connection URI in the format of: https://${baseUrl}/${baseAPIPath}/${keyspace}?applicationToken=${applicationToken}
const parseUri = (uri) => {
    const parsedUrl = url_1.default.parse(uri, true);
    const baseUrl = `${parsedUrl.protocol}//${parsedUrl.host}`;
    if (!parsedUrl.pathname) {
        throw new Error('Invalid URI: keyspace is required');
    }
    const keyspaceName = parsedUrl.pathname.substring(parsedUrl.pathname.lastIndexOf('/') + 1);
    // Remove the last part of the api path (which is assumed as the keyspace name). For example:
    //  /v1/testks1 => v1
    //  /apis/v1/testks1 => apis/v1
    //  /testks1 => '' (empty string)
    const baseApiPath = parsedUrl.pathname.substring(1, parsedUrl.pathname.lastIndexOf('/') + 1);
    const applicationToken = parsedUrl.query?.applicationToken;
    const authHeaderName = parsedUrl.query?.authHeaderName;
    if (Array.isArray(applicationToken)) {
        throw new Error('Invalid URI: multiple application tokens');
    }
    if (Array.isArray(authHeaderName)) {
        throw new Error('Invalid URI: multiple application auth header names');
    }
    if (keyspaceName.length === 0) {
        throw new Error('Invalid URI: keyspace is required');
    }
    return {
        baseUrl,
        baseApiPath,
        keyspaceName,
        applicationToken,
        authHeaderName
    };
};
exports.parseUri = parseUri;
//# sourceMappingURL=connection.js.map
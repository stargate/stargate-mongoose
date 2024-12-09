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
const connection_1 = __importDefault(require("mongoose/lib/connection"));
const mongoose_1 = require("mongoose");
const url_1 = __importDefault(require("url"));
const astra_db_ts_2 = require("@datastax/astra-db-ts");
class Connection extends connection_1.default {
    constructor(base) {
        super(base);
        this.debugType = 'StargateMongooseConnection';
        this.initialConnection = null;
        this.client = null;
        this.admin = null;
        this.db = null;
        this.namespace = null;
        this.config = null;
        this.baseUrl = null;
        this.baseApiPath = null;
    }
    _waitForClient() {
        return new Promise((resolve, reject) => {
            const shouldWaitForClient = (this.readyState === mongoose_1.STATES.connecting || this.readyState === mongoose_1.STATES.disconnected) && this._shouldBufferCommands();
            if (shouldWaitForClient) {
                this._queue.push({ fn: resolve });
            }
            else if (this.readyState === mongoose_1.STATES.disconnected && this.db == null) {
                reject(new Error('Connection is disconnected'));
            }
            else {
                resolve();
            }
        });
    }
    collection(name, options) {
        if (!(name in this.collections)) {
            this.collections[name] = new collection_1.Collection(name, this, options);
        }
        return super.collection(name, options);
    }
    async createCollection(name, options) {
        await this._waitForClient();
        return this.db.createCollection(name, { checkExists: false, ...options });
    }
    async dropCollection(name) {
        await this._waitForClient();
        return this.db.dropCollection(name);
    }
    async createNamespace(namespace) {
        await this._waitForClient();
        if (this.admin instanceof astra_db_ts_1.AstraAdmin) {
            throw new Error('Cannot createNamespace() in Astra');
        }
        // Use createKeyspace because createNamespace is deprecated
        return this.admin.createKeyspace(namespace);
    }
    async dropDatabase() {
        throw new Error('dropDatabase() Not Implemented');
    }
    async listCollections() {
        await this._waitForClient();
        return this.db.listCollections();
    }
    async runCommand(command) {
        await this._waitForClient();
        return this.db.command(command);
    }
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
            model.init().catch(() => { });
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
    async createClient(uri, options) {
        this._connectionString = uri;
        this._closeCalled = false;
        this.readyState = mongoose_1.STATES.connecting;
        const { baseUrl, keyspaceName, applicationToken, baseApiPath } = (0, exports.parseUri)(uri);
        const featureFlags = Array.isArray(options && options.featureFlags)
            ? (options.featureFlags ?? []).reduce((obj, key) => Object.assign(obj, { [key]: 'true' }), {})
            : null;
        this.featureFlags = featureFlags;
        const dbOptions = {
            namespace: keyspaceName,
            dataApiPath: baseApiPath
        };
        const { client, db, admin } = (() => {
            if (options?.isAstra) {
                const client = new astra_db_ts_2.DataAPIClient(applicationToken);
                const db = client.db(baseUrl, dbOptions);
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                Object.assign(db._httpClient.baseHeaders, featureFlags);
                return {
                    client,
                    db,
                    admin: client.admin({ adminToken: applicationToken })
                };
            }
            if (options?.username == null) {
                throw new Error('Username and password are required when connecting to Astra');
            }
            if (options?.password == null) {
                throw new Error('Username and password are required when connecting to Astra');
            }
            const client = new astra_db_ts_2.DataAPIClient(new astra_db_ts_2.UsernamePasswordTokenProvider(options.username, options.password), { environment: 'dse' });
            const db = client.db(baseUrl, dbOptions);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            Object.assign(db._httpClient.baseHeaders, featureFlags);
            return {
                client,
                db,
                admin: db.admin({
                    environment: 'dse',
                    adminToken: new astra_db_ts_2.UsernamePasswordTokenProvider(options.username, options.password)
                })
            };
        })();
        const collections = Object.values(this.collections);
        for (const collection of collections) {
            collection._collection = null;
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
    setClient(_client) {
        throw new Error('SetClient not supported');
    }
    asPromise() {
        return this.initialConnection;
    }
    startSession() {
        throw new Error('startSession() Not Implemented');
    }
    /**
     *
     * @returns Client
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
    const keyspaceName = parsedUrl.pathname?.substring(parsedUrl.pathname?.lastIndexOf('/') + 1);
    const baseApiPath = getBaseAPIPath(parsedUrl.pathname);
    const applicationToken = parsedUrl.query?.applicationToken;
    const authHeaderName = parsedUrl.query?.authHeaderName;
    if (Array.isArray(applicationToken)) {
        throw new Error('Invalid URI: multiple application tokens');
    }
    if (Array.isArray(authHeaderName)) {
        throw new Error('Invalid URI: multiple application auth header names');
    }
    if (!keyspaceName) {
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
// Removes the last part of the api path (which is assumed as the keyspace name). for example below are the sample input => output from this function
//  /v1/testks1 => v1
//  /apis/v1/testks1 => apis/v1
//  /testks1 => '' (empty string)
function getBaseAPIPath(pathFromUrl) {
    if (!pathFromUrl) {
        return '';
    }
    const pathElements = pathFromUrl.split('/');
    pathElements[pathElements.length - 1] = '';
    const baseApiPath = pathElements.join('/');
    return baseApiPath === '/' ? '' : baseApiPath.substring(1, baseApiPath.length - 1);
}
//# sourceMappingURL=connection.js.map
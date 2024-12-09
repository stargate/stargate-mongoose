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
Object.defineProperty(exports, "__esModule", { value: true });
exports.Client = void 0;
const db_1 = require("./db");
const utils_1 = require("./utils");
const client_1 = require("../client");
const logger_1 = require("../logger");
const driver_1 = require("../driver");
const options_1 = require("./options");
class Client {
    constructor(baseUrl, keyspaceName, options) {
        this.keyspaceName = keyspaceName;
        this.createNamespaceOnConnect = options?.createNamespaceOnConnect ?? true;
        //If the client is connecting to Astra, we don't want to create the namespace
        if (options?.isAstra) {
            if (options?.createNamespaceOnConnect) {
                throw new Error('Cannot set createNamespaceOnConnect when connecting to Astra');
            }
            this.createNamespaceOnConnect = false;
        }
        this.httpClient = new client_1.HTTPClient({
            baseApiPath: options.baseApiPath,
            baseUrl: baseUrl,
            applicationToken: options.applicationToken,
            logLevel: options.logLevel,
            authHeaderName: options.authHeaderName,
            username: options.username,
            password: options.password,
            isAstra: options.isAstra,
            logSkippedOptions: options.logSkippedOptions,
            useHTTP2: options.useHTTP2,
            featureFlags: options.featureFlags
        });
        this.dbs = new Map();
    }
    /**
   * Setup a connection to the Astra/Stargate Data API
   * @param uri an Stargate Data API uri (Eg. http://localhost:8181/v1/testks1) where testks1 is the name of the keyspace/Namespace which should always be the last part of the URL
   * @returns MongoClient
   */
    static async connect(uri, options) {
        const parsedUri = (0, utils_1.parseUri)(uri);
        const client = new Client(parsedUri.baseUrl, parsedUri.keyspaceName, {
            applicationToken: options?.applicationToken ? options?.applicationToken : parsedUri.applicationToken,
            baseApiPath: options?.baseApiPath ? options?.baseApiPath : parsedUri.baseApiPath,
            logLevel: options?.logLevel,
            authHeaderName: options?.authHeaderName,
            createNamespaceOnConnect: options?.createNamespaceOnConnect,
            username: options?.username,
            password: options?.password,
            isAstra: options?.isAstra,
            logSkippedOptions: options?.logSkippedOptions,
            useHTTP2: options?.useHTTP2,
            featureFlags: options?.featureFlags
        });
        await client.connect().catch(err => {
            // If `connect()` throws an error, there's no way for the calling code to
            // get a reference to `client()`. So make sure to close client in case we
            // have an open HTTP2 socket, otherwise there's no way to close the socket.
            client.close();
            throw err;
        });
        return client;
    }
    /**
   * Connect the MongoClient instance to Data API (create Namespace automatically when the 'createNamespaceOnConnect' flag is set to true)
   * @returns a MongoClient instance
   */
    async connect() {
        if (this.createNamespaceOnConnect && this.keyspaceName) {
            logger_1.logger.debug('Creating Namespace ' + this.keyspaceName);
            await (0, utils_1.createNamespace)(this.httpClient, this.keyspaceName);
        }
        else {
            logger_1.logger.debug('Not creating Namespace on connection!');
        }
        return this;
    }
    /**
   * Use a Data API keyspace
   * @param dbName the Data API keyspace to connect to
   * @returns Db
   */
    db(dbName) {
        if (dbName) {
            let db = this.dbs.get(dbName);
            if (db != null) {
                return db;
            }
            db = new db_1.Db(this.httpClient, dbName);
            this.dbs.set(dbName, db);
            return db;
        }
        if (this.keyspaceName) {
            let db = this.dbs.get(this.keyspaceName);
            if (db != null) {
                return db;
            }
            db = new db_1.Db(this.httpClient, this.keyspaceName);
            this.dbs.set(this.keyspaceName, db);
            return db;
        }
        throw new Error('Database name must be provided');
    }
    async findNamespaces() {
        return (0, utils_1.executeOperation)(async () => {
            const command = {
                findNamespaces: {}
            };
            return await this.httpClient.executeCommandWithUrl('/', command, options_1.retainNoOptions);
        });
    }
    /**
   *
   * @param maxListeners
   * @returns number
   */
    setMaxListeners(maxListeners) {
        return maxListeners;
    }
    /**
   *
   * @returns Client
   */
    close() {
        this.httpClient.close();
        return this;
    }
    startSession() {
        throw new driver_1.OperationNotSupportedError('startSession() Not Implemented');
    }
}
exports.Client = Client;
//# sourceMappingURL=client.js.map
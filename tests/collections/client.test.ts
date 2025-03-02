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

import assert from 'assert';
import { Client } from '../../src/collections/client';
import { testClient } from '../../tests/fixtures';
import { parseUri } from '../../src/collections/utils';

const localBaseUrl = 'http://localhost:8181';

describe('StargateMongoose clients test', () => {
    const baseUrl = 'https://db_id-region-1.apps.astra.datastax.com';
    let appClient: Client | null;
    let clientURI: string;
    before(async function () {
        if (testClient == null) {
            return this.skip();
        }
        appClient = await testClient.client;
        if (appClient == null) {
            return this.skip();
        }
        clientURI = testClient.uri;
    });

    describe('Client Connections', () => {
        it('should initialize a Client connection with a uri using connect', async () => {
            assert.ok(appClient);
        });
        it('should not a Client connection with an invalid uri', async () => {
            await assert.rejects(() => Client.connect('invaliduri'));
        });
        it('should have unique httpClients for each db', async () => {
            const dbFromUri = appClient?.db();
            const parsedUri = parseUri(clientURI);
            assert.strictEqual(dbFromUri?.name, parsedUri.keyspaceName);
            const newDb = appClient?.db('test-db');
            assert.strictEqual(newDb?.name, 'test-db');
        });

        it('should initialize a Client connection with a uri using connect with overrides', async () => {
            const AUTH_TOKEN_TO_CHECK = '123';
            const BASE_API_PATH_TO_CHECK = 'baseAPIPath1';
            const AUTH_HEADER_NAME_TO_CHECK = 'x-token';
            const client = await Client.connect(clientURI, {
                applicationToken: AUTH_TOKEN_TO_CHECK,
                baseApiPath: BASE_API_PATH_TO_CHECK,
                authHeaderName: AUTH_HEADER_NAME_TO_CHECK,
                createNamespaceOnConnect: false
            });
            assert.ok(client);
            assert.ok(client.httpClient);
            assert.strictEqual(client.httpClient.applicationToken, AUTH_TOKEN_TO_CHECK);
            assert.strictEqual(client.keyspaceName, parseUri(clientURI).keyspaceName);
            assert.strictEqual(client.httpClient.baseUrl, parseUri(clientURI).baseUrl + '/' + BASE_API_PATH_TO_CHECK);
            assert.strictEqual(client.httpClient.authHeaderName, AUTH_HEADER_NAME_TO_CHECK);
            const db = client.db();
            assert.ok(db);
            await client.close();
        });
        it('should parse baseApiPath from URL when possible', async () => {
            const AUTH_TOKEN_TO_CHECK = '123';
            const KEYSPACE_TO_CHECK = 'testks1';
            const BASE_API_PATH_TO_CHECK = 'baseAPIPath1';
            const AUTH_HEADER_NAME_TO_CHECK = 'x-token';
            const client = await Client.connect(parseUri(clientURI).baseUrl + '/' + BASE_API_PATH_TO_CHECK + '/' + KEYSPACE_TO_CHECK, {
                applicationToken: AUTH_TOKEN_TO_CHECK,
                authHeaderName: AUTH_HEADER_NAME_TO_CHECK,
                createNamespaceOnConnect: false
            });
            assert.ok(client);
            assert.ok(client.httpClient);
            assert.strictEqual(client.httpClient.applicationToken, AUTH_TOKEN_TO_CHECK);
            assert.strictEqual(client.keyspaceName, KEYSPACE_TO_CHECK);
            assert.strictEqual(client.httpClient.baseUrl, parseUri(clientURI).baseUrl + '/' + BASE_API_PATH_TO_CHECK);
            assert.strictEqual(client.httpClient.authHeaderName, AUTH_HEADER_NAME_TO_CHECK);
            const db = client.db();
            assert.ok(db);
            await client.close();
        });
        it('should parse baseApiPath from URL when possible (multiple path elements)', async () => {
            const AUTH_TOKEN_TO_CHECK = '123';
            const KEYSPACE_TO_CHECK = 'testks1';
            const BASE_API_PATH_TO_CHECK = 'apis/baseAPIPath1';
            const AUTH_HEADER_NAME_TO_CHECK = 'x-token';
            const client = await Client.connect(parseUri(clientURI).baseUrl + '/' + BASE_API_PATH_TO_CHECK + '/' + KEYSPACE_TO_CHECK, {
                applicationToken: AUTH_TOKEN_TO_CHECK,
                authHeaderName: AUTH_HEADER_NAME_TO_CHECK,
                createNamespaceOnConnect: false
            });
            assert.ok(client);
            assert.ok(client.httpClient);
            assert.strictEqual(client.httpClient.applicationToken, AUTH_TOKEN_TO_CHECK);
            assert.strictEqual(client.keyspaceName, KEYSPACE_TO_CHECK);
            assert.strictEqual(client.httpClient.baseUrl, parseUri(clientURI).baseUrl + '/' + BASE_API_PATH_TO_CHECK);
            assert.strictEqual(client.httpClient.authHeaderName, AUTH_HEADER_NAME_TO_CHECK);
            const db = client.db();
            assert.ok(db);
            await client.close();
        });
        it('should handle when the keyspace name is present in the baseApiPath also', async () => {
            //only the last occurrence of the keyspace name in the url path must be treated as keyspace
            //other parts of it should be simply be treated as baseApiPath
            const AUTH_TOKEN_TO_CHECK = '123';
            const KEYSPACE_TO_CHECK = 'testks1';
            const BASE_API_PATH_TO_CHECK = 'baseAPIPath1';
            const AUTH_HEADER_NAME_TO_CHECK = 'x-token';
            const baseUrl = localBaseUrl;
            const client = await Client.connect(baseUrl + '/testks1/' + BASE_API_PATH_TO_CHECK + '/' + KEYSPACE_TO_CHECK, {
                applicationToken: AUTH_TOKEN_TO_CHECK,
                authHeaderName: AUTH_HEADER_NAME_TO_CHECK,
                createNamespaceOnConnect: false
            });
            assert.ok(client);
            assert.ok(client.httpClient);
            assert.strictEqual(client.httpClient.applicationToken, AUTH_TOKEN_TO_CHECK);
            assert.strictEqual(client.keyspaceName, KEYSPACE_TO_CHECK);
            assert.strictEqual(client.httpClient.baseUrl, baseUrl + '/testks1/' + BASE_API_PATH_TO_CHECK);
            assert.strictEqual(client.httpClient.authHeaderName, AUTH_HEADER_NAME_TO_CHECK);
            const db = client.db();
            assert.ok(db);
            await client.close();
        });
        it('should honor the baseApiPath from options when provided', async () => {
            const AUTH_TOKEN_TO_CHECK = '123';
            const KEYSPACE_TO_CHECK = 'testks1';
            const BASE_API_PATH_TO_CHECK = 'baseAPIPath1';
            const AUTH_HEADER_NAME_TO_CHECK = 'x-token';
            const baseUrl = localBaseUrl;
            const client = await Client.connect(baseUrl + '/' + BASE_API_PATH_TO_CHECK + '/' + KEYSPACE_TO_CHECK, {
                applicationToken: AUTH_TOKEN_TO_CHECK,
                baseApiPath: 'baseAPIPath2',
                authHeaderName: AUTH_HEADER_NAME_TO_CHECK,
                createNamespaceOnConnect: false
            });
            assert.ok(client);
            assert.ok(client.httpClient);
            assert.strictEqual(client.httpClient.applicationToken, AUTH_TOKEN_TO_CHECK);
            assert.strictEqual(client.keyspaceName, KEYSPACE_TO_CHECK);
            assert.strictEqual(client.httpClient.baseUrl, baseUrl + '/baseAPIPath2');
            assert.strictEqual(client.httpClient.authHeaderName, AUTH_HEADER_NAME_TO_CHECK);
            const db = client.db();
            assert.ok(db);
            await client.close();
        });
        it('should handle empty baseApiPath', async () => {
            const AUTH_TOKEN_TO_CHECK = '123';
            const KEYSPACE_TO_CHECK = 'testks1';
            const AUTH_HEADER_NAME_TO_CHECK = 'x-token';

            const client = await Client.connect(baseUrl + '/' + KEYSPACE_TO_CHECK, {
                applicationToken: AUTH_TOKEN_TO_CHECK,
                authHeaderName: AUTH_HEADER_NAME_TO_CHECK,
                createNamespaceOnConnect: false
            });
            assert.ok(client);
            assert.ok(client.httpClient);
            assert.strictEqual(client.httpClient.applicationToken, AUTH_TOKEN_TO_CHECK);
            assert.strictEqual(client.keyspaceName, KEYSPACE_TO_CHECK);
            assert.strictEqual(client.httpClient.baseUrl, baseUrl);
            assert.strictEqual(client.httpClient.authHeaderName, AUTH_HEADER_NAME_TO_CHECK);
            const db = client.db();
            assert.ok(db);
            await client.close();
        });
        it('should initialize a Client connection with a uri using the constructor', () => {
            const client = new Client(baseUrl, 'keyspace1', {
                applicationToken: '123'
            });
            assert.ok(client);
        });
        it('should not initialize a Client connection with a uri using the constructor with no options', () => {
            assert.throws(() => {
                // @ts-expect-error intentionally passing no options
                new Client(baseUrl, 'keyspace1');
            });
        });
        it('should initialize a Client connection with a uri using the constructor and a keyspace', () => {
            const client = new Client(baseUrl, 'keyspace1', {
                applicationToken: '123'
            });
            assert.ok(client.keyspaceName);
        });
        it('should initialize a Client connection with a uri using the constructor and a blank keyspace', () => {
            const client = new Client(baseUrl, '', {
                applicationToken: '123'
            });
            assert.strictEqual(client.keyspaceName, '');
        });
        it('should connect after setting up the client with a constructor', async () => {
            const client = new Client(baseUrl, 'keyspace1', {
                applicationToken: '123',
                createNamespaceOnConnect: false
            });
            await client.connect();
            assert.ok(client);
            assert.ok(client.httpClient);
            await client.close();
        });
        it('should set the auth header name as set in the options', async () => {
            const TEST_HEADER_NAME = 'test-header';
            const client = new Client(baseUrl, 'keyspace1', {
                applicationToken: '123',
                authHeaderName: TEST_HEADER_NAME,
                createNamespaceOnConnect: false
            });
            const connectedClient = await client.connect();
            assert.ok(connectedClient);
            assert.strictEqual(connectedClient.httpClient.authHeaderName, TEST_HEADER_NAME);
            await client.close();
        });
        it('should create client when token is not present, but auth details are present', async () => {
            const client = new Client(baseUrl, 'keyspace1', {
                username: 'user1',
                password: 'pass1',
            });
            const connectedClient = client.connect();
            assert.ok(connectedClient);
            await client.close();
        });
        it('should not create client when token is not present & one/more of auth details are missing', () => {
            assert.throws(
                () => {
                    const client = new Client(baseUrl, 'keyspace1', {
                        username: 'user1'
                    });
                    client.connect();
                },
                { message: 'stargate-mongoose: must set `username` and `password` option when connecting if `applicationToken` not set' }
            );
        });
    });
    describe('Client Db operations', () => {
        it('should return a db after setting up the client with a constructor', async () => {
            const client = new Client(baseUrl, 'keyspace1', {
                applicationToken: '123',
                createNamespaceOnConnect: false
            });
            await client.connect();
            const db = client.db('keyspace1');
            assert.ok(db);

            await client.close();
        });
        it('should return a db if no name is provided', async () => {
            const client = new Client(baseUrl, 'keyspace1', {
                applicationToken: '123',
                createNamespaceOnConnect: false
            });
            await client.connect();
            assert.ok(client.db());
            await client.close();
        });
        it('close() should close HTTP client', async () => {
            const client = new Client(baseUrl, 'keyspace1', {
                applicationToken: '123',
                createNamespaceOnConnect: false,
                useHTTP2: true
            });
            await client.connect();
            assert.ok(!client.httpClient.closed);
            await client.close();
            assert.ok(client.httpClient.closed);

            await client.close();
            assert.ok(client.httpClient.closed);

            const error: Error | null = await client.db('test')!.collection('test')!.findOne({
                url: '/test'
            }).then(() => null, error => error);
            assert.ok(error);
            assert.ok(error.message.includes('Cannot make http2 request when client is closed'), error.message);
        });
        it('findNamespaces should list all namespaces', async () => {
            const parsedUri = parseUri(clientURI);
            const { status } = await appClient!.findNamespaces();
            assert.ok(Array.isArray(status.namespaces));
            assert.ok(parsedUri.keyspaceName);
            assert.ok(status.namespaces.includes(parsedUri.keyspaceName));
        });
    });
    describe('Client noops', () => {
        it('should handle noop: setMaxListeners', async () => {
            const maxListeners = appClient?.setMaxListeners(1);
            assert.strictEqual(maxListeners, 1);
        });
    });
});

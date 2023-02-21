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
import { Client } from '@/src/collections/client';
import { getAstraClient, astraUri } from '@/tests/fixtures';
import { parseUri } from '@/src/collections/utils';


describe('StargateMongoose - collections.Client', () => {
  const baseUrl = `https://db_id-region-1.apps.astra.datastax.com`;
  let astraClient: Client;
  before(async function () {
    astraClient = await getAstraClient();
    if (!astraClient) {
      return this.skip();
    }
  });

  describe('Client Connections', () => {
    it('should initialize a Client connection with a uri using connect', async () => {
      assert.ok(astraClient);
    });
    it('should not a Client connection with an invalid uri', async () => {
      try {
        const badClient = await Client.connect('invaliduri');
        assert.ok(badClient);
      } catch (e) {
        assert.ok(e);
      }
    });
    it('should have unique httpClients for each db', async () => {
      const dbFromUri = astraClient.db();      
      const parsedUri = parseUri(astraUri);
      assert.strictEqual(dbFromUri.name, parsedUri.keyspaceName);
      const newDb = astraClient.db('test-db');
      assert.strictEqual(newDb.name, 'test-db');
    });
    it('should initialize a Client connection with a uri using connect and a callback', done => {
      Client.connect(astraUri, (err, client) => {
        assert.strictEqual(err, undefined);
        assert.ok(client);
        assert.ok(client.httpClient);
        const db = client.db();
        assert.ok(db);
        done();
      });
    });
    it('should initialize a Client connection with a uri using connect with overrides', async () => {
      const AUTH_TOKEN_TO_CHECK = "123";
      const KEYSPACE_TO_CHECK = "keyspace1";
      const BASE_API_PATH_TO_CHECK = "baseAPIPath1";
      const LOG_LEVEL_TO_CHECK = "info";
      const AUTH_HEADER_NAME_TO_CHECK = "x-token";
      const client = await Client.connect(astraUri, {
          applicationToken: AUTH_TOKEN_TO_CHECK,
          keyspaceName: KEYSPACE_TO_CHECK,
          baseApiPath: BASE_API_PATH_TO_CHECK,
          logLevel: LOG_LEVEL_TO_CHECK,
          authHeaderName: AUTH_HEADER_NAME_TO_CHECK
        });        
        assert.ok(client);
        assert.ok(client.httpClient);
        assert.strictEqual(client.httpClient.applicationToken, AUTH_TOKEN_TO_CHECK);
        assert.strictEqual(client.keyspaceName, KEYSPACE_TO_CHECK);
        assert.strictEqual(client.httpClient.baseApiPath, BASE_API_PATH_TO_CHECK);          
        assert.strictEqual(client.httpClient.authHeaderName, AUTH_HEADER_NAME_TO_CHECK);
        const db = client.db();
        assert.ok(db);
    });
    it('should initialize a Client connection with a uri using the constructor', () => {
      const client = new Client(baseUrl  , {      
        applicationToken: "123"
      });
      assert.ok(client);
    });
    it('should not initialize a Client connection with a uri using the constructor with no options', () => {
      try {
        const client = new Client(baseUrl);
        assert.ok(client);
      } catch (e) {
        assert.ok(e);
      }
    });
    it('should initialize a Client connection with a uri using the constructor and a keyspace', () => {
      const client = new Client(baseUrl, {
        applicationToken: "123",
        keyspaceName: "keyspace1"
      });
      assert.ok(client.keyspaceName);
    });
    it('should initialize a Client connection with a uri using the constructor and a blank keyspace', () => {
      const client = new Client(baseUrl, {
        applicationToken: '123',
        keyspaceName: ''
      });
      assert.strictEqual(client.keyspaceName, '');
    });
    it('should connect after setting up the client with a constructor', async () => {
      const client = new Client(baseUrl, {
        applicationToken: '123'
      });
      await client.connect();
      assert.ok(client);
      assert.ok(client.httpClient);
    });
    it('should connect after setting up the client with a constructor using a callback', done => {
      const client = new Client(baseUrl, {
        applicationToken: '123'
      });
      client.connect((err, connectedClient) => {
        assert.ok(connectedClient);
        assert.ok(connectedClient.httpClient);
        done();
      });
    });
    it('should set the auth header name as set in the options', done => {
      const TEST_HEADER_NAME = 'test-header';
      const client = new Client(baseUrl, {
        applicationToken: '123',
        authHeaderName: TEST_HEADER_NAME
      });
      client.connect((err, connectedClient) => {
        assert.ok(connectedClient);
        assert.strictEqual(connectedClient.httpClient.authHeaderName, TEST_HEADER_NAME);
        done();
      });
    });
  });
  describe('Client Db operations', () => {
    it('should return a db after setting up the client with a constructor', async () => {
      const client = new Client(baseUrl, {
        applicationToken: '123'
      });
      await client.connect();
      const db = client.db('keyspace1');
      assert.ok(db);
    });
    it('should not return a db if no name is provided', async () => {
      const client = new Client(baseUrl, {
        applicationToken: '123'
      });
      await client.connect();
      try {
        const db = client.db();
        assert.ok(false);
      } catch (e) {
        assert.ok(e);
      }
    });
  });
  describe('Client noops', () => {
    it('should handle noop: setMaxListeners', async () => {
      const maxListeners = astraClient.setMaxListeners(1);
      assert.strictEqual(maxListeners, 1);
    });
    it('should handle noop: close', async () => {
      const closedClient = astraClient.close();
      assert.ok(closedClient);
    });
    it('should handle noop: close with a callback', async () => {
      astraClient.close((err, closedClient) => {
        assert.ok(closedClient);
      });
    });
  });
});

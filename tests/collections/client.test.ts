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

describe('StargateMongoose - collections.Client', () => {
  const baseUrl = `https://${process.env.ASTRA_DB_ID}-${process.env.ASTRA_DB_REGION}.apps.astra.datastax.com`;
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
      assert.strictEqual(dbFromUri.name, process.env.ASTRA_DB_KEYSPACE);
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
    it('should initialize a Client connection with a uri using the constructor', () => {
      const client = new Client(baseUrl, {
        applicationToken: process.env.ASTRA_DB_APPLICATION_TOKEN || ''
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
        applicationToken: process.env.ASTRA_DB_APPLICATION_TOKEN || '',
        keyspaceName: process.env.ASTRA_DB_KEYSPACE || ''
      });
      assert.ok(client.keyspaceName);
    });
    it('should initialize a Client connection with a uri using the constructor and a blank keyspace', () => {
      const client = new Client(baseUrl, {
        applicationToken: process.env.ASTRA_DB_APPLICATION_TOKEN || '',
        keyspaceName: ''
      });
      assert.strictEqual(client.keyspaceName, '');
    });
    it('should connect after setting up the client with a constructor', async () => {
      const client = new Client(baseUrl, {
        applicationToken: process.env.ASTRA_DB_APPLICATION_TOKEN || ''
      });
      await client.connect();
      assert.ok(client);
      assert.ok(client.httpClient);
    });
    it('should connect after setting up the client with a constructor using a callback', done => {
      const client = new Client(baseUrl, {
        applicationToken: process.env.ASTRA_DB_APPLICATION_TOKEN || ''
      });
      client.connect((err, connectedClient) => {
        assert.ok(connectedClient);
        assert.ok(connectedClient.httpClient);
        done();
      });
    });
  });
  describe('Client Db operations', () => {
    it('should return a db after setting up the client with a constructor', async () => {
      const client = new Client(baseUrl, {
        applicationToken: process.env.ASTRA_DB_APPLICATION_TOKEN || ''
      });
      await client.connect();
      const db = client.db(process.env.ASTRA_DB_KEYSPACE);
      assert.ok(db);
    });
    it('should not return a db if no name is provided', async () => {
      const client = new Client(baseUrl, {
        applicationToken: process.env.ASTRA_DB_APPLICATION_TOKEN || ''
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

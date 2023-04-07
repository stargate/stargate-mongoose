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
import { Db } from '@/src/collections/db';
import { Client } from '@/src/collections/client';
import { parseUri, createNamespace } from '@/src/collections/utils';
import { testClients, TEST_COLLECTION_NAME } from '@/tests/fixtures';
import { randAlphaNumeric } from '@ngneat/falso';

for (const testClient in testClients) {
  describe('StargateMongoose - collections.Db', async () => {
    let astraClient: Client;
    before(async function() {
      astraClient = await testClients[testClient]();
      if (astraClient == null) {
        return this.skip();
      }
    });

    describe('Db initialization', () => {
      it('should initialize a Db', () => {
        const db = new Db(astraClient.httpClient, 'test-db');
        assert.ok(db);
      });
      it('should not initialize a Db without a name', () => {
        let error:any;
        try {
          const db = new Db(astraClient.httpClient);
          assert.ok(db);
        } catch (e) {
          error = e;
        }
        assert.ok(error);
      });
    });

    describe('Db collection operations', () => {
      it('should initialize a Collection', () => {
        const db = new Db(astraClient.httpClient, 'test-db');
        const collection = db.collection('test-collection');
        assert.ok(collection);
      });
      it('should not initialize a Collection without a name', () => {
        let error:any;
        try {
          const db = new Db(astraClient.httpClient, 'test-db');
          const collection = db.collection();
          assert.ok(collection);
        } catch (e) {
          error = e;
        }
        assert.ok(error);
      });
      it('should create a Collection', async () => {
        const collectionName = TEST_COLLECTION_NAME;
        const db = new Db(astraClient.httpClient, parseUri(process.env.JSON_API_URI).keyspaceName);        
        const res = await db.createCollection(collectionName);
        assert.ok(res);
        assert.strictEqual(res.status.ok, 1);
        const res2 = await db.createCollection(collectionName);
        assert.ok(res2);
        assert.strictEqual(res2.status.ok, 1);
      });

      it('should drop a Collection', async () => {
        const db = new Db(astraClient.httpClient, parseUri(process.env.JSON_API_URI).keyspaceName);
        const suffix = randAlphaNumeric({ length: 4 }).join('');
        await db.createCollection(`test_db_collection_${suffix}`);
        const res = await db.dropCollection(`test_db_collection_${suffix}`);
        assert.strictEqual(res.status?.ok, 1);
        assert.strictEqual(res.errors, undefined);
      });
    });

    describe('dropDatabase', () => {
      after(async () => {
        const keyspaceName = parseUri(process.env.JSON_API_URI).keyspaceName;
        await createNamespace(astraClient, keyspaceName);
      });

      it('should drop the underlying database (AKA namespace)', async () => {
        const keyspaceName = parseUri(process.env.JSON_API_URI).keyspaceName;
        const db = new Db(astraClient.httpClient, keyspaceName);
        const suffix = randAlphaNumeric({ length: 4 }).join('');
        await db.createCollection(`test_db_collection_${suffix}`);
        const res = await db.dropDatabase();
        assert.strictEqual(res.status?.ok, 1);
  
        try {
          await db.createCollection(`test_db_collection_${suffix}`);
          assert.ok(false);
        } catch (err) {
          assert.equal(err.errors.length, 1);
          assert.equal(
            err.errors[0].message,
            'INVALID_ARGUMENT: Keyspace \'cycling\' doesn\'t exist'
          );
        }
        
      });
    });
  });
}

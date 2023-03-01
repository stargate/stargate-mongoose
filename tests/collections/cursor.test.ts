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
import { FindCursor } from '@/src/collections/cursor';
import { Collection } from '@/src/collections/collection';
import { Client } from '@/src/collections/client';
import { testClients, Employee, sampleUsersList, TEST_COLLECTION_NAME } from '@/tests/fixtures';

for (const testClient in testClients) {
  describe(`StargateMongoose - ${testClient} Connection - collections.cursor`, async () => {
    let astraClient: Client;
    let db: Db;
    let collection: Collection;
    const sampleUsers = sampleUsersList;
    before(async function() {
      astraClient = await testClients[testClient]();
      if (astraClient == null) {
        return this.skip();
      }
      db = astraClient.db();
      const collectionName:string = TEST_COLLECTION_NAME;
      await db.createCollection(collectionName);
      collection = db.collection(collectionName);
      await collection?.deleteMany({});
      await collection.insertMany(sampleUsers);
    });
    
    after(() => {
      // run drop collection async to save time
      db?.dropCollection(TEST_COLLECTION_NAME);
    });

    describe('Cursor initialization', () => {
      it('should initialize a Cursor', () => {
        const cursor = new FindCursor(collection, { username: sampleUsers[0].username });
        assert.strictEqual(cursor.status, 'initialized');
        assert.ok(cursor);
      });
    });

    describe('Cursor operations', () => {
      it('should execute a query', async () => {
        const cursor = new FindCursor(collection, { username: sampleUsers[0].username });
        const res = await cursor.toArray();
        assert.strictEqual(res.length, 1);
      });
      it('should get next document with next()', async () => {
        const cursor = new FindCursor(collection, {});
        const doc = await cursor.next();
        assert.ok(doc);
      });
      it('should execute a limited query', async () => {
        const cursor = new FindCursor(collection, {}, { limit: 2 });
        const res = await cursor.toArray();
        assert.strictEqual(res.length, 2);
        assert.equal(cursor.page.length, 2);
      });
      it('should execute an all query', async () => {
        const cursor = new FindCursor(collection, {});
        const res = await cursor.toArray();
        assert.strictEqual(res.length, sampleUsers.length);
      });
      it('should not execute twice', done => {
        const cursor = new FindCursor(collection, {});
        cursor.toArray((_err, _res) => {
          assert.strictEqual(cursor.status, 'executed');
          cursor.count(undefined, (err: Error, count: number) => {
            assert.strictEqual(undefined, err);
            assert.strictEqual(count, sampleUsers.length);
          });
          assert.strictEqual(cursor.status, 'executed');
          done();
        });
        assert.strictEqual(cursor.status, 'executing');
      });
      it('should iterate over all documents', async () => {
        const cursor = new FindCursor(collection, {});
        let docCount = 0;
        await cursor.forEach((_doc: any) => {
          docCount++;
        });
        assert.strictEqual(docCount, sampleUsers.length);
      });
      it('should iterate over all documents with a forEach()', async () => {
        const cursor = new FindCursor(collection, {});
        let docCount = 0;
        await cursor.forEach(async (_doc: any) => {
          await Promise.resolve();
          docCount++;
        });
        assert.strictEqual(docCount, sampleUsers.length);
      });
    });

    describe('Cursor noops', () => {
      it('should handle noop: stream', async () => {
        const cursor = new FindCursor(collection, { username: sampleUsers[0].username });
        try {
          const stream = cursor.stream();
          assert.ok(stream);
        } catch (e) {
          assert.ok(e);
        }
      });
    });
  });
}

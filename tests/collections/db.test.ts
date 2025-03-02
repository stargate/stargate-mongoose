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
import { Db } from '../../src/collections/db';
import { Client } from '../../src/collections/client';
import { parseUri, createNamespace } from '../../src/collections/utils';
import { testClient, TEST_COLLECTION_NAME } from '../fixtures';
import { createMongooseCollections } from '../mongooseFixtures';
import {HTTPClient} from '../../src/client';
import { randomBytes } from 'crypto';
import mongoose from 'mongoose';
import { StargateServerError } from '../../src/client/httpClient';

const randString = (length: number) => randomBytes(Math.ceil(length / 2)).toString('hex').slice(0, length);

describe('StargateMongoose - collections.Db', async () => {
    let astraClient: Client | null;
    const dbUri: string = testClient.uri;
    const isAstra: boolean = testClient.isAstra;
    let httpClient: HTTPClient;
    before(async function () {
        if (testClient == null) {
            return this.skip();
        }
        astraClient = await testClient.client;
        if (astraClient === null) {
            return this.skip();
        }
        httpClient = astraClient.httpClient;
    });

    describe('Db initialization', () => {
        it('should initialize a Db', () => {
            const db = new Db(httpClient, 'test-db');
            assert.ok(db);
        });
        it('should not initialize a Db without a name', () => {
            // @ts-expect-error - intentionally passing undefined for testing purposes
            assert.throws(() => new Db(httpClient));
        });
    });

    describe('Db collection operations', () => {
        before(async () => {
            const db = new Db(httpClient, parseUri(dbUri).keyspaceName);
            const collections = await db.findCollections().then(res => res.status.collections);
            if (collections.includes(TEST_COLLECTION_NAME)) {
                await db.dropCollection(TEST_COLLECTION_NAME);
            }
        });

        it('should initialize a Collection', () => {
            const db = new Db(httpClient, 'test-db');
            const collection = db.collection('test-collection');
            assert.ok(collection);
        });
        it('should not initialize a Collection without a name', () => {
            const db = new Db(httpClient, 'test-db');
            assert.throws(() => {
                // @ts-expect-error - intentionally passing undefined for testing purposes
                db.collection();
            });
        });
        it('should create a Collection', async () => {
            const collectionName = TEST_COLLECTION_NAME;

            const db = new Db(httpClient, parseUri(dbUri).keyspaceName);

            try {
                let collections = await db.findCollections().then(res => res.status.collections);
                assert.ok(!collections.includes(collectionName));

                const res = await db.createCollection(collectionName);
                assert.ok(res);
                assert.strictEqual(res.status.ok, 1);
                const res2 = await db.createCollection(collectionName);
                assert.ok(res2);
                assert.strictEqual(res2.status.ok, 1);

                collections = await db.findCollections().then(res => res.status.collections);
                assert.ok(collections.includes(collectionName));
            } finally {
                await db.dropCollection(collectionName);
            }
        });

        it('throws helpful error if calling createCollection with no args', async () => {
            const db = new Db(httpClient, parseUri(dbUri).keyspaceName);

            await assert.rejects(
                // @ts-expect-error
                () => db.createCollection(),
                /Must specify a collection name when calling createCollection/
            );
        });

        it('should create a Collection with allow indexing options', async () => {
            const collectionName = TEST_COLLECTION_NAME + '_allow';
            const db = new Db(httpClient, parseUri(dbUri).keyspaceName);

            try {
                let collections = await db.findCollections().then(res => res.status.collections);
                assert.ok(!collections.includes(collectionName));

                const res = await db.createCollection(
                    collectionName,
                    { indexing: { allow: ['name'] } }
                );
                assert.ok(res);
                assert.strictEqual(res.status.ok, 1);

                collections = await db.findCollections().then(res => res.status.collections);
                assert.ok(collections.includes(collectionName));

                await db.collection(collectionName).insertOne({ name: 'test', description: 'test' });
                await assert.rejects(
                    () => db.collection(collectionName).findOne({ description: 'test' }),
                    /filter path 'description' is not indexed/
                );

                const doc = await db.collection(collectionName).findOne({ name: 'test' });
                assert.equal(doc!.description, 'test');
            } finally {
                await db.dropCollection(collectionName);
            }
        });

        it('should create a Collection with deny indexing options', async () => {
            const collectionName = TEST_COLLECTION_NAME + '_deny';
            const db = new Db(httpClient, parseUri(dbUri).keyspaceName);

            try {
                let collections = await db.findCollections().then(res => res.status.collections);
                assert.ok(!collections.includes(collectionName));

                const res = await db.createCollection(
                    collectionName,
                    { indexing: { deny: ['description'] } }
                );
                assert.ok(res);
                assert.strictEqual(res.status.ok, 1);

                collections = await db.findCollections().then(res => res.status.collections);
                assert.ok(collections.includes(collectionName));

                await db.collection(collectionName).insertOne({ name: 'test', description: 'test' });
                await assert.rejects(
                    () => db.collection(collectionName).findOne({ description: 'test' }),
                    /filter path 'description' is not indexed/
                );

                const doc = await db.collection(collectionName).findOne({ name: 'test' });
                assert.equal(doc!.description, 'test');
            } finally {
                await db.dropCollection(collectionName);
            }
        });

        it('should create a collection with default id type', async () => {
            const collectionName = TEST_COLLECTION_NAME + '_objectid';
            const db = new Db(httpClient, parseUri(dbUri).keyspaceName);

            try {
                let collections = await db.findCollections().then(res => res.status.collections);
                assert.ok(!collections.includes(collectionName));

                const res = await db.createCollection(
                    collectionName,
                    { defaultId: { type: 'objectId' } }
                );
                assert.ok(res);
                assert.strictEqual(res.status.ok, 1);

                collections = await db.findCollections().then(res => res.status.collections);
                assert.ok(collections.includes(collectionName));

                const { insertedId } = await db.collection(collectionName).insertOne({ name: 'test' });
                assert.ok(insertedId instanceof mongoose.Types.ObjectId);

                const doc = await db.collection(collectionName).findOne({ _id: insertedId });
                assert.equal(doc!.name, 'test');
            } finally {
                await db.dropCollection(collectionName);
            }
        });

        it('should drop a Collection', async () => {
            const db = new Db(httpClient, parseUri(dbUri).keyspaceName);
            const suffix = randString(4);
            await db.createCollection(`test_db_collection_${suffix}`);
            const res = await db.dropCollection(`test_db_collection_${suffix}`);
            assert.strictEqual(res.status?.ok, 1);
            assert.strictEqual(res.errors, undefined);
        });

        it('throws helpful error if calling dropCollection with no args', async () => {
            const db = new Db(httpClient, parseUri(dbUri).keyspaceName);

            await assert.rejects(
                // @ts-expect-error
                () => db.dropCollection(),
                /Must specify a collection name when calling dropCollection/
            );
        });
    });

    describe('dropDatabase', () => {
        const suffix = randString(4);
        const keyspaceName = parseUri(dbUri).keyspaceName + '_' + suffix;
        before(async () => {
            if (isAstra) {
                return;
            }
            await createNamespace(httpClient, keyspaceName);
        });
        it('should drop the underlying database (AKA namespace)', async function() {
            if (isAstra) {
                return this.skip();
            }
            const db = new Db(httpClient, keyspaceName);

            await db.createCollection(`test_db_collection_${suffix}`);
            const res = await db.dropDatabase();
            assert.strictEqual(res.status?.ok, 1);

            const error: Error | null = await db.createCollection(`test_db_collection_${suffix}`).then(() => null, error => error);
            assert.ok(error instanceof StargateServerError);
            assert.strictEqual(error.errors.length, 1);
            assert.strictEqual(
                error.errors[0].message,
                'The provided keyspace does not exist: Unknown keyspace \'' + keyspaceName + '\', you must create it first'
            );
        });
    });

    describe('createDatabase', () => {
        after(async function () {
            this.timeout(120_000);
            if (isAstra) {
                return this.skip();
            }
            const keyspaceName = parseUri(dbUri).keyspaceName;
            await createNamespace(httpClient, keyspaceName);
            await createMongooseCollections();
        });

        it('should create the underlying database (AKA namespace)', async function() {
            if (isAstra) {
                return this.skip();
            }
            const keyspaceName = parseUri(dbUri).keyspaceName;
            const db = new Db(httpClient, keyspaceName);
            const suffix = randString(4);

            try {
                await db.dropDatabase().catch(err => {
                    if (err.errors[0].exceptionClass === 'NotFoundException') {
                        return;
                    }

                    throw err;
                });

                const error: Error | null = await db.createCollection(`test_db_collection_${suffix}`).then(() => null, error => error);
                assert.ok(error instanceof StargateServerError);
                assert.strictEqual(error.errors.length, 1);
                assert.strictEqual(
                    error.errors[0].message,
                    'The provided keyspace does not exist: Unknown keyspace \'' + keyspaceName + '\', you must create it first'
                );

                const res = await db.createDatabase();
                assert.strictEqual(res.status?.ok, 1);

                await db.createCollection(`test_db_collection_${suffix}`);
            } finally {
                await db.dropCollection(`test_db_collection_${suffix}`);
            }
        });
    });
});

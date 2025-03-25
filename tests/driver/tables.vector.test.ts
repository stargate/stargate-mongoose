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

import { FindCursor } from '@datastax/astra-db-ts';
import { InferSchemaType, Model, Schema, Types } from 'mongoose';
import { Vectorize } from '../../src/driver/vectorize';
import assert from 'assert';
import { testClient } from '../fixtures';
import { createMongooseCollections, mongooseInstanceTables as mongooseInstance } from '../mongooseFixtures';
import { once } from 'events';
import tableDefinitionFromSchema from '../../src/tableDefinitionFromSchema';

describe('TABLES: vector search', function() {
    let vectorIds: Types.ObjectId[] = [];
    const vectorSchema = new Schema(
        {
            vector: { type: [Number], default: () => void 0, dimension: 2 },
            name: 'String'
        },
        {
            autoCreate: false,
            autoIndex: false,
            versionKey: false
        }
    );
    let Vector: Model<InferSchemaType<typeof vectorSchema>>;

    before(async () => {
        await createMongooseCollections(true);
    });

    before(async function() {
        Vector = mongooseInstance.model(
            'VectorTable',
            vectorSchema,
            'vector_table'
        );

        const existingTables = await mongooseInstance.connection.listTables();
        const vectorTable = existingTables.find(t => t.name === 'vector_table');
        const hasValidVectorDefinition = vectorTable?.definition.columns.vector?.type === 'vector' &&
            vectorTable.definition.columns.vector?.dimension === 2;

        if (!hasValidVectorDefinition) {
            if (vectorTable) {
                await mongooseInstance.connection.dropTable('vector_table');
            }
            await mongooseInstance.connection.createTable('vector_table', tableDefinitionFromSchema(vectorSchema));
        }

        await mongooseInstance.connection.collection('vector_table').createVectorIndex('vectortables', 'vector');
    });

    beforeEach(async function() {
        await Vector.deleteMany({});
        const vectors = await Vector.create([
            {
                name: 'Test vector 1',
                vector: [1, 100]
            },
            {
                name: 'Test vector 2',
                vector: [100, 1]
            }
        ]);
        vectorIds = vectors.map(v => v._id);
    });

    it('drops and creates vector index', async function() {
        await mongooseInstance.connection.collection('vector_table').dropIndex('vectortables');
        let indexes = await mongooseInstance.connection.collection('vector_table').listIndexes().toArray();
        assert.deepStrictEqual(indexes, []);

        await mongooseInstance.connection.collection('vector_table').createVectorIndex('vectortables', 'vector');
        indexes = await mongooseInstance.connection.collection('vector_table').listIndexes().toArray();
        assert.deepStrictEqual(indexes, [
            {
                name: 'vectortables',
                definition: { column: 'vector', options: { metric: 'cosine', sourceModel: 'other' }  },
                indexType: 'vector',
                key: { vector: 1 }
            }
        ]);
    });

    it('supports updating $vector with save()', async function() {
        let doc = await Vector.findOne({ name: 'Test vector 1' }).orFail();
        doc.vector = [1, 101];
        await doc.save();

        doc = await Vector
            .findOne({ _id: doc._id })
            .orFail();
        assert.deepStrictEqual(doc.vector, [1, 101]);
    });

    it('supports sort() and similarity score with $meta with find()', async function() {
        const res = await Vector.find({}, null, { includeSimilarity: true }).sort({ vector: { $meta: [1, 99] } });
        assert.deepStrictEqual(res.map(doc => doc.name), ['Test vector 1', 'Test vector 2']);
        assert.deepStrictEqual(res.map(doc => doc.get('$similarity')), [1, 0.51004946]);
    });

    it('supports sort() with includeSortVector in find()', async function() {
        const cursor = await Vector
            .find({}, null, { includeSortVector: true })
            .sort({ vector: { $meta: [1, 99] } })
            .cursor();

        await once(cursor, 'cursor');
        const rawCursor = (cursor as unknown as { cursor: FindCursor<unknown> }).cursor;
        assert.deepStrictEqual(await rawCursor.getSortVector().then(vec => vec?.asArray()), [1, 99]);
    });

    it('supports sort() with $meta with find()', async function() {
        let res = await Vector.
            find({}).
            sort({ vector: { $meta: [1, 99] } });
        assert.deepStrictEqual(res.map(doc => doc.name), ['Test vector 1', 'Test vector 2']);

        res = await Vector.
            find({}).
            select({ vector: 0 }).
            sort({ vector: { $meta: [99, 1] } });
        assert.deepStrictEqual(res.map(doc => doc.name), ['Test vector 2', 'Test vector 1']);
        assert.deepStrictEqual(res.map(doc => doc.vector), [undefined, undefined]);

        res = await Vector.
            find({}).
            limit(999).
            sort({ vector: { $meta: [99, 1] } });
        assert.deepStrictEqual(res.map(doc => doc.name), ['Test vector 2', 'Test vector 1']);

        const doc = await Vector.
            findOne({}).
            orFail().
            sort({ vector: { $meta: [99, 1] } });
        assert.deepStrictEqual(doc.name, 'Test vector 2');

        await assert.rejects(
            Vector.find().limit(1001).sort({ vector: { $meta: [99, 1] } }),
            /Vector sorting is limited to a maximum of 1000 rows/
        );
    });

    it('supports unsetting vector', async function() {
        await Vector.
            updateOne(
                { _id: vectorIds[0] },
                { $unset: { vector: 1 } }
            ).
            orFail();
        const doc = await Vector.findOne({ _id: vectorIds[0] }).orFail();
        assert.deepStrictEqual(doc.vector, null);
        assert.strictEqual(doc.name, 'Test vector 1');
    });

    it('reports error if saving vector with wrong dimension', async function () {
        const doc = new Vector({
            name: 'Test vector wrong dimension',
            vector: [1, 2, 3]
        });
        await assert.rejects(() => doc.save(), /Array must be of length 2/);
    });

    it('can save doc with null vector', async function () {
        const doc = new Vector({
            name: 'Test vector wrong dimension',
            vector: null
        });
        await doc.save();

        const { vector } = await Vector.findById(doc._id).orFail();
        assert.strictEqual(vector, null);
    });
});

describe('TABLES: vectorize', function () {
    interface IVector {
        vector: string | number[] | null;
        name?: string | null;
    }
    const vectorSchema = new Schema<IVector>(
        {
            // Mongoose supports setting paths to SchemaType instances at runtime, but adding
            // TypeScript support for this has proven tricky, which is why there is an `as` workaround
            vector: new Vectorize('vector', {
                default: [],
                dimension: 1024,
                service: {
                    provider: 'nvidia',
                    modelName: 'NV-Embed-QA'
                }
            }) as unknown as 'Vectorize',
            name: 'String'
        },
        {
            autoCreate: false
        }
    );

    let Vector: Model<InferSchemaType<typeof vectorSchema>>;

    before(async () => {
        await createMongooseCollections(true);
    });

    before(async function() {
        if (!testClient!.isAstra) {
            return this.skip();
        }

        mongooseInstance.deleteModel(/Vector/);
        Vector = mongooseInstance.model(
            'Vector',
            vectorSchema,
            'vector_table'
        );

        const existingTables = await mongooseInstance.connection.listTables();
        const vectorTable = existingTables.find(t => t.name === 'vector_table');
        const hasValidVectorDefinition = vectorTable?.definition.columns.vector?.type === 'vector' &&
            vectorTable.definition.columns.vector?.dimension === 1024;

        if (!hasValidVectorDefinition) {
            if (vectorTable) {
                await mongooseInstance.connection.dropTable('vector_table');
            }
            const tableDefinition = tableDefinitionFromSchema(vectorSchema);
            await mongooseInstance.connection.createTable('vector_table', tableDefinition);
        }

        await mongooseInstance.connection.collection('vector_table').createVectorIndex('vectortables', 'vector');
    });

    beforeEach(async function () {
        await Vector.deleteMany({});
    });

    it('supports inserting vectorize doc', async function () {
        const { _id } = await Vector.create({ name: 'Moby-Dick', vector: 'Call me Ishmael.' });
        assert.ok(_id);
        const fromDb = await Vector.findById(_id).orFail();
        await fromDb.validate();

        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const _start: number | string = fromDb.vector![0];
        assert.ok(Array.isArray(fromDb.vector));
        assert.equal(fromDb.vector.length, 1024);

        fromDb.vector = 'Some years ago--never mind how long precisely...';
        await fromDb.save();
    });

    it('supports sorting on vectorize', async function () {
        await Vector.collection.insertOne({ _id: new Types.ObjectId(), name: 'Recipe', vector: 'My Taco Recipe: 1 corn tortilla, 2 oz ground beef' });
        await Vector.collection.insertOne({ _id: new Types.ObjectId(), name: 'Story', vector: 'Colorful butterflies soar high above the blooming garden' });
        let doc = await Vector.findOne().sort({ vector: { $meta: 'flowers' } }).orFail();
        assert.equal(doc.name, 'Story');

        doc = await Vector.findOne().sort({ vector: { $meta: 'mexican food' } }).orFail();
        assert.equal(doc.name, 'Recipe');
    });

    it('throws if creating a schema with Vectorize but no provider', async function () {
        assert.throws(() => {
            new Schema({
                vector: {
                    type: Vectorize,
                    dimension: 1024
                }
            });
        }, /`provider` option for vectorize paths must be a string, got: undefined/);
    });
});

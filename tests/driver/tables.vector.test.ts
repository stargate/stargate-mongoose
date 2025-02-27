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
import assert from 'assert';
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
        if (!existingTables.find(t => t.name === 'vector_table')) {
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

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
const mongoose_1 = require("mongoose");
const assert_1 = __importDefault(require("assert"));
const mongooseFixtures_1 = require("../mongooseFixtures");
const events_1 = require("events");
const tableDefinitionFromSchema_1 = __importDefault(require("../../src/tableDefinitionFromSchema"));
describe('TABLES: vector search', function () {
    let vectorIds = [];
    const vectorSchema = new mongoose_1.Schema({
        vector: { type: [Number], default: () => void 0, dimension: 2 },
        name: 'String'
    }, {
        autoCreate: false,
        autoIndex: false,
        versionKey: false
    });
    let Vector;
    before(async () => {
        await (0, mongooseFixtures_1.createMongooseCollections)(true);
    });
    before(async function () {
        Vector = mongooseFixtures_1.mongooseInstanceTables.model('VectorTable', vectorSchema, 'vector_table');
        const existingTables = await mongooseFixtures_1.mongooseInstanceTables.connection.listTables();
        if (!existingTables.find(t => t.name === 'vector_table')) {
            await mongooseFixtures_1.mongooseInstanceTables.connection.createTable('vector_table', (0, tableDefinitionFromSchema_1.default)(vectorSchema));
            await mongooseFixtures_1.mongooseInstanceTables.connection.collection('vector_table').createVectorIndex('vectortables', 'vector');
        }
    });
    beforeEach(async function () {
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
    it('supports updating $vector with save()', async function () {
        let doc = await Vector.findOne({ name: 'Test vector 1' }).orFail();
        doc.vector = [1, 101];
        await doc.save();
        doc = await Vector
            .findOne({ _id: doc._id })
            .orFail();
        assert_1.default.deepStrictEqual(doc.vector, [1, 101]);
    });
    it('supports sort() and similarity score with $meta with find()', async function () {
        const res = await Vector.find({}, null, { includeSimilarity: true }).sort({ vector: { $meta: [1, 99] } });
        assert_1.default.deepStrictEqual(res.map(doc => doc.name), ['Test vector 1', 'Test vector 2']);
        assert_1.default.deepStrictEqual(res.map(doc => doc.get('$similarity')), [1, 0.51004946]);
    });
    it('supports sort() with includeSortVector in find()', async function () {
        const cursor = await Vector
            .find({}, null, { includeSortVector: true })
            .sort({ vector: { $meta: [1, 99] } })
            .cursor();
        await (0, events_1.once)(cursor, 'cursor');
        const rawCursor = cursor.cursor;
        assert_1.default.deepStrictEqual(await rawCursor.getSortVector().then(vec => vec?.asArray()), [1, 99]);
    });
    it('supports sort() with $meta with find()', async function () {
        let res = await Vector.
            find({}).
            sort({ vector: { $meta: [1, 99] } });
        assert_1.default.deepStrictEqual(res.map(doc => doc.name), ['Test vector 1', 'Test vector 2']);
        res = await Vector.
            find({}).
            select({ vector: 0 }).
            sort({ vector: { $meta: [99, 1] } });
        assert_1.default.deepStrictEqual(res.map(doc => doc.name), ['Test vector 2', 'Test vector 1']);
        assert_1.default.deepStrictEqual(res.map(doc => doc.vector), [undefined, undefined]);
        res = await Vector.
            find({}).
            limit(999).
            sort({ vector: { $meta: [99, 1] } });
        assert_1.default.deepStrictEqual(res.map(doc => doc.name), ['Test vector 2', 'Test vector 1']);
        const doc = await Vector.
            findOne({}).
            orFail().
            sort({ vector: { $meta: [99, 1] } });
        assert_1.default.deepStrictEqual(doc.name, 'Test vector 2');
        await assert_1.default.rejects(Vector.find().limit(1001).sort({ vector: { $meta: [99, 1] } }), /Vector sorting is limited to a maximum of 1000 rows/);
    });
    it('supports unsetting vector', async function () {
        await Vector.
            updateOne({ _id: vectorIds[0] }, { $unset: { vector: 1 } }).
            orFail();
        const doc = await Vector.findOne({ _id: vectorIds[0] }).orFail();
        assert_1.default.deepStrictEqual(doc.vector, null);
        assert_1.default.strictEqual(doc.name, 'Test vector 1');
    });
});
//# sourceMappingURL=tables.vector.test.js.map
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
exports.testClient = exports.isAstra = exports.testClientName = exports.sleep = exports.getSampleDocs = exports.sampleUsersList = exports.createSampleDoc3WithMultiLevel = exports.createSampleDoc2WithMultiLevel = exports.createSampleDocWithMultiLevel = exports.createSampleDocWithMultiLevelWithId = exports.createSampleDoc = exports.TEST_COLLECTION_NAME = void 0;
const assert_1 = __importDefault(require("assert"));
exports.TEST_COLLECTION_NAME = 'collection1';
const createSampleDoc = () => ({
    _id: 'doc1',
    username: 'aaron'
});
exports.createSampleDoc = createSampleDoc;
const sampleMultiLevelDoc = {
    username: 'aaron',
    human: true,
    age: 47,
    password: null,
    address: {
        number: 86,
        street: 'monkey street',
        suburb: null,
        city: 'big banana',
        is_office: false
    }
};
const createSampleDocWithMultiLevelWithId = (docId) => {
    const sampleMultiLevelDocWithId = JSON.parse(JSON.stringify(sampleMultiLevelDoc)); //parse and stringigy is to clone and modify only the new object
    sampleMultiLevelDocWithId._id = docId;
    return sampleMultiLevelDocWithId;
};
exports.createSampleDocWithMultiLevelWithId = createSampleDocWithMultiLevelWithId;
const createSampleDocWithMultiLevel = () => sampleMultiLevelDoc;
exports.createSampleDocWithMultiLevel = createSampleDocWithMultiLevel;
const createSampleDoc2WithMultiLevel = () => ({
    username: 'jimr',
    human: true,
    age: 52,
    password: 'gasxaq==',
    address: {
        number: 45,
        street: 'main street',
        suburb: 'not null',
        city: 'nyc',
        is_office: true,
        country: 'usa'
    }
});
exports.createSampleDoc2WithMultiLevel = createSampleDoc2WithMultiLevel;
const createSampleDoc3WithMultiLevel = () => ({
    username: 'saml',
    human: false,
    age: 25,
    password: 'jhkasfka==',
    address: {
        number: 123,
        street: 'church street',
        suburb: null,
        city: 'la',
        is_office: true,
        country: 'usa'
    }
});
exports.createSampleDoc3WithMultiLevel = createSampleDoc3WithMultiLevel;
exports.sampleUsersList = Array.of((0, exports.createSampleDocWithMultiLevel)(), (0, exports.createSampleDoc2WithMultiLevel)(), (0, exports.createSampleDoc3WithMultiLevel)());
const getSampleDocs = (numUsers) => Array.from({ length: numUsers }, exports.createSampleDoc);
exports.getSampleDocs = getSampleDocs;
const sleep = async (ms = 100) => new Promise(resolve => setTimeout(resolve, ms));
exports.sleep = sleep;
exports.testClientName = process.env.TEST_DOC_DB;
assert_1.default.ok(exports.testClientName === 'astra' || exports.testClientName === 'dataapi');
exports.isAstra = process.env.TEST_DOC_DB === 'astra' && !!process.env.ASTRA_URI;
exports.testClient = process.env.TEST_DOC_DB === 'astra' ?
    (process.env.ASTRA_URI ?
        {
            isAstra: exports.isAstra,
            uri: process.env.ASTRA_URI,
            options: { isAstra: true }
        } : null)
    : (process.env.TEST_DOC_DB === 'dataapi' ? (process.env.DATA_API_URI ?
        {
            isAstra: exports.isAstra,
            uri: process.env.DATA_API_URI,
            options: {
                username: process.env.STARGATE_USERNAME,
                password: process.env.STARGATE_PASSWORD,
                useTables: !!process.env.DATA_API_TABLES
            }
        } : null) : null);
//# sourceMappingURL=fixtures.js.map
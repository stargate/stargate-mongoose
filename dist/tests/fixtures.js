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
exports.testClient = exports.isAstra = exports.testClientName = exports.sleep = exports.TEST_TABLE_NAME = exports.TEST_COLLECTION_NAME = void 0;
const assert_1 = __importDefault(require("assert"));
exports.TEST_COLLECTION_NAME = 'collection1';
exports.TEST_TABLE_NAME = 'table1';
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
                password: process.env.STARGATE_PASSWORD
            }
        } : null) : null);
//# sourceMappingURL=fixtures.js.map
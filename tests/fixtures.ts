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

export const TEST_COLLECTION_NAME = 'collection1';
export const TEST_TABLE_NAME = 'table1';

export const sleep = async (ms = 100) => new Promise(resolve => setTimeout(resolve, ms));

export const testClientName = process.env.TEST_DOC_DB;
assert.ok(testClientName === 'astra' || testClientName === 'dataapi');

export const isAstra = process.env.TEST_DOC_DB === 'astra' && !!process.env.ASTRA_URI;

export const testClient = process.env.TEST_DOC_DB === 'astra' ?
    (process.env.ASTRA_URI ?
        {
            // Explicitly setting isAstra to true to align with the new default behavior.
            isAstra: true,
            uri: process.env.ASTRA_URI,
            options: {}
        } : null)
    : (process.env.TEST_DOC_DB === 'dataapi' ? (process.env.DATA_API_URI ?
        {
            isAstra: false,
            uri: process.env.DATA_API_URI,
            options: {
                isAstra: false,
                username: process.env.STARGATE_USERNAME,
                password: process.env.STARGATE_PASSWORD
            }
        } : null
    ) : null);

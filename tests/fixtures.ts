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

export const createSampleDoc = () => ({
    _id: 'doc1',
    username: 'aaron'
});

export interface Employee {
  _id?: string;
  username?: string;
  human?: boolean;
  age?: number;
  password?: string | null;
  address?: {
    number?: number;
    street?: string | null;
    suburb?: string | null;
    city?: string | null;
    is_office?: boolean;
    country?: string | null;
  }
}

const sampleMultiLevelDoc: Employee = {
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

export const createSampleDocWithMultiLevelWithId = (docId: string) => {
    const sampleMultiLevelDocWithId = JSON.parse(JSON.stringify(sampleMultiLevelDoc)) as Employee; //parse and stringigy is to clone and modify only the new object
    sampleMultiLevelDocWithId._id = docId;
    return sampleMultiLevelDocWithId;
};

export const createSampleDocWithMultiLevel = () => (sampleMultiLevelDoc as Employee);

export const createSampleDoc2WithMultiLevel = () => ({
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
} as Employee);

export const createSampleDoc3WithMultiLevel = () => ({
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
} as Employee);

export const sampleUsersList = Array.of(createSampleDocWithMultiLevel(), createSampleDoc2WithMultiLevel(), createSampleDoc3WithMultiLevel()) as Employee[];

export const getSampleDocs = (numUsers: number) =>
    Array.from({ length: numUsers }, createSampleDoc);

export const sleep = async (ms = 100) => new Promise(resolve => setTimeout(resolve, ms));

export const testClientName = process.env.TEST_DOC_DB;
assert.ok(testClientName === 'astra' || testClientName === 'dataapi');

export const isAstra = process.env.TEST_DOC_DB === 'astra' && !!process.env.ASTRA_URI;

export const testClient = process.env.TEST_DOC_DB === 'astra' ?
    (process.env.ASTRA_URI ?
        {
            isAstra,
            uri: process.env.ASTRA_URI,
            options: {isAstra: true}
        } : null)
    : (process.env.TEST_DOC_DB === 'dataapi' ? (process.env.DATA_API_URI ?
        {
            isAstra,
            uri: process.env.DATA_API_URI,
            options: {
                username: process.env.STARGATE_USERNAME,
                password: process.env.STARGATE_PASSWORD,
                useTables: !!process.env.DATA_API_TABLES
            }
        } : null
    ) : null);

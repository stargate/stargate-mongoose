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
import { AstraEnvironment, createAstraUri } from '@/src/collections/utils';

describe('Utils test', () => {
  it('createProdAstraUri', () => {
    const dbIdUUID: string = 'ddd5843c-3dea-11ee-be56-0242ac120002';
    const uri: string = createAstraUri(dbIdUUID,'us-east1','testks1');
    assert.strictEqual(uri, 'https://'+dbIdUUID+'-us-east1.apps.astra.datastax.com/api/json/v1/testks1');
  });
  it('createProdAstraUriWithToken', () => {
    const dbIdUUID: string = 'ddd5843c-3dea-11ee-be56-0242ac120002';
    const uri: string = createAstraUri(dbIdUUID,'us-east1','testks1', 'myToken');
    assert.strictEqual(uri, 'https://'+dbIdUUID+'-us-east1.apps.astra.datastax.com/api/json/v1/testks1?applicationToken=myToken');
  });
  it('createProdAstraUriWithTokenAndProdEnum', () => {
    const dbIdUUID: string = 'ddd5843c-3dea-11ee-be56-0242ac120002';
    const uri: string = createAstraUri(dbIdUUID,'us-east1','testks1', 'myToken', AstraEnvironment.PRODUCTION);
    assert.strictEqual(uri, 'https://'+dbIdUUID+'-us-east1.apps.astra.datastax.com/api/json/v1/testks1?applicationToken=myToken');
  });
  it('createProdAstraUriWithTokenAndProdEnumWithBaseAPIPath', () => {
    const dbIdUUID: string = 'ddd5843c-3dea-11ee-be56-0242ac120002';
    const uri: string = createAstraUri(dbIdUUID,'us-east1','testks1', 'myToken', AstraEnvironment.PRODUCTION, 'apis');
    assert.strictEqual(uri, 'https://'+dbIdUUID+'-us-east1.apps.astra.datastax.com/apis/testks1?applicationToken=myToken');
  });
  it('createDevAstraUri', () => {
    const dbIdUUID: string = 'ddd5843c-3dea-11ee-be56-0242ac120002';
    const uri: string = createAstraUri(dbIdUUID,'us-east1','testks1', undefined, AstraEnvironment.DEVELOPMENT);
    assert.strictEqual(uri, 'https://'+dbIdUUID+'-us-east1.apps.astra-dev.datastax.com/api/json/v1/testks1');
  });
  it('createDevAstraUriWithBaseAPIPath', () => {
    const dbIdUUID: string = 'ddd5843c-3dea-11ee-be56-0242ac120002';
    const uri: string = createAstraUri(dbIdUUID,'us-east1','testks1', undefined, AstraEnvironment.DEVELOPMENT, 'apis/dev/v1');
    assert.strictEqual(uri, 'https://'+dbIdUUID+'-us-east1.apps.astra-dev.datastax.com/apis/dev/v1/testks1');
  });
  it('createTestAstraUri', () => {
    const dbIdUUID: string = 'ddd5843c-3dea-11ee-be56-0242ac120002';
    const uri: string = createAstraUri(dbIdUUID,'us-east1','testks1', 'myToken', AstraEnvironment.TEST);
    assert.strictEqual(uri, 'https://'+dbIdUUID+'-us-east1.apps.astra-test.datastax.com/api/json/v1/testks1?applicationToken=myToken');
  });
  it('createTestAstraUriWithBaseAPIPath', () => {
    const dbIdUUID: string = 'ddd5843c-3dea-11ee-be56-0242ac120002';
    const uri: string = createAstraUri(dbIdUUID,'us-east1','testks1', 'myToken', AstraEnvironment.TEST, 'apis/test/v1');
    assert.strictEqual(uri, 'https://'+dbIdUUID+'-us-east1.apps.astra-test.datastax.com/apis/test/v1/testks1?applicationToken=myToken');
  });
});
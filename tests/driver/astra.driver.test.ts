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
import mongoose from 'mongoose';
import * as StargateMongooseDriver from '../../src/driver';
import { testClient, TEST_COLLECTION_NAME } from '../fixtures';
import { createMongooseCollections } from '../mongooseFixtures';

describe('astra tests', function () {
    let mongooseInstance: StargateMongoose;

    before(function () {
        if (!testClient!.isAstra) {
            return this.skip();
        }
    });

    before(async function() {
        this.timeout(120_000);
        ({ mongooseInstance } = await createMongooseCollections(false));
    });

    it('throws if calling listDatabases()', async function () {
        await assert.rejects(mongooseInstance!.connection.listDatabases(), /Cannot listDatabases in Astra/);
    });

    it('throws if calling createNamespace()', async function () {
        await assert.rejects(mongooseInstance!.connection.createNamespace('taco'), /Cannot createNamespace\(\) in Astra/);
    });
});

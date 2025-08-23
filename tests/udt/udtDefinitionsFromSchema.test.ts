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

import { Schema } from 'mongoose';
import assert from 'assert';
import udtDefinitionsFromSchema from '../../src/udt/udtDefinitionsFromSchema';

describe('udtDefinitionsFromSchema', () => {
    it('gets UDTs from nested schema paths', async () => {
        const subschema = new Schema({
            line1: String,
            line2: String,
            city: String,
            state: String,
            zip: String,
            country: String
        }, { udtName: 'Address' });

        const testSchema = new Schema({
            address: { type: subschema },
            savedAddresses: [subschema],
            addressesByName: {
                type: Map,
                of: { type: subschema, required: true }
            }
        });

        const udtDefinitions = udtDefinitionsFromSchema(testSchema);
        assert.deepStrictEqual(udtDefinitions, {
            Address: {
                name: 'Address',
                definition: {
                    _id: { type: 'text' },
                    __v: { type: 'int' },
                    line1: { type: 'text' },
                    line2: { type: 'text' },
                    city: { type: 'text' },
                    state: { type: 'text' },
                    zip: { type: 'text' },
                    country: { type: 'text' }
                }
            }
        });
    });
});

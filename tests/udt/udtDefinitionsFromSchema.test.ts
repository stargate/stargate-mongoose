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
                fields: {
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

    it('handles multiple different UDTs in the same schema', async () => {
        const addressSchema = new Schema({
            line1: String,
            line2: String,
            city: String,
            state: String,
            zip: String,
            country: String
        }, { udtName: 'Address' });

        const phoneSchema = new Schema({
            type: String,
            number: String,
            extension: String
        }, { udtName: 'Phone' });

        const testSchema = new Schema({
            address: { type: addressSchema },
            phone: { type: phoneSchema },
            savedAddresses: [addressSchema],
            savedPhones: [phoneSchema],
            addressesByName: {
                type: Map,
                of: { type: addressSchema, required: true }
            },
            phonesByType: {
                type: Map,
                of: { type: phoneSchema, required: true }
            }
        });

        const udtDefinitions = udtDefinitionsFromSchema(testSchema);
        assert.deepStrictEqual(udtDefinitions, {
            Address: {
                fields: {
                    _id: { type: 'text' },
                    __v: { type: 'int' },
                    line1: { type: 'text' },
                    line2: { type: 'text' },
                    city: { type: 'text' },
                    state: { type: 'text' },
                    zip: { type: 'text' },
                    country: { type: 'text' }
                }
            },
            Phone: {
                fields: {
                    _id: { type: 'text' },
                    __v: { type: 'int' },
                    type: { type: 'text' },
                    number: { type: 'text' },
                    extension: { type: 'text' }
                }
            }
        });
    });

    it('throws an error when conflicting UDT definitions are found', async () => {
        const addressSchema1 = new Schema({
            line1: String,
            city: String
        }, { udtName: 'Address' });

        const addressSchema2 = new Schema({
            line1: String,
            city: String,
            zip: String // extra field to cause conflict
        }, { udtName: 'Address' });

        const testSchema = new Schema({
            address1: { type: addressSchema1 },
            address2: { type: addressSchema2 }
        });

        assert.throws(() => {
            udtDefinitionsFromSchema(testSchema);
        }, /Conflicting definition for UDT Address at address2/);
    });

    it('throws an error when schema type has a UDT name but is not a subdocument', async () => {
        const testSchema = new Schema({
            address1: { type: String },
            address2: { type: new Schema({ line1: String, city: String }), udtName: 'Address' },
            address3: { type: String, udtName: 'Address' }
        });

        assert.throws(() => {
            udtDefinitionsFromSchema(testSchema);
        }, /Path address3 cannot store a UDT, must be a subdocument, document array, or map./);
    });
});

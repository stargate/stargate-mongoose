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

import { ObjectId } from 'bson';
import assert from 'assert';
import { deserialize } from '../../src/client/deserialize';

describe('StargateMongoose - client.deserialize', () => {
    describe('deserialize', () => {
        it('should deserialize $objectId in objects and arrays', () => {
            const $objectId = '0'.repeat(24);
            const obj = {
                test: 42,
                topLevelObjectId: { $objectId },
                subdoc: {
                    nestedObjectId: { $objectId }
                },
                arr: [
                    { $objectId },
                    { objectId: { $objectId } },
                    42
                ]
            };
            const res = deserialize(obj);

            const objectId = new ObjectId($objectId);
            assert.deepStrictEqual(res, {
                test: 42,
                topLevelObjectId: objectId,
                subdoc: {
                    nestedObjectId: objectId
                },
                arr: [
                    objectId,
                    { objectId },
                    42
                ]
            });
        });

        it('throws error on invalid ObjectId string', () => {
            const $objectId = '0'.repeat(4);
            const obj = {
                test: 42,
                topLevelObjectId: { $objectId }
            };
            assert.throws(() => deserialize(obj), /Invalid \$objectId "0000"/);
        });
    });
});

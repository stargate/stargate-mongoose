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
import { serialize } from '../src/serialize';
import { Types } from 'mongoose';

describe('serialize', () => {
    it('serializes sets', () => {
        const result = serialize({ set: new Set([new Types.ObjectId('0'.repeat(24))]) });
        assert.deepStrictEqual(result, { set: new Set(['0'.repeat(24)]) });
    });
});

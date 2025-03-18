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

import { Schema, Document } from 'mongoose';

export class Vectorize extends Schema.Types.Array {
    constructor(key: string) {
        super(key, { type: 'Number' });
        this.instance = 'Vectorize';
    }

    cast(val: unknown, doc: Document, init: boolean, prev: unknown, options: unknown) {
        if (!init && typeof val === 'string') {
            return val;
        }
        return super.cast(val, doc, init, prev, options);
    }
}

// @ts-expect-error needs override because Mongoose hard-codes `schemaName` type
Vectorize.schemaName = 'Vectorize';

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

interface VectorizeOptions {
  service: {
    provider: string;
    modelName: string;
    authentication?: Record<string, unknown>;
    parameters?: Record<string, unknown>;
  },
  dimension: number;
}

export class Vectorize extends Schema.Types.Array {
    constructor(key: string, options: VectorizeOptions) {
        super(key, { type: 'Number' });
        this.options = options;
        this.instance = 'Vectorize';
        if (typeof options?.service?.provider !== 'string') {
            throw new Error('`provider` option for vectorize paths must be a string, got: ' + options?.service?.provider);
        }
    }

    cast(val: unknown, doc: Document, init: boolean, prev: unknown, options: unknown) {
        if (!init && typeof val === 'string') {
            return val;
        }
        return super.cast(val, doc, init, prev, options);
    }

    // Overwritten to account for Mongoose SchemaArray constructor taking different arguments than Vectorize
    clone(): Vectorize {
        const options = Object.assign({}, this.options) as VectorizeOptions;
        const schematype = new Vectorize(this.path, options);
        schematype.validators = this.validators.slice();
        // @ts-expect-error Mongoose doesn't expose the type of `requiredValidator`
        if (this.requiredValidator !== undefined) {
            // @ts-expect-error Mongoose doesn't expose the type of `requiredValidator`
            schematype.requiredValidator = this.requiredValidator;
        }
        return schematype;
    }
}

// @ts-expect-error needs override because Mongoose hard-codes `schemaName` type
Vectorize.schemaName = 'Vectorize';

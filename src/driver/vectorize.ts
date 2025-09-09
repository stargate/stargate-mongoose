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

import { Schema, Document, SchemaTypeOptions } from 'mongoose';
import { AstraMongooseError } from '../astraMongooseError';
import { VectorizeServiceOptions } from '@datastax/astra-db-ts';

export interface VectorizeOptions extends SchemaTypeOptions<number[]> {
  service: VectorizeServiceOptions,
  dimension: number;
}

/**
 * Vectorize is a custom Mongoose SchemaType that allows you set a vector value to a string
 * for tables mode vectorize API. A Vectorize path is an array of numbers that can also be set to a string.
 */

export class Vectorize extends Schema.Types.Array {
    /**
     * Create a new instance of the Vectorize SchemaType. You may need to instantiate this type to add to your Mongoose
     * schema using `Schema.prototype.path()` for better TypeScript support.
     * @param key the path to this vectorize field in your schema
     * @param options vectorize options that define how to interact with the vectorize service, including the dimension
     */
    constructor(key: string, options: VectorizeOptions) {
        super(key, { type: 'Number' });
        this.options = options;
        if (typeof options?.dimension === 'number' && options.dimension <= 0) {
            throw new AstraMongooseError('`dimension` option for vectorize paths must be a positive integer, got: ' + options?.dimension, {
                options
            });
        }
        this.instance = 'Vectorize';
        if (options?.index) {
            this.index.call(this, options.index);
        }
        if (typeof options?.service?.provider !== 'string') {
            throw new AstraMongooseError('`provider` option for vectorize paths must be a string, got: ' + options?.service?.provider, {
                options
            });
        }
    }

    /**
     * Cast a given value to the appropriate type. Defers to the default casting behavior for Mongoose number arrays, with
     * the one exception being strings.
     */
    cast(val: unknown, doc: Document, init: boolean, prev: unknown, options: unknown) {
        if (!init && typeof val === 'string') {
            return val;
        }
        return super.cast(val, doc, init, prev, options);
    }

    /**
     * Overwritten to account for Mongoose SchemaArray constructor taking different arguments than Vectorize
     */
    clone(): Vectorize {
        const options = { ...this.options } as VectorizeOptions;
        if (options?.service) {
            options.service = { ...options.service };
        }
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

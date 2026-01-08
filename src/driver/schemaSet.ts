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

import { Schema, SchemaType, SchemaTypeOptions, Document } from 'mongoose';
import { AstraMongooseError } from '../astraMongooseError';

import { MongooseSet } from './mongooseSet';

export interface SetOptions<T = unknown> extends SchemaTypeOptions<T> {
  of: SchemaTypeOptions<T>;
}

/**
 * SchemaSet is a custom Mongoose SchemaType that allows you to use Cassandra sets in tables mode.
 * A Set path translates to `type: 'set'` in the Data API.
 */
export class SchemaSet extends SchemaType {
    $embeddedSchemaType: SchemaType;

    /**
     * Create a new instance of the Set SchemaType.
     * @param key the path to this set field in your schema
     * @param options set options that define the type of values in the set
     */
    constructor(key: string, options: SetOptions) {
        super(key, options);

        if (!options.of) {
            throw new AstraMongooseError('`of` option is required for Set paths', { options });
        }

        this.instance = 'Set';
        const ofType = options.of;
        const SchemaTypes = Schema.Types as Record<string, typeof SchemaType>;

        // Only support primitive types for sets for now: don't support schemas here
        let TypeConstructor: typeof SchemaType | null = null;
        let embeddedSchemaType: SchemaType | null = null;
        const typeValue = ofType.type;
        if (typeof typeValue === 'function' && 'name' in typeValue && typeof typeValue.name === 'string' && typeValue.name in SchemaTypes) {
            TypeConstructor = SchemaTypes[typeValue.name];
            embeddedSchemaType = new TypeConstructor(key, ofType);
        } else if (typeof typeValue === 'string' && typeValue in SchemaTypes) {
            TypeConstructor = SchemaTypes[typeValue];
            embeddedSchemaType = new TypeConstructor(key, ofType);
        } else if (typeValue instanceof Schema && typeValue.options.udtName) {
            TypeConstructor = SchemaTypes.Subdocument;
            // @ts-expect-error Subdocument schematype constructor has different arguments
            embeddedSchemaType = new TypeConstructor(typeValue, key, ofType);
        }

        if (!embeddedSchemaType) {
            throw new AstraMongooseError('`of` option for Set must be a supported primitive type or UDT', { options });
        }
        this.$embeddedSchemaType = embeddedSchemaType;
    }

    /**
     * Get the embedded schema type for values in this set
     */
    getEmbeddedSchemaType(): SchemaType {
        return this.$embeddedSchemaType;
    }

    /**
     * Cast a given value to a MongooseSet with proper change tracking
     */
    cast(val: unknown, doc?: Document): MongooseSet {
        let mongooseSet: MongooseSet;

        if (val instanceof MongooseSet) {
            mongooseSet = val;
        } else if (val instanceof globalThis.Set) {
            mongooseSet = new MongooseSet(
                Array.from(val).map(v => this.getEmbeddedSchemaType().cast(v)),
                this.path,
                doc,
                this
            );
        } else if (Array.isArray(val)) {
            mongooseSet = new MongooseSet(
                val.map(v => this.getEmbeddedSchemaType().cast(v)),
                this.path,
                doc,
                this
            );
        } else {
            mongooseSet = new MongooseSet(
                [this.getEmbeddedSchemaType().cast(val)],
                this.path,
                doc,
                this
            );
        }

        return mongooseSet;
    }

    /**
     * Mongoose calls this function to cast when the value is nullish
     */
    _castNullish(val: null | undefined) {
        throw new AstraMongooseError(`Cannot cast value to Set: ${val}`, { val });
    }

    /**
     * Required for Mongoose to properly handle this schema type
     */
    castForQuery($conditional: string, val: unknown) {
        // Workaround for $push etc. because Data API expects them as a single
        // element not an array.
        if (!Array.isArray(val) && !$conditional) {
            return Array.from(this.cast([val]))[0];
        }
        return this.cast(val);
    }
}

// @ts-expect-error needs override because Mongoose hard-codes `schemaName` type
SchemaSet.schemaName = 'Set';

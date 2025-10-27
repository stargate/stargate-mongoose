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

export interface SetOptions<T = unknown> extends SchemaTypeOptions<T> {
  of: SchemaTypeOptions<T>;
}

/**
 * MongooseSet is a Mongoose-specific wrapper around vanilla JavaScript sets
 * that represents a Cassandra set. It wraps a JavaScript Set and integrates with
 * Mongoose change tracking.
 * Any add or delete operation triggers a full overwrite of the set value.
 */
export class MongooseSet<T = unknown> extends globalThis.Set<T> {
    private _parent?: Document;
    private _path?: string;

    constructor(values?: readonly T[] | null) {
        super(values);
    }

    /**
    * Internal method to mark the parent document as modified when the set changes
    */
    private _markModified(): void {
        if (this._parent && this._path) {
            this._parent.markModified(this._path);
        }
    }

    /**
    * Adds a value to the set and marks the parent document as modified
    */
    add(value: T): this {
        super.add(value);
        this._markModified();
        return this;
    }

    /**
    * Deletes a value from the set and marks the parent document as modified
    */
    delete(value: T): boolean {
        const result = super.delete(value);
        if (result) {
            this._markModified();
        }
        return result;
    }

    /**
    * Clears all values from the set and marks the parent document as modified
    */
    clear(): void {
        super.clear();
        this._markModified();
    }
}

/**
 * Set is a custom Mongoose SchemaType that allows you to use Cassandra sets in tables mode.
 * A Set path translates to `type: 'set'` in the Data API.
 */
export class Set extends SchemaType {
    $embeddedSchemaType?: SchemaType;

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
        const typeValue = ofType.type;
        if (typeof typeValue === 'function' && 'name' in typeValue && typeof typeValue.name === 'string' && typeValue.name in SchemaTypes) {
            TypeConstructor = SchemaTypes[typeValue.name];
        } else if (typeof typeValue === 'string' && typeValue in SchemaTypes) {
            TypeConstructor = SchemaTypes[typeValue];
        }

        if (!TypeConstructor) {
            throw new AstraMongooseError('`of` option for Set must be a supported primitive type', { options });
        }

        this.$embeddedSchemaType = new TypeConstructor(key, ofType);
    }

    /**
    * Get the embedded schema type for values in this set
    */
    getEmbeddedSchemaType(): SchemaType | undefined {
        return this.$embeddedSchemaType;
    }

    /**
    * Cast a given value to a MongooseSet with proper change tracking
    */
    cast(val: unknown, doc?: Document): MongooseSet | undefined {
        if (val == null) {
            return undefined;
        }

        let mongooseSet: MongooseSet;

        if (val instanceof MongooseSet) {
            mongooseSet = val;
        } else if (val instanceof globalThis.Set) {
            mongooseSet = new MongooseSet(Array.from(val));
        } else if (Array.isArray(val)) {
            mongooseSet = new MongooseSet(val);
        } else {
            throw new AstraMongooseError(`Cannot cast value to Set: ${val}`, { val });
        }

        // Attach parent document for change tracking
        if (doc && this.path) {
            (mongooseSet as any)._parent = doc;
            (mongooseSet as any)._path = this.path;
        }

        return mongooseSet;
    }

    /**
    * Required for Mongoose to properly handle this schema type
    */
    castForQuery($conditional: string, val: any): any {
        if (val == null) {
            return val;
        }
        return this.cast(val);
    }
}

// @ts-expect-error needs override because Mongoose hard-codes `schemaName` type
Set.schemaName = 'Set';

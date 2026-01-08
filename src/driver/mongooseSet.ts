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

import { Document, SchemaType } from 'mongoose';
import { serialize } from '../serialize';
import util from 'util';

/**
 * MongooseSet is a Mongoose-specific wrapper around vanilla JavaScript sets
 * that represents a Cassandra set. It wraps a JavaScript Set and integrates with
 * Mongoose change tracking.
 * Takes 2 generic types: RawType and HydratedType. The RawType is the type of the value
 * stored in the database, while the HydratedType is the type of the value when it is
 * retrieved from the database - these are the same type for primitive types, but
 * are different for Mongoose subdocuments.
 * Add and delete operations use atomic updates (`$push`, `$pullAll`) when possible,
 * and only fall back to a full overwrite (`$set`) when there is a mixed sequence of operations.
 */
export class MongooseSet<RawType = unknown, HydratedType = RawType> extends globalThis.Set<HydratedType> {
    private _parent: Document | undefined;
    private _path: string;
    // The SchemaType instance this set is associated with.
    private _schemaType: SchemaType;
    // Atomics store the update that will be applied to the database. Stores the raw (serialized)
    // values that will be saved.
    private _atomic: ['$push', { $each: RawType[] }] | ['$set' | '$pullAll', RawType[]] | null = null;

    constructor(values: (Partial<RawType> | HydratedType)[] | null, path: string, parent: Document | undefined, schemaType: SchemaType) {
        super();
        if (values) {
            for (const value of values) {
                globalThis.Set.prototype.add.call(this, value);
            }
        }
        this._path = path;
        this._parent = parent;
        this._schemaType = schemaType;
    }

    /**
     * Get atomics for Mongoose change tracking. Keep in mind Data API does not
     * support multiple operations on the same set in the same operation, so we
     * only support one atomic at a time.
     */
    getAtomics() {
        return [this._atomic];
    }

    /**
     * Clear atomics for Mongoose change tracking. Called by Mongoose after the
     * document is successfully saved.
     */
    clearAtomics() {
        this._atomic = null;
    }

    /**
     * Custom inspect output so Node.js inspect() is not polluted by internal state.
     *
     * @returns Set
     */
    [util.inspect.custom]() {
        return new globalThis.Set(Array.from(this));
    }

    /**
     * Internal method to mark the parent document as modified when the set changes
     */
    private _markModified(): void {
        this._parent?.markModified(this._path);
    }

    /**
     * Adds a value to the set and marks the parent document as modified
     */
    add(value: (Partial<RawType> | HydratedType)): this {
        let hadValue: boolean = false;
        value = this._schemaType.getEmbeddedSchemaType()!.cast(value) as HydratedType;
        if (value != null && typeof value === 'object') {
            // If object, we should do a deep equality check to find it
            hadValue = !!this._findValue(value);
            if (!hadValue) {
                super.add(value);
            }
        } else {
            hadValue = this.has(value);
            super.add(value);
        }
        if (!hadValue) {
            this._markModified();
            const atomicValue = this._valueToBSON(value);
            if (this._atomic == null) {
                this._atomic = ['$push', { $each: [atomicValue] }];
            } else if (this._atomic[0] === '$push') {
                this._atomic[1].$each.push(atomicValue);
            } else {
                this._atomic = ['$set', this.toBSON()];
            }
        }
        return this;
    }

    /**
     * Converts the set into what will be sent on the wire
     */
    toBSON() {
        return Array.from(this).map(v => this._valueToBSON(v));
    }

    /**
     * Deletes a value from the set and marks the parent document as modified
     */
    delete(value: (Partial<RawType> | HydratedType)): boolean {
        let result: boolean = false;
        value = this._schemaType.getEmbeddedSchemaType()!.cast(value) as HydratedType;
        if (value != null && typeof value === 'object') {
            // If object, we should do a deep equality check to find it
            const matchingValue = this._findValue(value);
            if (matchingValue) {
                result = super.delete(matchingValue);
            }
        } else {
            result = super.delete(value);
        }
        if (result) {
            this._markModified();
            const atomicValue = this._valueToBSON(value);
            if (this._atomic == null) {
                this._atomic = ['$pullAll', [atomicValue]];
            } else if (this._atomic[0] === '$pullAll') {
                this._atomic[1].push(atomicValue);
            } else {
                this._atomic = ['$set', this.toBSON()];
            }
        }
        return result;
    }

    /**
     * Clears all values from the set and marks the parent document as modified
     */
    clear(): void {
        super.clear();
        this._markModified();
        this._atomic = ['$set', this.toBSON()];
    }

    /*!
     * Converts a value to the raw type
     */
    private _valueToBSON(v: HydratedType): RawType {
        if (v != null && typeof v === 'object') {
            // @ts-expect-error coerce return type
            return serialize(v);
        }
        // @ts-expect-error coerce return type
        return v;
    }

    /*!
     * Finds whether `val` is in the set, using deep equality check on raw values.
     */
    private _findValue(value: HydratedType): HydratedType | undefined {
        const rawValues = Array.from(this);
        const bsonValue = this._valueToBSON(value);
        const matchingValue = rawValues.find(
            v => util.isDeepStrictEqual(this._valueToBSON(v), bsonValue)
        );
        return matchingValue;
    }
}

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

import { Document } from 'mongoose';
import { inspect } from 'util';

/**
 * MongooseSet is a Mongoose-specific wrapper around vanilla JavaScript sets
 * that represents a Cassandra set. It wraps a JavaScript Set and integrates with
 * Mongoose change tracking.
 * Add and delete operations use atomic updates (`$push`, `$pullAll`) when possible,
 * and only fall back to a full overwrite (`$set`) when there is a mixed sequence of operations.
 */
export class MongooseSet<T = unknown> extends globalThis.Set<T> {
    private _parent?: Document;
    private _path: string;
    private _atomic: ['$push', { $each: T[] }] | ['$set' | '$pullAll', T[]] | null = null;

    constructor(values: T[] | null, path: string, parent?: Document) {
        super();
        if (values) {
            for (const value of values) {
                globalThis.Set.prototype.add.call(this, value);
            }
        }
        this._path = path;
        this._parent = parent;
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
    [inspect.custom]() {
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
    add(value: T): this {
        const hadValue = this.has(value);
        super.add(value);
        if (!hadValue) {
            this._markModified();
            if (this._atomic == null) {
                this._atomic = ['$push', { $each: [value] }];
            } else if (this._atomic[0] === '$push') {
                this._atomic[1].$each.push(value);
            } else {
                this._atomic = ['$set', Array.from(this)];
            }
        }
        return this;
    }

    /**
     * Deletes a value from the set and marks the parent document as modified
     */
    delete(value: T): boolean {
        const result = super.delete(value);
        if (result) {
            this._markModified();
            if (this._atomic == null) {
                this._atomic = ['$pullAll', [value]];
            } else if (this._atomic[0] === '$pullAll') {
                this._atomic[1].push(value);
            } else {
                this._atomic = ['$set', Array.from(this)];
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
        this._atomic = ['$set', Array.from(this)];
    }
}

"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.Vectorize = void 0;
const mongoose_1 = require("mongoose");
const stargateMongooseError_1 = require("src/stargateMongooseError");
/**
 * Vectorize is a custom Mongoose SchemaType that allows you set a vector value to a string
 * for tables mode vectorize API. A Vectorize path is an array of numbers that can also be set to a string.
 */
class Vectorize extends mongoose_1.Schema.Types.Array {
    /**
     * Create a new instance of the Vectorize SchemaType. You may need to instantiate this type to add to your Mongoose
     * schema using `Schema.prototype.path()` for better TypeScript support.
     * @param key the path to this vectorize field in your schema
     * @param options vectorize options that define how to interact with the vectorize service, including the dimension
     */
    constructor(key, options) {
        super(key, { type: 'Number' });
        this.options = options;
        this.instance = 'Vectorize';
        if (typeof options?.service?.provider !== 'string') {
            throw new stargateMongooseError_1.StargateMongooseError('`provider` option for vectorize paths must be a string, got: ' + options?.service?.provider, {
                options
            });
        }
    }
    /**
     * Cast a given value to the appropriate type. Defers to the default casting behavior for Mongoose number arrays, with
     * the one exception being strings.
     */
    cast(val, doc, init, prev, options) {
        if (!init && typeof val === 'string') {
            return val;
        }
        return super.cast(val, doc, init, prev, options);
    }
    /**
     * Overwritten to account for Mongoose SchemaArray constructor taking different arguments than Vectorize
     */
    clone() {
        const options = Object.assign({}, this.options);
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
exports.Vectorize = Vectorize;
// @ts-expect-error needs override because Mongoose hard-codes `schemaName` type
Vectorize.schemaName = 'Vectorize';
//# sourceMappingURL=vectorize.js.map
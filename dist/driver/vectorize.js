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
class Vectorize extends mongoose_1.Schema.Types.Array {
    constructor(key, options) {
        super(key, { type: 'Number' });
        this.options = options;
        this.instance = 'Vectorize';
        if (typeof options?.service?.provider !== 'string') {
            throw new Error('`provider` option for vectorize paths must be a string, got: ' + options?.service?.provider);
        }
    }
    cast(val, doc, init, prev, options) {
        if (!init && typeof val === 'string') {
            return val;
        }
        return super.cast(val, doc, init, prev, options);
    }
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
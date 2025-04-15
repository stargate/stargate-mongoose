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
exports.default = deserializeDoc;
const astra_db_ts_1 = require("@datastax/astra-db-ts");
/**
 * Transforms astra-db-ts document results into something Mongoose can deserialize:
 *
 * 1. DataAPIVector -> array
 * 2. Map -> POJO since Mongoose doesn't expect maps from the underlying driver
 *
 * @param doc
 * @returns void
 * @ignore
 */
function deserializeDoc(doc) {
    if (doc == null) {
        return doc;
    }
    for (const [key, value] of Object.entries(doc)) {
        if (value instanceof astra_db_ts_1.DataAPIVector) {
            doc[key] = value.asArray();
        }
        if (value instanceof astra_db_ts_1.DataAPIBlob) {
            doc[key] = value.asBuffer();
        }
        if (value instanceof Map) {
            doc[key] = Object.fromEntries([...value.entries()]);
        }
    }
    const $vector = doc.$vector;
    if ($vector instanceof Object && typeof $vector.$binary === 'string') {
        doc.$vector = new astra_db_ts_1.DataAPIVector(doc.$vector).asArray();
    }
    return doc;
}
//# sourceMappingURL=deserializeDoc.js.map
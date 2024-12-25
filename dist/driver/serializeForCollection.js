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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.serializeForCollection = serializeForCollection;
const bson_1 = require("bson");
const mongoose_1 = __importDefault(require("mongoose"));
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function serializeForCollection(data) {
    return data != null
        ? serializeValue(data)
        : data;
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function serializeValue(data) {
    if (data == null) {
        return data;
    }
    if (typeof data === 'bigint') {
        return data.toString();
    }
    if (typeof data === 'string' || typeof data === 'number' || typeof data === 'boolean') {
        return data;
    }
    // Mongoose relies on certain values getting transformed into their BSON equivalents,
    // most notably subdocuments and document arrays. Otherwise `$push` on a document array fails.
    if (typeof data.toBSON === 'function') {
        data = data.toBSON();
    }
    if (data instanceof bson_1.ObjectId) {
        return data.toHexString();
    }
    else if (data instanceof BigInt) {
        return data.toString();
    }
    else if (data instanceof mongoose_1.default.Types.Decimal128) {
        //Decimal128 handling
        return Number(data.toString());
    }
    else if (data instanceof Map) {
        return Object.fromEntries(data.entries());
    }
    else if (data instanceof bson_1.Binary) {
        if (data.sub_type === 3 || data.sub_type === 4) {
            // UUIDs
            return data.toString('hex').replace(/(.{8})(.{4})(.{4})(.{4})(.{12})/, '$1-$2-$3-$4-$5');
        }
        return data.toString('hex');
    }
    else if (data instanceof bson_1.UUID) {
        return data.toString();
    }
    else if (Array.isArray(data)) {
        return data.map(el => serializeValue(el));
    }
    else if (data._bsontype == null) {
        for (const key of Object.keys(data)) {
            if (data[key] == null) {
                continue;
            }
            else {
                data[key] = serializeValue(data[key]);
            }
        }
        return data;
    }
    return data;
}
//# sourceMappingURL=serializeForCollection.js.map
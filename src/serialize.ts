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

import { DataAPITimestamp } from '@datastax/astra-db-ts';
import { Binary, ObjectId } from 'bson';
import mongoose from 'mongoose';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function serialize(data: Record<string, any>, useTables?: boolean): Record<string, any> {
    return data != null
        ? serializeValue(data, useTables)
        : data;
}

// Mongoose relies on certain values getting transformed into their BSON equivalents,
// most notably subdocuments and document arrays. Otherwise `$push` on a document array fails.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function serializeValue(data: any, useTables?: boolean): any {
    if (data == null) {
        return data;
    }
    if (typeof data === 'bigint') {
        return data.toString();
    }
    if (typeof data === 'string' || typeof data === 'number' || typeof data === 'boolean') {
        return data;
    }
    if (typeof data.toBSON === 'function') {
        data = data.toBSON();
    }

    if (useTables && data instanceof Date) {
        return new DataAPITimestamp(data);
    }

    if (data instanceof ObjectId) {
        return data.toHexString();
    } else if (data instanceof mongoose.Types.Decimal128) {
        //Decimal128 handling
        return Number(data.toString());
    } else if (data instanceof Map) {
        return Object.fromEntries(data.entries());
    } else if (data instanceof Binary) {
        if (data.sub_type === 3 || data.sub_type === 4) {
            // UUIDs, no need for explicit `instanceof UUID` check because bson UUID extends Binary
            return data.toString('hex').replace(/(.{8})(.{4})(.{4})(.{4})(.{12})/, '$1-$2-$3-$4-$5');
        }
        return data.toString('hex');
    } else if (Array.isArray(data)) {
        return data.map(el => serializeValue(el, useTables));
    } else if (data._bsontype == null) {
        for (const key of Object.keys(data)) {
            data[key] = serializeValue(data[key], useTables);
        }
        return data;
    }

    return data;
}

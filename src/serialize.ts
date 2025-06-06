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

import { Binary, Double, ObjectId } from 'bson';
import mongoose from 'mongoose';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function serialize(data: Record<string, any>, isTable?: boolean): Record<string, any> {
    return serializeValue(data, isTable);
}

/**
 * Mongoose relies on certain values getting transformed into their BSON equivalents,
 * most notably subdocuments and document arrays. Otherwise `$push` on a document array fails.
 * @ignore
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function serializeValue(data: any, isTable?: boolean): any {
    if (data == null) {
        return data;
    }
    if (typeof data === 'bigint') {
        if (isTable) {
            return data;
        }
        return data.toString();
    }
    if (typeof data === 'string' || typeof data === 'number' || typeof data === 'boolean') {
        return data;
    }
    if (typeof data.toBSON === 'function') {
        data = data.toBSON();
    }

    if (data instanceof ObjectId) {
        return data.toHexString();
    } else if (data instanceof mongoose.Types.Decimal128) {
        //Decimal128 handling
        return Number(data.toString());
    } else if (data instanceof Double) {
        return Number(data.valueOf());
    } else if (data instanceof Date) {
        // Rely on astra driver to serialize dates
        return data;
    } else if (data instanceof Map && !isTable) {
        return Object.fromEntries(data.entries());
    } else if (data instanceof Binary) {
        if (data.sub_type === 3 || data.sub_type === 4) {
            // UUIDs, no need for explicit `instanceof UUID` check because bson UUID extends Binary
            return data.toString('hex').replace(/(.{8})(.{4})(.{4})(.{4})(.{12})/, '$1-$2-$3-$4-$5');
        }
        // Tables support `$binary` for storing blobs, but collections do not.
        if (isTable) {
            return { $binary: data.toString('base64') };
        }
        // Store as JSON serialized buffer so Mongoose can deserialize properly.
        return { type: 'Buffer', data: [...data.buffer] };
    } else if (Array.isArray(data)) {
        return data.map(el => serializeValue(el, isTable));
    } else {
        for (const key of Object.keys(data)) {
            data[key] = serializeValue(data[key], isTable);
        }
        return data;
    }
}

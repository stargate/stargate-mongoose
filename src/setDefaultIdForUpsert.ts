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

import { CollectionUpdateFilter } from '@datastax/astra-db-ts';
import { Types } from 'mongoose';

export function setDefaultIdForReplace<DocType extends { _id?: unknown } = Record<string, unknown>>(
    filter: Record<string, unknown>,
    update: DocType,
    options: { upsert?: boolean }
) {
    if (!options.upsert) {
        return;
    }
    if ('_id' in filter) {
        return;
    }

    if ('_id' in update) {
        return;
    }
    update._id = new Types.ObjectId();
}

export function setDefaultIdForUpdate<DocType extends { _id?: unknown } = Record<string, unknown>>(
    filter: Record<string, unknown>,
    update: CollectionUpdateFilter<DocType>,
    options: { upsert?: boolean }
) {
    if (!options.upsert) {
        return;
    }
    if ('_id' in filter) {
        return;
    }

    if (_updateHasKey(update, '_id')) {
        return;
    }
    if (update.$setOnInsert == null) {
        update.$setOnInsert = {};
    }
    if (!('_id' in update.$setOnInsert)) {
        update.$setOnInsert._id = new Types.ObjectId();
    }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function _updateHasKey(update: Record<string, any>, key: string) {
    for (const operator of Object.keys(update)) {
        if (update[operator] != null && typeof update[operator] === 'object' && key in update[operator]) {
            return true;
        }
    }
    return false;
}

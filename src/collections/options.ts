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

export type SortOption = Record<string, 1 | -1> | { $vector: { $meta: Array<number> } } | { $vector: Array<number> };

export type ProjectionOption = Record<string, 1 | 0 | true | false | { $slice: number }>;

/**
 * deleteOneOptions
 */
export interface DeleteOneOptions {
    sort?: Record<string, 1 | -1>;
}

/**
 * findOptions
 */
export interface FindOptions {
    limit?: number;
    skip?: number;
    sort?: SortOption;
    projection?: ProjectionOption;
}

class _FindOptionsInternal {
    limit?: number = undefined;
    skip?: number = undefined;
    pagingState?: string = undefined;
}

export interface FindOptionsInternal extends _FindOptionsInternal {}

export const findInternalOptionsKeys: Set<string> = new Set(
  Object.keys(new _FindOptionsInternal)
);

/**
 * findOneOptions
 */
export interface FindOneOptions {
    sort?: Record<string, 1 | -1>;
}

/**
 * findOneAndDeleteOptions
 */
export interface FindOneAndDeleteOptions {
    sort?: SortOption;
}

/**
 * findOneAndReplaceOptions
 */

class _FindOneAndReplaceOptions {
    upsert?: boolean = undefined;
    returnDocument?: 'before' | 'after' = undefined;
    sort?: SortOption;
}

export interface FindOneAndReplaceOptions extends _FindOneAndReplaceOptions {}

export const findOneAndReplaceInternalOptionsKeys: Set<string> = new Set(
  Object.keys(new _FindOneAndReplaceOptions)
);

/**
 * findOneAndUpdateOptions
 */

class _FindOneAndUpdateOptions {
    upsert?: boolean = undefined;
    returnDocument?: 'before' | 'after' = undefined;
    sort?: SortOption;
}

export interface FindOneAndUpdateOptions extends _FindOneAndUpdateOptions {}

export const findOneAndUpdateInternalOptionsKeys: Set<string> = new Set(
  Object.keys(new _FindOneAndUpdateOptions)
);

/**
 * insertManyOptions
 */

class _InsertManyOptions {
    ordered?: boolean = undefined;
}

export interface InsertManyOptions extends _InsertManyOptions {}

export const insertManyInternalOptionsKeys: Set<string> = new Set(
  Object.keys(new _InsertManyOptions)
);

/**
 * updateManyOptions
 */

class _UpdateManyOptions {
    upsert?: boolean = undefined;
}

export interface UpdateManyOptions extends _UpdateManyOptions {}

export const updateManyInternalOptionsKeys: Set<string> = new Set(
  Object.keys(new _UpdateManyOptions)
);

/**
 * updateOneOptions
 */

class _UpdateOneOptions {
    upsert?: boolean = undefined;
    sort?: SortOption;
}

export interface UpdateOneOptions extends _UpdateOneOptions {}

export const updateOneInternalOptionsKeys: Set<string> = new Set(
  Object.keys(new _UpdateOneOptions)
);

/**
 * CreateCollectionOptions
 */

class _VectorOptions {
    size: number = 0;
    function?: 'cosine' | 'euclidean' | 'dot_product';
}

export class _CreateCollectionOptions {
    vector?: _VectorOptions = undefined;
}

export interface CreateCollectionOptions extends _CreateCollectionOptions {}

export const createCollectionOptionsKeys: Set<string> = new Set(
  Object.keys(new _CreateCollectionOptions)
);

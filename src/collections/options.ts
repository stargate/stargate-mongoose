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

export type SortOption = Record<string, 1 | -1 | { $meta: Array<number> } | { $meta: string }>;
export type SortOptionInternal = Record<string, 1 | -1 | Array<number> | string>;

export type ProjectionOption = Record<string, 1 | 0 | true | false | { $slice: number }>;

export interface DeleteOneOptions {
    sort?: SortOption;
}
export interface DeleteOneOptionsForDataAPI {
    sort?: SortOptionInternal;
}

export interface VectorOptions {
  dimension?: number;
  metric?: 'cosine' | 'euclidean' | 'dot_product';
}

export interface FindOptions {
    limit?: number;
    skip?: number;
    sort?: SortOption;
    projection?: ProjectionOption;
    includeSimilarity?: boolean;
    includeSortVector?: boolean;
}
export type FindOptionsForDataAPI = Omit<FindOptions, 'sort'> & { sort?: SortOptionInternal };

class _FindOptionsInternal {
    limit?: number = undefined;
    skip?: number = undefined;
    pagingState?: string = undefined;
    includeSimilarity?: boolean = undefined;
    includeSortVector?: boolean = undefined;
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface FindOptionsInternal extends _FindOptionsInternal {}

export const findInternalOptionsKeys: Set<string> = new Set(
    Object.keys(new _FindOptionsInternal)
);

export interface FindOneOptions {
    sort?: Record<string, 1 | -1>;
    projection?: ProjectionOption;
    includeSimilarity?: boolean;
    includeSortVector?: boolean;
}
export type FindOneOptionsForDataAPI = Omit<FindOneOptions, 'sort'> & { sort?: SortOptionInternal };

class _FindOneOptionsInternal {
    includeSimilarity?: boolean = undefined;
    includeSortVector?: boolean = undefined;
}

export const findOneInternalOptionsKeys: Set<string> = new Set(
    Object.keys(new _FindOneOptionsInternal)
);

export interface FindOneAndDeleteOptions {
    sort?: SortOption;
    projection?: ProjectionOption;
    includeResultMetadata?: boolean;
}
export type FindOneAndDeleteOptionsForDataAPI = Omit<FindOneAndDeleteOptions, 'sort'> & { sort?: SortOptionInternal };


class _FindOneAndReplaceOptions {
    upsert?: boolean = undefined;
    returnDocument?: 'before' | 'after' = undefined;
    sort?: SortOption;
    projection?: ProjectionOption;
    includeResultMetadata?: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface FindOneAndReplaceOptions extends _FindOneAndReplaceOptions {}
export type FindOneAndReplaceOptionsForDataAPI = Omit<FindOneAndReplaceOptions, 'sort'> & { sort?: SortOptionInternal };

export const findOneAndReplaceInternalOptionsKeys: Set<string> = new Set(
    Object.keys(new _FindOneAndReplaceOptions)
);

class _FindOneAndUpdateOptions {
    upsert?: boolean = undefined;
    returnDocument?: 'before' | 'after' = undefined;
    sort?: SortOption;
    projection?: ProjectionOption;
    includeResultMetadata?: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface FindOneAndUpdateOptions extends _FindOneAndUpdateOptions {}
export type FindOneAndUpdateOptionsForDataAPI = Omit<FindOneAndUpdateOptions, 'sort'> & { sort?: SortOptionInternal };

export const findOneAndUpdateInternalOptionsKeys: Set<string> = new Set(
    Object.keys(new _FindOneAndUpdateOptions)
);

class _InsertManyOptions {
    ordered?: boolean = undefined;
    usePagination?: boolean = undefined;
    returnDocumentResponses?: boolean = undefined;
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface InsertManyOptions extends _InsertManyOptions {}

export const insertManyInternalOptionsKeys: Set<string> = new Set(
    Object.keys(new _InsertManyOptions)
);

class _UpdateManyOptions {
    upsert?: boolean = undefined;
    usePagination?: boolean = undefined;
    pageState?: string = undefined;
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface UpdateManyOptions extends _UpdateManyOptions {}

// `usePagination` is supported as user-specified option, but not passed to Data API
export const updateManyInternalOptionsKeys: Set<string> = new Set(
    Object.keys(new _UpdateManyOptions).filter(key => key !== 'usePagination')
);

class _UpdateOneOptions {
    upsert?: boolean = undefined;
    sort?: SortOption;
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface UpdateOneOptions extends _UpdateOneOptions {}
export type UpdateOneOptionsForDataAPI = Omit<UpdateOneOptions, 'sort'> & { sort?: SortOptionInternal };

export const updateOneInternalOptionsKeys: Set<string> = new Set(
    Object.keys(new _UpdateOneOptions)
);

class _ReplaceOneOptions {
    upsert?: boolean = undefined;
    sort?: SortOption;
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface ReplaceOneOptions extends _ReplaceOneOptions {}
export type ReplaceOneOptionsForDataAPI = Omit<UpdateOneOptions, 'sort'> & { sort?: SortOptionInternal };

export const ReplaceOneInternalOptionsKeys: Set<string> = new Set(
    Object.keys(new _ReplaceOneOptions)
);

export type IndexingOptions = { deny: string[], allow?: never } | { allow: string[], deny?: never };

export interface DefaultIdOptions { type: 'objectId' | 'uuid' | 'uuid6' | 'uuid7' }

class _CreateCollectionOptions {
    vector?: VectorOptions = undefined;
    indexing?: IndexingOptions = undefined;
    defaultId?: DefaultIdOptions = undefined;
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface CreateCollectionOptions extends _CreateCollectionOptions {}

export const createCollectionOptionsKeys: Set<string> = new Set(
    Object.keys(new _CreateCollectionOptions)
);

class _ListCollectionOptions {
    explain?: boolean = undefined;
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface ListCollectionOptions extends _ListCollectionOptions {}

export const listCollectionOptionsKeys: Set<string> = new Set(
    Object.keys(new _ListCollectionOptions)
);

export const retainNoOptions: Set<string> = new Set();
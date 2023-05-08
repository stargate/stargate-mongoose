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
    sort?: Record<string, 1 | -1>;
    projection?: Record<string, 1 | -1>;
}

export interface FindOptionsInternal {
    limit?: number;
    skip?: number;
    pagingState?: string;
}

export const findInternalOptionsKeys: Set<keyof FindOptionsInternal> = new Set(['limit' as const, 'skip' as const, 'pagingState' as const]);

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
    sort?: Record<string, 1 | -1>;
}

/**
 * findOneAndReplaceOptions
 */
export interface FindOneAndReplaceOptions {
    upsert?: boolean;
    returnDocument?: 'before' | 'after';
    sort?: Record<string, 1 | -1>;
}

export const findOneAndReplaceInternalOptionsKeys: Set<keyof Omit<FindOneAndReplaceOptions, 'sort'>> = new Set(['upsert' as const, 'returnDocument' as const]);

/**
 * findOneAndUpdateOptions
 */
export interface FindOneAndUpdateOptions {
    upsert?: boolean;
    returnDocument?: 'before' | 'after';
    sort?: Record<string, 1 | -1>;
}

export const findOneAndUpdateInternalOptionsKeys: Set<keyof Omit<FindOneAndUpdateOptions, 'sort'>> = new Set(['upsert' as const, 'returnDocument' as const]);

/**
 * insertManyOptions
 */
export interface InsertManyOptions {
    ordered?: boolean;
}

export const insertManyInternalOptionsKeys: Set<keyof InsertManyOptions> = new Set(['ordered' as const]);

/**
 * updateManyOptions
 */
export interface UpdateManyOptions {
    upsert?: boolean;
}

export const updateManyInternalOptionsKeys: Set<keyof UpdateManyOptions> = new Set(['upsert' as const]);

/**
 * updateOneOptions
 */
export interface UpdateOneOptions {
    upsert?: boolean;
    sort?: Record<string, 1 | -1>;
}

export const updateOneInternalOptionsKeys: Set<keyof Omit<UpdateOneOptions, 'sort'>> = new Set(['upsert' as const]);


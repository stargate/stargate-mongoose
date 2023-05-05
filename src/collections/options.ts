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

export const deleteOneInternalOptionsKeys: Set<string> | null = null;

/**
 * findOptions
 */
export interface FindOptions {
    limit?: number;
    skip?: number;
    sort?: Record<string, 1 | -1>;
    projection?: Record<string, 1 | -1>;
}

class FindOptionsInternalClass {
    limit?: number;
    skip?: number;
    pagingState?: string;
    constructor(limit?: number, skip?: number, pagingState?: string) {
        this.limit = limit;
        this.skip = skip;
        this.pagingState = pagingState;
    }
}

export interface FindOptionsInternal extends FindOptionsInternalClass {
};
export const findInternalOptionsKeys: Set<string> = new Set<string>(Object.keys(new FindOptionsInternalClass(-1, -1, "pagestate")) as Array<keyof FindOptionsInternal>);

/**
 * findOneOptions
 */
export interface FindOneOptions {
    sort?: Record<string, 1 | -1>;
}

export const findOneInternalOptionsKeys: Set<string> | null = null;

/**
 * findOneAndDeleteOptions
 */
export interface FindOneAndDeleteOptions {
    sort?: Record<string, 1 | -1>;
}

export const findOneAndDeleteInternalOptionsKeys: Set<string> | null = null;

/**
 * findOneAndReplaceOptions
 */
export interface FindOneAndReplaceOptions {
    upsert?: boolean;
    returnDocument?: 'before' | 'after';
    sort?: Record<string, 1 | -1>;
}

class FindOneAndReplaceInternalOptionsClass {
    constructor(
        readonly upsert?: boolean,
        readonly returnDocument?: 'before' | 'after',
    ) {
    }
}

export interface FindOneAndReplaceInternalOptions extends FindOneAndReplaceInternalOptionsClass {
};
export const findOneAndReplaceInternalOptionsKeys: Set<string> = new Set<string>(Object.keys(new FindOneAndReplaceInternalOptionsClass()) as Array<keyof FindOneAndReplaceInternalOptions>);

/**
 * findOneAndUpdateOptions
 */
export interface FindOneAndUpdateOptions {
    upsert?: boolean;
    returnDocument?: 'before' | 'after';
    sort?: Record<string, 1 | -1>;
}

class FindOneAndUpdateInternalOptionsClass {
    constructor(
        readonly upsert?: boolean,
        readonly returnDocument?: 'before' | 'after'
    ) {
    }
}

export interface FindOneAndUpdateInternalOptions extends FindOneAndUpdateInternalOptionsClass {
};
export const findOneAndUpdateInternalOptionsKeys: Set<string> = new Set<string>(Object.keys(new FindOneAndUpdateInternalOptionsClass()) as Array<keyof FindOneAndUpdateInternalOptions>);

/**
 * insertManyOptions
 */
export interface InsertManyOptions {
    ordered?: boolean;
}

class InsertManyInternalOptionsClass {
    constructor(
        readonly ordered?: boolean
    ) {
    }
}

export interface InsertManyInternalOptions extends InsertManyInternalOptionsClass {
};
export const insertManyInternalOptionsKeys: Set<string> = new Set<string>(Object.keys(new InsertManyInternalOptionsClass()) as Array<keyof InsertManyInternalOptions>);

/**
 * updateManyOptions
 */
export interface UpdateManyOptions {
    upsert?: boolean;
}
class UpdateManyInternalOptionsClass {
    constructor(
        readonly upsert?: boolean
    ) {
    }
}
export interface UpdateManyInternalOptions extends UpdateManyInternalOptionsClass {};
export const updateManyInternalOptionsKeys: Set<string> = new Set<string>(Object.keys(new UpdateManyInternalOptionsClass()) as Array<keyof UpdateManyInternalOptions>);

/**
 * updateOneOptions
 */
export interface UpdateOneOptions {
    upsert?: boolean;
    returnDocument?: 'before' | 'after';
    sort?: Record<string, 1 | -1>;
}
class UpdateOneInternalOptionsClass {
    constructor(
        readonly upsert?: boolean,
        readonly returnDocument?: 'before' | 'after'
    ) {
    }
}
export interface UpdateOneInternalOptions extends UpdateOneInternalOptionsClass {};
export const updateOneInternalOptionsKeys: Set<string> = new Set<string>(Object.keys(new UpdateOneInternalOptionsClass()) as Array<keyof UpdateOneInternalOptions>);


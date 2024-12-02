export type SortOption = Record<string, 1 | -1 | {
    $meta: Array<number>;
} | {
    $meta: string;
}>;
export type SortOptionInternal = Record<string, 1 | -1 | Array<number> | string>;
export type ProjectionOption = Record<string, 1 | 0 | true | false | {
    $slice: number;
}>;
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
export type FindOptionsForDataAPI = Omit<FindOptions, 'sort'> & {
    sort?: SortOptionInternal;
};
declare class _FindOptionsInternal {
    limit?: number;
    skip?: number;
    pagingState?: string;
    includeSimilarity?: boolean;
    includeSortVector?: boolean;
}
export interface FindOptionsInternal extends _FindOptionsInternal {
}
export declare const findInternalOptionsKeys: Set<string>;
export interface FindOneOptions {
    sort?: Record<string, 1 | -1>;
    projection?: ProjectionOption;
    includeSimilarity?: boolean;
    includeSortVector?: boolean;
}
export type FindOneOptionsForDataAPI = Omit<FindOneOptions, 'sort'> & {
    sort?: SortOptionInternal;
};
export declare const findOneInternalOptionsKeys: Set<string>;
export interface FindOneAndDeleteOptions {
    sort?: SortOption;
    projection?: ProjectionOption;
    includeResultMetadata?: boolean;
}
export type FindOneAndDeleteOptionsForDataAPI = Omit<FindOneAndDeleteOptions, 'sort'> & {
    sort?: SortOptionInternal;
};
declare class _FindOneAndReplaceOptions {
    upsert?: boolean;
    returnDocument?: 'before' | 'after';
    sort?: SortOption;
    projection?: ProjectionOption;
    includeResultMetadata?: boolean;
}
export interface FindOneAndReplaceOptions extends _FindOneAndReplaceOptions {
}
export type FindOneAndReplaceOptionsForDataAPI = Omit<FindOneAndReplaceOptions, 'sort'> & {
    sort?: SortOptionInternal;
};
export declare const findOneAndReplaceInternalOptionsKeys: Set<string>;
declare class _FindOneAndUpdateOptions {
    upsert?: boolean;
    returnDocument?: 'before' | 'after';
    sort?: SortOption;
    projection?: ProjectionOption;
    includeResultMetadata?: boolean;
}
export interface FindOneAndUpdateOptions extends _FindOneAndUpdateOptions {
}
export type FindOneAndUpdateOptionsForDataAPI = Omit<FindOneAndUpdateOptions, 'sort'> & {
    sort?: SortOptionInternal;
};
export declare const findOneAndUpdateInternalOptionsKeys: Set<string>;
declare class _InsertManyOptions {
    ordered?: boolean;
    usePagination?: boolean;
    returnDocumentResponses?: boolean;
}
export interface InsertManyOptions extends _InsertManyOptions {
}
export declare const insertManyInternalOptionsKeys: Set<string>;
declare class _UpdateManyOptions {
    upsert?: boolean;
    usePagination?: boolean;
    pageState?: string;
}
export interface UpdateManyOptions extends _UpdateManyOptions {
}
export declare const updateManyInternalOptionsKeys: Set<string>;
declare class _UpdateOneOptions {
    upsert?: boolean;
    sort?: SortOption;
}
export interface UpdateOneOptions extends _UpdateOneOptions {
}
export type UpdateOneOptionsForDataAPI = Omit<UpdateOneOptions, 'sort'> & {
    sort?: SortOptionInternal;
};
export declare const updateOneInternalOptionsKeys: Set<string>;
declare class _ReplaceOneOptions {
    upsert?: boolean;
    sort?: SortOption;
}
export interface ReplaceOneOptions extends _ReplaceOneOptions {
}
export type ReplaceOneOptionsForDataAPI = Omit<UpdateOneOptions, 'sort'> & {
    sort?: SortOptionInternal;
};
export declare const ReplaceOneInternalOptionsKeys: Set<string>;
export type IndexingOptions = {
    deny: string[];
    allow?: never;
} | {
    allow: string[];
    deny?: never;
};
export interface DefaultIdOptions {
    type: 'objectId' | 'uuid' | 'uuid6' | 'uuid7';
}
declare class _CreateCollectionOptions {
    vector?: VectorOptions;
    indexing?: IndexingOptions;
    defaultId?: DefaultIdOptions;
}
export interface CreateCollectionOptions extends _CreateCollectionOptions {
}
export declare const createCollectionOptionsKeys: Set<string>;
declare class _ListCollectionOptions {
    explain?: boolean;
}
export interface ListCollectionOptions extends _ListCollectionOptions {
}
export declare const listCollectionOptionsKeys: Set<string>;
export declare const retainNoOptions: Set<string>;
export {};

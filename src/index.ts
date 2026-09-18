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

import {
    CollectionFindAndRerankOptions,
    CollectionIndexingOptions,
    CollectionSerDesConfig,
    CollectionVectorOptions,
    RerankedResult,
    TableSerDesConfig,
    HttpOptions,
    CollectionLexicalOptions,
} from '@datastax/astra-db-ts';

import * as driver from './driver';
export { driver };

export { default as createAstraUri } from './createAstraUri';
export { default as tableDefinitionFromSchema } from './tableDefinitionFromSchema';
export { default as convertSchemaToColumns } from './convertSchemaToColumns';
export { default as udtDefinitionsFromSchema } from './udt/udtDefinitionsFromSchema';
export { default as convertSchemaToUDTColumns } from './udt/convertSchemaToUDTColumns';

import * as AstraMongooseDriver from './driver';
import type {
    AnyObject,
    GetLeanResultType,
    ModifyResult,
    Mongoose,
    QueryFilter,
    QueryOptions,
    QueryWithHelpers,
    UpdateQuery
} from 'mongoose';

export { Vectorize, VectorizeOptions } from './driver';

export { AstraMongooseError } from './astraMongooseError';
export { OperationNotSupportedError } from './operationNotSupportedError';

export type AstraMongoose = Omit<Mongoose, 'connection'> & { connection: AstraMongooseDriver.Connection };

interface WildcardProjection { '*': 1 }
type WildcardProjectionOptions<TRawDocType> = QueryOptions<TRawDocType> & { projection: WildcardProjection };
type WildcardModifyResult<TOptions, THydratedDocumentType, TLeanResultType> =
    TOptions extends { includeResultMetadata: true }
        ? ModifyResult<TOptions extends { lean: true } ? TLeanResultType : THydratedDocumentType>
        : (TOptions extends { lean: true } ? TLeanResultType : THydratedDocumentType) | null;

declare module 'mongodb' {
    interface FilterOperators<TValue> {
        $match?: TValue extends string ? string : never;
    }

    interface CreateCollectionOptions {
        vector?: CollectionVectorOptions;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        indexing?: CollectionIndexingOptions<any>;
        lexical?: CollectionLexicalOptions;
    }
}

declare module 'mongoose' {
    interface ConnectOptions {
        isTable?: boolean;
        isAstra?: boolean;
        sanitizeFilter?: boolean;
        username?: string;
        password?: string;
        httpOptions?: HttpOptions
    }

    interface InsertManyOptions {
        returnDocumentResponses?: boolean;
    }

    interface SchemaOptions {
        serdes?: CollectionSerDesConfig | TableSerDesConfig;
        udtName?: string;
    }

    function setDriver(driver: typeof AstraMongooseDriver): AstraMongoose;

    // Module augmentation for Astra-specific Mongoose `Model` behavior. Not strictly 100% type-safe
    // since you may import astra-mongoose without actually calling `setDriver()` but sufficient for
    // practical purposes. The generic parameters must match Mongoose's `Model` generics **exactly**.
    interface Model<
      TRawDocType,
      // eslint-disable-next-line @typescript-eslint/no-empty-object-type
      TQueryHelpers = {},
      // eslint-disable-next-line @typescript-eslint/no-empty-object-type
      TInstanceMethods = {},
      // eslint-disable-next-line @typescript-eslint/no-empty-object-type
      TVirtuals = {},
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      THydratedDocumentType = HydratedDocument<TRawDocType, TVirtuals & TInstanceMethods, TQueryHelpers, TVirtuals>,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
      TSchema = any
    > {

      /**
       * Astra's `*` projection selects every field. Mongoose treats `*` as an
       * unknown schema path and otherwise infers a document containing only `_id`.
       */
      find<TOptions extends QueryOptions<TRawDocType> | undefined = undefined>(
        filter: QueryFilter<TRawDocType>,
        projection: WildcardProjection,
        options?: TOptions
      ): QueryWithHelpers<
        TOptions extends { lean: true }
          ? GetLeanResultType<TRawDocType, TRawDocType[], 'find'>
          : THydratedDocumentType[],
        THydratedDocumentType,
        TQueryHelpers,
        GetLeanResultType<TRawDocType, TRawDocType, 'find'>,
        'find',
        TInstanceMethods & TVirtuals
      >;

      find<TOptions extends WildcardProjectionOptions<TRawDocType>>(
        filter: QueryFilter<TRawDocType>,
        projection: null | undefined,
        options: TOptions
      ): QueryWithHelpers<
        TOptions extends { lean: true }
          ? GetLeanResultType<TRawDocType, TRawDocType[], 'find'>
          : THydratedDocumentType[],
        THydratedDocumentType,
        TQueryHelpers,
        GetLeanResultType<TRawDocType, TRawDocType, 'find'>,
        'find',
        TInstanceMethods & TVirtuals
      >;

      findOne<TOptions extends QueryOptions<TRawDocType> | undefined = undefined>(
        filter: QueryFilter<TRawDocType>,
        projection: WildcardProjection,
        options?: TOptions
      ): QueryWithHelpers<
        (TOptions extends { lean: true }
          ? GetLeanResultType<TRawDocType, TRawDocType, 'findOne'>
          : THydratedDocumentType) | null,
        THydratedDocumentType,
        TQueryHelpers,
        GetLeanResultType<TRawDocType, TRawDocType, 'findOne'>,
        'findOne',
        TInstanceMethods & TVirtuals
      >;

      findOne<TOptions extends WildcardProjectionOptions<TRawDocType>>(
        filter: QueryFilter<TRawDocType>,
        projection: null | undefined,
        options: TOptions
      ): QueryWithHelpers<
        (TOptions extends { lean: true }
          ? GetLeanResultType<TRawDocType, TRawDocType, 'findOne'>
          : THydratedDocumentType) | null,
        THydratedDocumentType,
        TQueryHelpers,
        GetLeanResultType<TRawDocType, TRawDocType, 'findOne'>,
        'findOne',
        TInstanceMethods & TVirtuals
      >;

      findOneAndUpdate<TOptions extends WildcardProjectionOptions<TRawDocType>>(
        filter: QueryFilter<TRawDocType>,
        update: UpdateQuery<TRawDocType>,
        options: TOptions
      ): QueryWithHelpers<
        WildcardModifyResult<
          TOptions,
          THydratedDocumentType,
          GetLeanResultType<TRawDocType, TRawDocType, 'findOneAndUpdate'>
        >,
        THydratedDocumentType,
        TQueryHelpers,
        GetLeanResultType<TRawDocType, TRawDocType, 'findOneAndUpdate'>,
        'findOneAndUpdate',
        TInstanceMethods & TVirtuals
      >;

      findOneAndReplace<TOptions extends WildcardProjectionOptions<TRawDocType>>(
        filter: QueryFilter<TRawDocType>,
        replacement: TRawDocType | AnyObject,
        options: TOptions
      ): QueryWithHelpers<
        WildcardModifyResult<
          TOptions,
          THydratedDocumentType,
          GetLeanResultType<TRawDocType, TRawDocType, 'findOneAndReplace'>
        >,
        THydratedDocumentType,
        TQueryHelpers,
        GetLeanResultType<TRawDocType, TRawDocType, 'findOneAndReplace'>,
        'findOneAndReplace',
        TInstanceMethods & TVirtuals
      >;

      findOneAndDelete<TOptions extends WildcardProjectionOptions<TRawDocType>>(
        filter: QueryFilter<TRawDocType> | null,
        options: TOptions
      ): QueryWithHelpers<
        WildcardModifyResult<
          TOptions,
          THydratedDocumentType,
          GetLeanResultType<TRawDocType, TRawDocType, 'findOneAndDelete'>
        >,
        THydratedDocumentType,
        TQueryHelpers,
        GetLeanResultType<TRawDocType, TRawDocType, 'findOneAndDelete'>,
        'findOneAndDelete',
        TInstanceMethods & TVirtuals
      >;

      findAndRerank(filter: Record<string, unknown>, options?: CollectionFindAndRerankOptions): Promise<RerankedResult<TRawDocType>[]>;
    }
}

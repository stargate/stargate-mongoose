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
    TableSerDesConfig
} from '@datastax/astra-db-ts';

import * as driver from './driver';
export { driver };

export { default as createAstraUri } from './createAstraUri';
export { default as tableDefinitionFromSchema } from './tableDefinitionFromSchema';

import * as AstraMongooseDriver from './driver';
import type { Mongoose } from 'mongoose';

export { Vectorize, VectorizeOptions } from './driver';

export { AstraMongooseError } from './astraMongooseError';

export type AstraMongoose = Omit<Mongoose, 'connection'> & { connection: AstraMongooseDriver.Connection };

declare module 'mongodb' {
    interface CreateCollectionOptions {
        vector?: CollectionVectorOptions;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        indexing?: CollectionIndexingOptions<any>;
    }
}

declare module 'mongoose' {
    interface ConnectOptions {
        isTable?: boolean;
        isAstra?: boolean;
        sanitizeFilter?: boolean;
        username?: string;
        password?: string;
    }

    interface InsertManyOptions {
        returnDocumentResponses?: boolean;
    }

    interface SchemaOptions {
        serdes?: CollectionSerDesConfig | TableSerDesConfig
    }

    function setDriver(driver: typeof AstraMongooseDriver): AstraMongoose;

    // Module augmentation for Mongoose's `Model` interface to add `findAndRerank`. Not strictly 100%
    // type-safe since you may import astra-mongoose without actually calling `setDriver()` but sufficient
    // for practical purposes. The generic parameters must match Mongoose's `Model` generics **exactly**.
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

      findAndRerank(filter: Record<string, unknown>, options?: CollectionFindAndRerankOptions): Promise<RerankedResult<TRawDocType>[]>;
    }
}

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

export * as driver from './driver';
export { default as createAstraUri } from './createAstraUri';
export { default as tableDefinitionFromSchema } from './tableDefinitionFromSchema';

import * as AstraMongooseDriver from './driver';
import type { Mongoose, Model } from 'mongoose';

export { Vectorize, VectorizeOptions } from './driver';

export { AstraMongooseError } from './astraMongooseError';

export type AstraMongoose = Omit<Mongoose, 'connection'> & { connection: AstraMongooseDriver.Connection };

export type AstraMongooseModel<DocType, ModelType = Model<DocType>> = Model<DocType, ModelType> & {
  findAndRerank(filter: Record<string, unknown>, options?: CollectionFindAndRerankOptions): Promise<RerankedResult<DocType>[]>;
};

declare module 'mongodb' {
    interface CreateCollectionOptions {
        vector?: CollectionVectorOptions;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        indexing?: CollectionIndexingOptions<any>;
    }
}

declare module 'mongoose' {
    interface ConnectOptions {
        useTables?: boolean;
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
}

import { CollectionIndexingOptions, CollectionSerDesConfig, CollectionVectorOptions, TableSerDesConfig } from '@datastax/astra-db-ts';
export * as driver from './driver';
export { default as createAstraUri } from './createAstraUri';
export { default as tableDefinitionFromSchema } from './tableDefinitionFromSchema';
import * as StargateMongooseDriver from './driver';
import type { Mongoose } from 'mongoose';
export { Vectorize, VectorizeOptions } from './driver';
export type StargateMongoose = Omit<Mongoose, 'connection'> & {
    connection: StargateMongooseDriver.Connection;
};
declare module 'mongodb' {
    interface CreateCollectionOptions {
        vector?: CollectionVectorOptions;
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
        serdes?: CollectionSerDesConfig | TableSerDesConfig;
    }
    function setDriver(driver: typeof StargateMongooseDriver): StargateMongoose;
}

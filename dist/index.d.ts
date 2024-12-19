import { CollectionIndexingOptions, CollectionVectorOptions } from '@datastax/astra-db-ts';
export * as driver from './driver';
export { default as createAstraUri } from './createAstraUri';
declare module 'mongodb' {
    interface CreateCollectionOptions {
        vector?: CollectionVectorOptions;
        indexing?: CollectionIndexingOptions<any>;
    }
}
declare module 'mongoose' {
    interface ConnectOptions {
        isAstra?: boolean;
        sanitizeFilter?: boolean;
        featureFlags?: string[];
        username?: string;
        password?: string;
    }
    interface InsertManyOptions {
        returnDocumentResponses?: boolean;
    }
    function setDriver<T = Mongoose>(driver: unknown): T;
}
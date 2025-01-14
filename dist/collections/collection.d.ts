import { Db } from './db';
import { FindCursor } from './cursor';
import { InsertManyResult } from 'mongoose';
import type { HTTPClient } from '../client';
import { DeleteOneOptions, FindOneAndDeleteOptionsForDataAPI, FindOneAndReplaceOptionsForDataAPI, FindOneAndUpdateOptions, InsertManyOptions, UpdateManyOptions, FindOptionsForDataAPI, FindOneOptionsForDataAPI, UpdateOneOptionsForDataAPI, ReplaceOneOptionsForDataAPI } from './options';
export interface DataAPIUpdateResult {
    matchedCount: number;
    modifiedCount: number;
    acknowledged: boolean;
    upsertedId?: unknown;
    upsertedCount?: number;
}
export interface DataAPIDeleteResult {
    acknowledged: boolean;
    deletedCount: number;
}
export interface DataAPIInsertOneResult {
    acknowledged: boolean;
    insertedId: unknown;
}
export interface DataAPIModifyResult {
    ok: number;
    value: Record<string, unknown> | null;
}
export type DataAPIInsertManyResult = InsertManyResult<unknown> & {
    documentResponses?: {
        _id: unknown;
        status: string;
        errorsIdx?: number;
    };
};
export declare class Collection {
    httpClient: HTTPClient;
    name: string;
    httpBasePath: string;
    collectionName: string;
    constructor(db: Db, name: string);
    insertOne(document: Record<string, unknown>): Promise<any>;
    insertMany(documents: Record<string, unknown>[], options?: InsertManyOptions): Promise<any>;
    replaceOne(filter: Record<string, unknown>, replacement: Record<string, unknown>, options?: ReplaceOneOptionsForDataAPI): Promise<any>;
    updateOne(filter: Record<string, unknown>, update: Record<string, unknown>, options?: UpdateOneOptionsForDataAPI): Promise<any>;
    updateMany(filter: Record<string, unknown>, update: Record<string, unknown>, options?: UpdateManyOptions): Promise<any>;
    deleteOne(filter: Record<string, unknown>, options?: DeleteOneOptions): Promise<DataAPIDeleteResult>;
    deleteMany(filter: Record<string, unknown>): Promise<DataAPIDeleteResult>;
    find(filter: Record<string, unknown>, options?: FindOptionsForDataAPI): FindCursor;
    findOne(filter: Record<string, unknown>, options?: FindOneOptionsForDataAPI): Promise<Record<string, unknown> | null>;
    findOneAndReplace(filter: Record<string, unknown>, replacement: Record<string, unknown>, options?: FindOneAndReplaceOptionsForDataAPI): Promise<DataAPIModifyResult>;
    distinct(_key: string, _filter: Record<string, unknown>, _options?: Record<string, unknown>): Promise<void>;
    countDocuments(filter?: Record<string, unknown>): Promise<number>;
    estimatedDocumentCount(): Promise<number>;
    findOneAndDelete(filter: Record<string, unknown>, options?: FindOneAndDeleteOptionsForDataAPI): Promise<DataAPIModifyResult>;
    /**
   * @deprecated
   */
    count(filter?: Record<string, unknown>): Promise<number>;
    findOneAndUpdate(filter: Record<string, unknown>, update: Record<string, unknown>, options?: FindOneAndUpdateOptions): Promise<DataAPIModifyResult>;
    runCommand(command: Record<string, unknown>): Promise<any>;
}
export declare class StargateMongooseError extends Error {
    command: Record<string, any>;
    constructor(message: string, command: Record<string, unknown>);
}

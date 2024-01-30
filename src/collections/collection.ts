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

import {FindCursor} from './cursor';
import {HTTPClient} from '@/src/client';
import {executeOperation, setDefaultIdForUpsert} from './utils';
import {InsertManyResult} from 'mongoose';
import {
    DeleteOneOptions,
    FindOneAndDeleteOptions,
    findOneAndReplaceInternalOptionsKeys,
    FindOneAndReplaceOptions,
    findOneAndUpdateInternalOptionsKeys,
    FindOneAndUpdateOptions,
    FindOneOptions,
    insertManyInternalOptionsKeys,
    InsertManyOptions,
    updateManyInternalOptionsKeys,
    UpdateManyOptions,
    updateOneInternalOptionsKeys,
    UpdateOneOptions,
    FindOptions,
    findOneInternalOptionsKeys
} from './options';

export interface JSONAPIUpdateResult {
  matchedCount: number;
  modifiedCount: number;
  acknowledged: boolean;
  upsertedId?: any,
  upsertedCount?: number
}

export interface JSONAPIDeleteResult {
  acknowledged: boolean;
  deletedCount: number;
}

export interface JSONAPIInsertOneResult {
  acknowledged: boolean;
  insertedId: any;
}

export interface JSONAPIModifyResult {
  ok: number;
  value: Record<string, any> | null;
}

export class Collection {
    httpClient: any;
    name: string;
    collectionName: string;

    constructor(httpClient: HTTPClient, name: string) {
        if (!name) {
            throw new Error('Collection name is required');
        }
        // use a clone of the underlying http client to support multiple collections from a single db
        this.httpClient = new HTTPClient({
            baseUrl: httpClient.baseUrl + `/${name}`,
            username: httpClient.username,
            password: httpClient.password,
            authUrl: httpClient.authUrl,
            applicationToken: httpClient.applicationToken,
            authHeaderName: httpClient.authHeaderName,
            isAstra: httpClient.isAstra,
            logSkippedOptions: httpClient.logSkippedOptions
        });
        this.name = name;
        this.collectionName = name;
    }

    async insertOne(document: Record<string, any>) {
        return executeOperation(async (): Promise<JSONAPIInsertOneResult> => {
            const command = {
                insertOne: {
                    document
                }
            };
            const resp = await this.httpClient.executeCommand(command, null);
            return {
                acknowledged: true,
                insertedId: resp.status.insertedIds[0]
            };
        });
    }

    async insertMany(documents: Record<string, any>[], options?: InsertManyOptions) {
        return executeOperation(async (): Promise<InsertManyResult<any>> => {
            const command = {
                insertMany: {
                    documents,
                    options
                }
            };
            const resp = await this.httpClient.executeCommand(command, insertManyInternalOptionsKeys);
            return {
                acknowledged: true,
                insertedCount: resp.status.insertedIds?.length || 0,
                insertedIds: resp.status.insertedIds
            };
        });
    }

    async updateOne(filter: Record<string, any>, update: Record<string, any>, options?: UpdateOneOptions) {
        return executeOperation(async (): Promise<JSONAPIUpdateResult> => {
            const command = {
                updateOne: {
                    filter,
                    update,
                    options,
                    ...(options?.sort != null ? { sort: options?.sort } : {})
                }
            };
            setDefaultIdForUpsert(command.updateOne);
            const updateOneResp = await this.httpClient.executeCommand(command, updateOneInternalOptionsKeys);
            const resp = {
                modifiedCount: updateOneResp.status.modifiedCount,
                matchedCount: updateOneResp.status.matchedCount,
                acknowledged: true
            } as JSONAPIUpdateResult;
            if (updateOneResp.status.upsertedId) {
                resp.upsertedId = updateOneResp.status.upsertedId;
                resp.upsertedCount = 1;
            }
            return resp;
        });
    }

    async updateMany(filter: Record<string, any>, update: Record<string, any>, options?: UpdateManyOptions) {
        return executeOperation(async (): Promise<JSONAPIUpdateResult> => {
            const command = {
                updateMany: {
                    filter,
                    update,
                    options
                }
            };
            setDefaultIdForUpsert(command.updateMany);
            const updateManyResp = await this.httpClient.executeCommand(command, updateManyInternalOptionsKeys);
            if (updateManyResp.status.moreData) {
                throw new StargateMongooseError(`More than ${updateManyResp.status.modifiedCount} records found for update by the server`, command);
            }
            const resp = {
                modifiedCount: updateManyResp.status.modifiedCount,
                matchedCount: updateManyResp.status.matchedCount,
                acknowledged: true,
            } as JSONAPIUpdateResult;
            if (updateManyResp.status.upsertedId) {
                resp.upsertedId = updateManyResp.status.upsertedId;
                resp.upsertedCount = 1;
            }
            return resp;
        });
    }

    async deleteOne(filter: Record<string, any>, options?: DeleteOneOptions): Promise<JSONAPIDeleteResult> {
        return executeOperation(async (): Promise<JSONAPIDeleteResult> => {
            const command = {
                deleteOne: {
                    filter,
                    ...(options?.sort != null ? { sort: options.sort } : {})
                }
            };
            const deleteOneResp = await this.httpClient.executeCommand(command, null);
            return {
                acknowledged: true,
                deletedCount: deleteOneResp.status.deletedCount
            };
        });
    }

    async deleteMany(filter: Record<string, any>): Promise<JSONAPIDeleteResult> {
        return executeOperation(async (): Promise<JSONAPIDeleteResult> => {
            const command = {
                deleteMany: {
                    filter
                }
            };
            const deleteManyResp = await this.httpClient.executeCommand(command, null);
            if (deleteManyResp.status.moreData) {
                throw new StargateMongooseError(`More records found to be deleted even after deleting ${deleteManyResp.status.deletedCount} records`, command);
            }
            return {
                acknowledged: true,
                deletedCount: deleteManyResp.status.deletedCount
            };
        });
    }

    find(filter: Record<string, any>, options?: FindOptions): FindCursor {
        return new FindCursor(this, filter, options);
    }

    async findOne(filter: Record<string, any>, options?: FindOneOptions): Promise<Record<string, any> | null> {
        return executeOperation(async (): Promise<Record<string, any> | null> => {
            const command = {
                findOne: {
                    filter,
                    options,
                    ...(options?.sort != null ? { sort: options?.sort } : {}),
                    ...(options?.projection != null ? { sort: options?.projection } : {}),
                }
            };

            const resp = await this.httpClient.executeCommand(command, findOneInternalOptionsKeys);
            return resp.data.document;
        });
    }

    async findOneAndReplace(filter: Record<string, any>, replacement: Record<string, any>, options?: FindOneAndReplaceOptions): Promise<JSONAPIModifyResult> {
        return executeOperation(async (): Promise<JSONAPIModifyResult> => {
            const command = {
                findOneAndReplace: {
                    filter,
                    replacement,
                    options,
                    ...(options?.sort != null ? { sort: options?.sort } : {})
                }
            };
            setDefaultIdForUpsert(command.findOneAndReplace, true);
            const resp = await this.httpClient.executeCommand(command, findOneAndReplaceInternalOptionsKeys);
            return {
                value : resp.data?.document,
                ok : 1
            };
        });
    }

    async distinct(_key: any, _filter: any, _options?: any) {
        throw new Error('Not Implemented');
    }

    async countDocuments(filter?: Record<string, any>): Promise<number> {
        return executeOperation(async (): Promise<number> => {
            const command = {
                countDocuments: {
                    filter
                }
            };
            const resp = await this.httpClient.executeCommand(command, null);
            return resp.status.count;
        });
    }

    async findOneAndDelete(filter: Record<string, any>, options?: FindOneAndDeleteOptions): Promise<JSONAPIModifyResult> {
        const command = {
            findOneAndDelete: {
                filter,
                ...(options?.sort != null ? { sort: options?.sort } : {})
            }
        };

        const resp = await this.httpClient.executeCommand(command, null);
        return {
            value : resp.data?.document,
            ok : 1
        };
    }

    /** 
   * @deprecated
   */
    async count(filter?: Record<string, any>) {
        return this.countDocuments(filter);
    }

    async findOneAndUpdate(filter: Record<string, any>, update: Record<string, any>, options?: FindOneAndUpdateOptions): Promise<JSONAPIModifyResult> {
        return executeOperation(async (): Promise<JSONAPIModifyResult> => {
            const command = {
                findOneAndUpdate: {
                    filter,
                    update,
                    options,
                    ...(options?.sort != null ? { sort: options?.sort } : {})
                }
            };
            setDefaultIdForUpsert(command.findOneAndUpdate);
            const resp = await this.httpClient.executeCommand(command, findOneAndUpdateInternalOptionsKeys);
            return {
                value : resp.data?.document,
                ok : 1
            };
        });
    }
}

export class StargateMongooseError extends Error {
    command: Record<string, any>;
    constructor(message: any, command: Record<string, any>) {
        const commandName = Object.keys(command)[0] || 'unknown';
        super(`Command "${commandName}" failed with the following error: ${message}`);
        this.command = command;
    }
}
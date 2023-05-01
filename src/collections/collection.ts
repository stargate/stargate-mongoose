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

import _ from 'lodash';
import {
  DeleteResult,
  InsertOneResult,
  ModifyResult,
  ObjectId,
  UpdateResult
} from 'mongodb';
import { FindCursor, FindOptions } from './cursor';
import { HTTPClient } from '@/src/client';
import { executeOperation } from './utils';
import { inspect } from 'util';
import mpath from 'mpath';
import { InsertManyResult } from 'mongoose';
import { logger } from '@/src/logger';

// https://github.com/mongodb/node-mongodb-native/pull/3323
type JSONAPIUpdateResult = Omit<UpdateResult, 'upsertedId'> & { upsertedId: ObjectId | null };

export interface DeleteOneOptions {
  sort?: Record<string, 1 | -1>;
}

export interface FindOneOptions {
  sort?: Record<string, 1 | -1>;
}

export interface FindOneAndDeleteOptions {
  sort?: Record<string, 1 | -1>;
}

export interface FindOneAndReplaceOptions {
  upsert?: boolean;
  returnDocument?: 'before' | 'after';
  sort?: Record<string, 1 | -1>;
}

export interface FindOneAndUpdateOptions {
  upsert?: boolean;
  returnDocument?: 'before' | 'after';
  sort?: Record<string, 1 | -1>;
}

export { FindOptions } from './cursor';

export interface InsertManyOptions {
  ordered?: boolean;
}

export interface UpdateOneOptions {
  upsert?: boolean;
}

export interface UpdateManyOptions {
  upsert?: boolean;
}

export class Collection {
  httpClient: any;
  name: string;
  collectionName: string;

  /**
   *
   * @param httpClient
   * @param name
   */
  constructor(httpClient: HTTPClient, name: string) {
    if (!name) {
      throw new Error('Collection name is required');
    }
    // use a clone of the underlying http client to support multiple collections from a single db
    this.httpClient = _.cloneDeep(httpClient);
    this.httpClient.baseUrl += `/${name}`;
    this.name = name;
    this.collectionName = name;
  }

  /**
   *
   * @param mongooseDoc
   * @param options
   * @returns Promise
   */
  async insertOne(document: Record<string, any>) {
    return executeOperation(async (): Promise<InsertOneResult> => {
      let command = {
        insertOne : {
            document
        }
      };
      const resp = await this.httpClient.executeCommand(command);
      return {
        acknowledged: true,
        insertedId: resp.status.insertedIds[0]
      };
    });
  }

  async insertMany(documents: Record<string, any>[], options?: InsertManyOptions) {
    return executeOperation(async (): Promise<InsertManyResult<any>> => {
      const command = {
        insertMany : {
          documents,
          options
        }
      };
      const resp = await this.httpClient.executeCommand(command);
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
          options
        }
      };
      const updateOneResp = await this.httpClient.executeCommand(command);
      return {
        modifiedCount: updateOneResp.status.modifiedCount,
        matchedCount: updateOneResp.status.matchedCount,
        acknowledged: true,
        upsertedCount: updateOneResp.status.upsertedCount,
        upsertedId: updateOneResp.status.upsertedId
      };
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
      const updateManyResp = await this.httpClient.executeCommand(command);
      if(updateManyResp.status.moreData){
        throw new StargateMongooseError(`More than ${updateManyResp.status.modifiedCount} records found for update by the server`, command);
      }
      return {
        modifiedCount: updateManyResp.status.modifiedCount,
        matchedCount: updateManyResp.status.matchedCount,
        acknowledged: true,
        upsertedCount: updateManyResp.status.upsertedCount,
        upsertedId: updateManyResp.status.upsertedId
      };
    });
  }

  async replaceOne(filter: any, replacement: any, options?: any) {
    throw new Error('Not Implemented');
  }

  async deleteOne(filter: Record<string, any>, options?: DeleteOneOptions): Promise<DeleteResult> {
    return executeOperation(async (): Promise<DeleteResult> => {
      type DeleteOneCommand = {
        deleteOne: {
          filter?: Object,
          sort?: Record<string, 1 | -1>
        }
      };
      const command: DeleteOneCommand = {
        deleteOne: {
          filter
        }
      };
      if (options?.sort) {
        command.deleteOne.sort = options.sort;
      }
      const deleteOneResp = await this.httpClient.executeCommand(command);
      return {
        acknowledged: true,
        deletedCount: deleteOneResp.status.deletedCount 
      };
    });
  }

  async deleteMany(filter: Record<string, any>): Promise<DeleteResult> {
    return executeOperation(async (): Promise<DeleteResult> => {
      const command = {
        deleteMany: {
          filter
        }
      };
      const deleteManyResp = await this.httpClient.executeCommand(command);
      if(deleteManyResp.status.moreData){
        throw new StargateMongooseError(`More records found to be deleted even after deleting ${deleteManyResp.status.deletedCount} records`, command);
      }
      return {
        acknowledged: true,
        deletedCount: deleteManyResp.status.deletedCount 
      };
    });
  }

  find(filter: Record<string, any>, options?: FindOptions): FindCursor {
    const cursor = new FindCursor(this, filter, options);
    return cursor;
  }

  async findOne(filter: Record<string, any>, options?: FindOneOptions): Promise<Record<string, any> | null> {
    return executeOperation(async (): Promise<Record<string, any> | null> => {
      type FindOneCommand = {
        findOne: {
          filter?: Record<string, any>,
          options?: Record<string, any>,
          sort?: Record<string, any>
        }
      };
      const command: FindOneCommand = {
        findOne : {
          filter,
          options
        }
      };

      if (options?.sort) {
        command.findOne.sort = options.sort;
      }

      const resp = await this.httpClient.executeCommand(command);
      return resp.data.document;
    });
  }

  async findOneAndReplace(filter: Record<string, any>, replacement: Record<string, any>, options?: FindOneAndReplaceOptions): Promise<ModifyResult> {
    return executeOperation(async (): Promise<ModifyResult> => {
      type FindOneAndReplaceCommand = {
        findOneAndReplace: {
          filter?: Object,
          replacement?: Object,
          options?: Object,
          sort?: Object
        }
      };
      const command: FindOneAndReplaceCommand = {
        findOneAndReplace: {
          filter,
          replacement,
          options
        }
      };
      if (options?.sort) {
        command.findOneAndReplace.sort = options.sort;
        delete options.sort;
      }
      const resp = await this.httpClient.executeCommand(command);
      return {
        value : resp.data?.document,
        ok : 1
      };
    });
  }

  async distinct(key: any, filter: any, options?: any) {
    throw new Error('Not Implemented');
  }

  async countDocuments(filter?: Record<string, any>): Promise<number> {
    return executeOperation(async (): Promise<number> => {
      const command = {
        countDocuments: {
          filter
        }
      };
      const resp = await this.httpClient.executeCommand(command);
      return resp.status.count;
    });
  }

  async findOneAndDelete(filter: Record<string, any>, options?: FindOneAndDeleteOptions): Promise<ModifyResult> {
    type FindOneAndDeleteCommand = {
      findOneAndDelete: {
        filter?: Object,
        sort?: Object
      }
    };
    const command: FindOneAndDeleteCommand = {
      findOneAndDelete : {
        filter
      }
    };
    if (options?.sort) {
      command.findOneAndDelete.sort = options.sort;
    }

    const resp = await this.httpClient.executeCommand(command);
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

  async findOneAndUpdate(filter: Record<string, any>, update: Record<string, any>, options?: FindOneAndUpdateOptions): Promise<ModifyResult> {
    return executeOperation(async (): Promise<ModifyResult> => {
      type FindOneAndUpdateCommand = {
        findOneAndUpdate: {
          filter?: Object,
          update?: Object,
          options?: Object,
          sort?: Object
        }
      };
      const command: FindOneAndUpdateCommand = {
        findOneAndUpdate : {
          filter,
          update,
          options
        }
      };
      if (options?.sort) {
        command.findOneAndUpdate.sort = options.sort;
        delete options.sort;
      }
      const resp = await this.httpClient.executeCommand(command);
      return {
        value : resp.data?.document,
        ok : 1
      };
    });
  }

  /**
   *
   * @param index
   * @param options
   * @returns any
   */
  async createIndex(index: any, options: any) {
    throw new Error('Not Implemented');
  }

  /**
   *
   * @param index
   * @param options
   * @returns any
   */
  async dropIndexes(index: any, options: any) {
    throw new Error('Not Implemented');
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
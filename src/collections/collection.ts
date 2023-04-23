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
  FindOneAndUpdateOptions,
  InsertOneResult,
  ModifyResult,
  ObjectId,
  UpdateOptions,
  UpdateResult
} from 'mongodb';
import { FindCursor } from './cursor';
import { HTTPClient } from '@/src/client';
import { executeOperation } from './utils';
import { inspect } from 'util';
import mpath from 'mpath';
import { InsertManyResult } from 'mongoose';
import { logger } from '@/src/logger';

// https://github.com/mongodb/node-mongodb-native/pull/3323
type JSONAPIUpdateResult = Omit<UpdateResult, 'upsertedId'> & { upsertedId: ObjectId | null };

interface DocumentCallback {
  (err: Error | undefined, res: any): void;
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

  async insertMany(docs: any, options?: any) {
    return executeOperation(async (): Promise<InsertManyResult<any>> => {
      const command = {
        insertMany : {
            documents : docs,
            options: options
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

  async updateOne(query: any, update: any, options?: UpdateOptions) {
    return executeOperation(async (): Promise<JSONAPIUpdateResult> => {
      if (options != null && 'session' in options) {
        options = { ...options };
        delete options.session;
      }
      const command = {
        updateOne: {
          filter: query,
          update: update,
          options: options
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

  async updateMany(query: any, update: any, options?: UpdateOptions) {
    return executeOperation(async (): Promise<JSONAPIUpdateResult> => {
      const command = {
        updateMany: {
          filter: query,
          update: update,
          options: options
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

  async replaceOne(query: any, newDoc: any, options?: any) {
    throw new Error('Not Implemented');
  }

  async deleteOne(query: any) {
    return executeOperation(async (): Promise<DeleteResult> => {
      type DeleteOneCommand = {
        deleteOne: {
          filter?: Object
        }
      };
      const command: DeleteOneCommand = {
        deleteOne: {
          filter: query,
        }
      };
      const deleteOneResp = await this.httpClient.executeCommand(command);
      return {
        acknowledged: true,
        deletedCount: deleteOneResp.status.deletedCount 
      };
    });
  }

  async deleteMany(query: any) {
    return executeOperation(async (): Promise<DeleteResult> => {
      const command = {
        deleteMany: {
          filter: query
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

  find(query: any, options?: any) {
    const cursor = new FindCursor(this, query, options);
    return cursor;
  }

  async findOne(query: any, options?: any) {
    return executeOperation(async (): Promise<any | null> => {
      // Workaround for Automattic/mongoose#13052
      if (options && options.session == null) {
        delete options.session;
      }
      // Workaround because Mongoose `save()` uses `findOne({ _id }, { projection: { _id: 1 } })`
      // if there's no updates, which causes Stargate server to return an error
      if (options && 'projection' in options) {
        delete options.projection;
      }

      type FindOneCommand = {
        findOne: {
          filter?: Object,
          options?: Object,
          sort?: Object
        }
      };
      const command: FindOneCommand = {
        findOne : {
          filter : query,
          options: options
        }
      };

      if (options.sort) {
        command.findOne.sort = options.sort;
      }

      const resp = await this.httpClient.executeCommand(command);
      return resp.data.docs[0];
    });
  }

  async findOneAndReplace(filter: any, replacement: any, options?: any){
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
        value : resp.data?.docs[0],
        ok : 1
      };
    });
  }

  async distinct(key: any, filter: any, options?: any) {
    throw new Error('Not Implemented');
  }

  async countDocuments(filter: any) {
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

  async findOneAndDelete(query: any, options: any) {
    throw new Error('Not Implemented');
  }

 /** 
  * @deprecated
  */
  async count(query: any, options: any) {
    throw new Error('Not Implemented');
  }

  async findOneAndUpdate(query: any, update: any, options?: FindOneAndUpdateOptions) {
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
          filter : query,
          update : update,
          options: options
        }
      };
      if (options?.sort) {
        command.findOneAndUpdate.sort = options.sort;
        delete options.sort;
      }
      const resp = await this.httpClient.executeCommand(command);
      return {
        value : resp.data?.docs[0],
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
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
import { setOptionsAndCb, executeOperation, getNestedPathRawValue } from './utils';
import { inspect } from 'util';
import mpath from 'mpath';
import { InsertManyResult } from 'mongoose';
import { logger } from '@/src/logger';

// https://github.com/mongodb/node-mongodb-native/pull/3323
type AstraUpdateResult = Omit<UpdateResult, 'upsertedId'> & { upsertedId: ObjectId | null };

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
   * @param cb
   * @returns Promise
   */
  async insertOne(document: Record<string, any>, options?: any, cb?: DocumentCallback) {
    ({ options, cb } = setOptionsAndCb(options, cb));
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
    }, cb);
  }

  async insertMany(docs: any, options?: any, cb?: any) {
    ({ options, cb } = setOptionsAndCb(options, cb));
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
    }, cb);
  }

  async updateOne(query: any, update: any, options?: UpdateOptions, cb?: any) {
    ({ options, cb } = setOptionsAndCb(options, cb));
    return executeOperation(async (): Promise<AstraUpdateResult> => {
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
    }, cb);
  }

  async updateMany(query: any, update: any, options?: UpdateOptions, cb?: any) {
    ({ options, cb } = setOptionsAndCb(options, cb));
    return executeOperation(async (): Promise<AstraUpdateResult> => {
      const command = {
        updateMany: {
          filter: query,
          update: update,
          options: options
        }
      };
      const updateManyResp = await this.httpClient.executeCommand(command);
      return {
        modifiedCount: updateManyResp.status.modifiedCount,
        matchedCount: updateManyResp.status.matchedCount,
        acknowledged: true,
        upsertedCount: updateManyResp.status.upsertedCount,
        upsertedId: updateManyResp.status.upsertedId
      };
    }, cb);
  }

  async replaceOne(query: any, newDoc: any, options?: any, cb?: any) {
    throw new Error('Not Implemented');
  }

  async deleteOne(query: any, options?: any, cb?: any) {
    ({ options, cb } = setOptionsAndCb(options, cb));
    return executeOperation(async (): Promise<DeleteResult> => {
      const command = {
        deleteOne: {
          filter: query,
          options: options
        }
      };
      const deleteOneResp = await this.httpClient.executeCommand(command);
      return {
        acknowledged: true,
        deletedCount: deleteOneResp.status.deletedCount 
      };
    }, cb);
  }

  async deleteMany(query: any, options?: any, cb?: any) {
    //throw new Error('Not Implemented');
    return;//TODOV3 returning as succeeded for now for testing
  }

  find(query: any, projection?: any, options?: any, cb?: any) {
    ({ options, cb } = setOptionsAndCb(options, cb));
    const cursor = new FindCursor(this, query, projection, options);
    if (cb) {
      return cb(undefined, cursor);
    }
    return cursor;
  }

  async findOne(query: any, projection?: any, options?: any, cb?: any) {
    ({ options, cb } = setOptionsAndCb(options, cb));
    return executeOperation(async (): Promise<any | null> => {
      const command = {
        findOne : {
          filter : query,
          projection: projection,
          options: options
        }
      };
      // Avoid empty projections
      if (projection == null || Object.keys(projection).length === 0) {
        delete command.findOne.projection;
      }
      const resp = await this.httpClient.executeCommand(command);
      return resp.data.docs[0];
    }, cb);
  }

  async findOneAndReplace(query: any, newDoc: any, options?: any, cb?: any){
    throw new Error('Not Implemented');
  }

  async distinct(key: any, filter: any, options?: any, cb?: any) {
    throw new Error('Not Implemented');
  }

  async countDocuments(query: any, options?: any, cb?: any) {
    throw new Error('Not Implemented');
  }

  // deprecated and overloaded

  async remove(query: any, options: any, cb?: any) {
    return await this.deleteMany(query, options, cb);
  }

  async insert(docs: any[], options?: any, cb?: any) {
    return await this.insertMany(docs, options, cb);
  }

  async findOneAndDelete(query: any, options: any, cb: any) {
    throw new Error('Not Implemented');
  }

 /** 
  * @deprecated
  */
  async count(query: any, options: any, cb?: any) {
    throw new Error('Not Implemented');
  }


 /** 
  * @deprecated
  */
  async update(query: any, update: any, options: any, cb?: any) {
    return await this.updateMany(query, update, options, cb);
  }

  async findOneAndUpdate(query: any, update: any, options?: FindOneAndUpdateOptions, cb?: any) {
    return executeOperation(async (): Promise<ModifyResult> => {
      const command = {
        findOneAndUpdate : {
            filter : query,
            update : update,
            options: options
        }
      };
      const resp = await this.httpClient.executeCommand(command);
      return {
        value : resp.data?.docs[0],
        ok : 1
      };
    }, cb);
  }

  // NOOPS and unimplemented

  /**
   *
   * @param pipeline
   * @param options
   */
  aggregate<T>(pipeline?: any[], options?: any, cb?: any) {
    throw new Error('Not Implemented');
  }

  /**
   *
   * @param ops
   * @param options
   * @param cb
   */
  bulkWrite(ops: any[], options?: any, cb?: any) {
    throw new Error('bulkWrite() Not Implemented');
  }

  /**
   *
   * @param index
   * @param options
   * @param cb
   * @returns any
   */
  async createIndex(index: any, options: any, cb?: any) {
    throw new Error('Not Implemented');
  }

  /**
   *
   * @param index
   * @param options
   * @param cb
   * @returns any
   */
  async dropIndexes(cb?: any) {
    throw new Error('Not Implemented');
  }

}

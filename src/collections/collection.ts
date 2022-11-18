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
import { addDefaultId, setOptionsAndCb, executeOperation, getNestedPathRawValue } from './utils';
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
  async insertOne(doc: Record<string, any>, options?: any, cb?: DocumentCallback) {
    ({ options, cb } = setOptionsAndCb(options, cb));
    return executeOperation(async (): Promise<InsertOneResult> => {
      if(!doc._id){ //TODOV3
        addDefaultId(doc);
      }
      const command = {
        insertOne : {
            doc : doc
        }
      };
      const { data } = await this.httpClient.executeCommand('', command, options);
      return {
        acknowledged: true,
        insertedId: data.status.insertedIds[0] //TODOV3
      };
    }, cb);
  }

  async insertMany(docs: any, options?: any, cb?: any) {
    ({ options, cb } = setOptionsAndCb(options, cb));
    return executeOperation(async (): Promise<InsertManyResult<any>> => {
      docs = docs.map((doc: any) => addDefaultId(doc));
      const { data } = await this.httpClient.post('/batch', docs, { params: { 'id-path': '_id' } });

      return {
        acknowledged: true,
        insertedCount: data.documentIds?.length || 0,
        insertedIds: data.documentIds
      };
    }, cb);
  }

  _convertUpdateOperators(doc: any, update: any) {
    if (update.$set) {
      update = _.merge(update, update.$set);
      delete update.$set;
    }
    if (update.$inc) {
      _.keys(update.$inc).forEach(incrementKey => {
        const currentValue = getNestedPathRawValue(doc, incrementKey);

        if (currentValue) {
          update[incrementKey] = currentValue + update.$inc[incrementKey];
        } else {
          update[incrementKey] = update.$inc[incrementKey];
        }
      });

      delete update.$inc;
    }
    if (update.$push) {
      for (const key of Object.keys(update.$push)) {
        const currentValue = getNestedPathRawValue(doc, key);

        if (currentValue != null) {
          if (!Array.isArray(currentValue)) {
            throw new Error('Cannot $push to a non-array value');
          }

          if (update.$push[key]?.$each) {
            update[key] = currentValue.concat(update.$push[key].$each);
          } else {
            update[key] = [...currentValue, update.$push[key]];
          }
        } else {
          update[key] = update.$push[key]?.$each ? update.$push[key].$each : [update.$push[key]];
        }
      }

      delete update.$push;
    }
    if (update.$addToSet) {
      for (const key of Object.keys(update.$addToSet)) {
        const currentValue = getNestedPathRawValue(doc, key);

        if (currentValue != null) {
          if (!Array.isArray(currentValue)) {
            throw new Error('Cannot $addToSet to a non-array value');
          }

          if (update.$addToSet[key]?.$each) {
            update[key] = Array.from(new Set(currentValue.concat(update.$addToSet[key].$each)));
          } else {
            update[key] = Array.from(new Set([...currentValue, update.$addToSet[key]]));
          }
        } else {
          update[key] = update.$addToSet[key]?.$each ? update.$addToSet[key].$each : [update.$addToSet[key]];
        }
      }

      delete update.$addToSet;
    }
    if (update.$pullAll) {
      for (const key of Object.keys(update.$pullAll)) {
        const currentValue = getNestedPathRawValue(doc, key);

        if (currentValue != null) {
          if (!Array.isArray(currentValue)) {
            throw new Error('Cannot $pullAll on a non-array value');
          }

          update[key] = currentValue.filter(v => !update.$pullAll[key].includes(v));
        }
      }

      delete update.$pullAll;
    }
    if (update.$pull) {
      for (const key of Object.keys(update.$pull)) {
        const currentValue = getNestedPathRawValue(doc, key);

        if (currentValue != null) {
          if (!Array.isArray(currentValue)) {
            throw new Error('Cannot $pull on a non-array value');
          }

          update[key] = currentValue.filter(v => v !== update.$pull[key]);
        }
      }

      delete update.$pull;
    }
    if (update.$setOnInsert) {
      delete update.$setOnInsert;
    }

    // Dotted field names not allowed currently, so replace any nested property updates with
    // set on top-level field
    for (const key of Object.keys(update)) {
      if (key.charAt(0) === '$') {
        throw new Error(`Update operator ${key} not supported`);
      }

      const firstDot = key.indexOf('.');
      if (firstDot === -1) {
        continue;
      }

      const subpaths = key.split('.');
      let currentValue = doc[subpaths[0]];

      for (let i = 1; i < subpaths.length - 1; ++i) {
        currentValue[subpaths[i]] = currentValue[subpaths[i]] || {};
        currentValue = currentValue[subpaths[i]];
      }

      currentValue[subpaths[subpaths.length - 1]] = update[key];

      update[subpaths[0]] = doc[subpaths[0]];
      delete update[key];
    }

    return update;
  }

  private async doUpdate(doc: any, update: any) {
    this._convertUpdateOperators(doc, update);    

    const { data } = await this.httpClient.patch(`/${doc._id}`, update);
    data.acknowledged = true;
    data.matchedCount = 1;
    data.modifiedCount = 1;
    data.upsertedCount = 0;
    data.upsertedId = null;
    delete data.documentId;
    return data;
  }

  async updateOne(query: any, update: any, options?: UpdateOptions, cb?: any) {
    ({ options, cb } = setOptionsAndCb(options, cb));
    return executeOperation(async (): Promise<AstraUpdateResult> => {
      const doc = await this.findOne(query, options);
      if (doc) {
        return await this.doUpdate(doc, update);
      } else if (options?.upsert) {
        const doc = await this._upsertDoc(query, update);
        await this.insertOne(doc);

        return {
          modifiedCount: 0,
          matchedCount: 0,
          acknowledged: true,
          upsertedCount: 1,
          upsertedId: doc._id
        };
      }
      return {
        modifiedCount: 0,
        matchedCount: 0,
        acknowledged: true,
        upsertedCount: 0,
        upsertedId: null
      };
    }, cb);
  }

  async updateMany(query: any, update: any, options?: UpdateOptions, cb?: any) {
    ({ options, cb } = setOptionsAndCb(options, cb));
    return executeOperation(async (): Promise<AstraUpdateResult> => {
      const cursor = this.find(query, options);
      const docs = await cursor.toArray();
      if (docs.length) {
        const res = await Promise.all(
          docs.map((doc: any) => {
            return this.doUpdate(doc, _.cloneDeep(update));
          })
        );
        return {
          acknowledged: true,
          modifiedCount: res.length,
          matchedCount: res.length,
          upsertedCount: 0,
          upsertedId: null
        };
      } else if (options?.upsert) {
        const doc = await this._upsertDoc(query, update);
        await this.insertOne(doc);

        return {
          modifiedCount: 0,
          matchedCount: 0,
          acknowledged: true,
          upsertedCount: 1,
          upsertedId: doc._id
        };
      }
      return {
        acknowledged: true,
        modifiedCount: 0,
        matchedCount: 0,
        upsertedCount: 0,
        upsertedId: null
      };
    }, cb);
  }

  async replaceOne(query: any, newDoc: any, options?: any, cb?: any) {
    ({ options, cb } = setOptionsAndCb(options, cb));
    return executeOperation(async (): Promise<AstraUpdateResult> => {
      const doc = await this.findOne(query, options);
      if (doc) {
        const { data } = await this.httpClient.put(`/${doc._id}`, { ...newDoc, _id: doc._id });
        data.acknowledged = true;
        data.matchedCount = 1;
        data.modifiedCount = 1;
        delete data.documentId;
        return data;
      } else if (options?.upsert) {
        const doc = this._upsertDoc(query, newDoc);
        await this.insertOne(doc);

        return {
          acknowledged: true,
          matchedCount: 0,
          modifiedCount: 0,
          upsertedCount: 1,
          upsertedId: doc._id
        };
      }

      return {
        acknowledged: true,
        matchedCount: 0,
        modifiedCount: 0,
        upsertedCount: 0,
        upsertedId: null
      };
    }, cb);
  }

  async deleteOne(query: any, options?: any, cb?: any) {
    ({ options, cb } = setOptionsAndCb(options, cb));
    return executeOperation(async (): Promise<DeleteResult> => {
      const doc = await this.findOne(query, options);
      if (doc) {
        await this.httpClient.delete(`/${doc._id}`);
        return { acknowledged: true, deletedCount: 1 };
      }
      return { acknowledged: true, deletedCount: 0 };
    }, cb);
  }

  async deleteMany(query: any, options: any, cb?: any) {
    ({ options, cb } = setOptionsAndCb(options, cb));
    return executeOperation(async (): Promise<DeleteResult> => {
      const cursor = this.find(query, options);
      const docs = await cursor.toArray();
      if (docs.length) {
        let withoutId = null;
        if ((withoutId = docs.find((doc: any) => doc._id === undefined))) {
          throw new Error('Cannot delete document without an _id, deleting: ' + inspect(withoutId));
        }
        const res = await Promise.all(
          docs.map((doc: any) => this.httpClient.delete(`/${doc._id}`))
        );
        return { acknowledged: true, deletedCount: res.length };
      }
      return { acknowledged: true, deletedCount: 0 };
    }, cb);
  }

  find(query: any, options?: any, cb?: any) {
    ({ options, cb } = setOptionsAndCb(options, cb));
    const cursor = new FindCursor(this, query, options);
    if (cb) {
      return cb(undefined, cursor);
    }
    return cursor;
  }

  async findOne(query: any, options?: any, cb?: any) {
    ({ options, cb } = setOptionsAndCb(options, cb));
    return executeOperation(async (): Promise<any | null> => {
      const cursor = this.find(query, { ...options, limit: 1 });
      const res = await cursor.toArray();
      return res.length ? res[0] : null;
    }, cb);
  }

  async distinct(key: any, filter: any, options?: any, cb?: any) {
    ({ options, cb } = setOptionsAndCb(options, cb));
    return executeOperation(async (): Promise<any[]> => {
      const cursor = this.find(filter, { ...options });
      const res = await cursor.toArray();
      const list: string[] = [];
      if (res.length) {
        res.forEach((doc: any) => list.push(doc[key]));
      }
      return _.uniq(list);
    }, cb);
  }

  async countDocuments(query: any, options?: any, cb?: any) {
    logger.warn('Counting documents is supported on the client only, use with caution.');
    ({ options, cb } = setOptionsAndCb(options, cb));
    return executeOperation(async (): Promise<number> => {
      const cursor = this.find(query, options);
      return await cursor.count();
    }, cb);
  }

  // deprecated and overloaded

  async remove(query: any, options: any, cb?: any) {
    return await this.deleteMany(query, options, cb);
  }

  async insert(docs: any[], options?: any, cb?: any) {
    return await this.insertMany(docs, options, cb);
  }

  async findOneAndDelete(query: any, options: any, cb: any) {
    return executeOperation(async (): Promise<ModifyResult> => {
      let doc = await this.findOne(query, options);
      if (doc) {
        await this.httpClient.delete(`/${doc._id}`);
      }
      if (
        options?.new === true ||
        options?.returnOriginal === false ||
        options?.returnDocument === 'after'
      ) {
        doc = null;
      }
      return { value: doc, ok: 1 };
    }, cb);
  }

  async count(query: any, options: any, cb?: any) {
    return await this.countDocuments(query, options, cb);
  }

  async update(query: any, update: any, options: any, cb?: any) {
    return await this.updateMany(query, update, options, cb);
  }

  async findOneAndUpdate(query: any, update: any, options?: FindOneAndUpdateOptions, cb?: any) {
    return executeOperation(async (): Promise<ModifyResult> => {
      const res = { value: null, ok: 1 as const };
      let doc = await this.findOne(query, options);
      let docId = null;
      if (doc) {
        res.value = doc;
        docId = doc._id;
        await this.doUpdate(doc, update);
      } else if (options?.upsert) {
        const upsertedDoc = this._upsertDoc(query, update);
        await this.insertOne(upsertedDoc, options);
        docId = upsertedDoc._id;
      }
      if (options?.returnDocument === 'after') {
        res.value = await this.findOne({ _id: docId }, options);
      }
      return res;
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
    if (cb) {
      return cb(index);
    }
    return index;
  }

  /**
   *
   * @param index
   * @param options
   * @param cb
   * @returns any
   */
  async dropIndexes(cb?: any) {
    if (cb) {
      return cb(null);
    }
  }

  /**
   * Calculates the document to upsert based on query and filter
   *
   * @param filter
   * @param update
   * @returns any
   */
  _upsertDoc(filter: any, update: any) {
    const doc = { ...filter };
    const updateOperatorsToApply = new Set(['$set', '$setOnInsert', '$inc']);

    for (const key of Object.keys(update)) {
      if (key.charAt(0) === '$') {
        if (!updateOperatorsToApply.has(key)) {
          continue;
        }
        for (const operatorKey of Object.keys(update[key])) {
          mpath.set(operatorKey, update[key][operatorKey], doc);
        }
      } else {
        mpath.set(key, update[key], doc);
      }
    }

    return doc;
  }
}

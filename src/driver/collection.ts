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

import { default as MongooseCollection } from 'mongoose/lib/collection';
import {
  DeleteOneOptions,
  FindOneAndDeleteOptions,
  FindOneAndReplaceOptions,
  FindOneAndUpdateOptions,
  FindOneOptions,
  FindOptions,
  InsertManyOptions,
  UpdateManyOptions,
  UpdateOneOptions
} from '@/src/collections/options';
import { DeleteResult } from 'mongodb';

type NodeCallback<ResultType = any> = (err: Error | null, res: ResultType | null) => unknown;

export class Collection extends MongooseCollection {
  debugType = 'StargateMongooseCollection';

  constructor(name: string, conn: any, options: any) {
    super(name, conn, options);
    this.modelName = options.modelName;
    delete options.modelName;
    this._closed = false;
  }

  get collection() {
    return this.conn.db.collection(this.name);
  }

  /**
  * @deprecated
  */
  count(filter: Record<string, any>) {
    return this.collection.count(filter);
  }

  countDocuments(filter: Record<string, any>) {
    return this.collection.countDocuments(filter);
  }

  find(filter: Record<string, any>, options?: FindOptions, callback?: NodeCallback<Record<string, any>[]>) {
    const cursor = this.collection.find(filter, options);
    if (callback != null) {
      return callback(null, cursor);
    }
    return cursor;
  }

  findOne(filter: Record<string, any>, options?: FindOneOptions) {
    return this.collection.findOne(filter, options);
  }

  insertOne(doc: Record<string, any>) {
    return this.collection.insertOne(doc);
  }

  insertMany(documents: Record<string, any>[], options?: InsertManyOptions) {
    return this.collection.insertMany(documents, options);
  }

  findOneAndUpdate(filter: Record<string, any>, update: Record<string, any>, options?: FindOneAndUpdateOptions) {
    return this.collection.findOneAndUpdate(filter, update, options);
  }

  findOneAndDelete(filter: Record<string, any>, options?: FindOneAndDeleteOptions) {
    return this.collection.findOneAndDelete(filter, options);
  }

  findOneAndReplace(filter: Record<string, any>, newDoc: Record<string, any>, options?: FindOneAndReplaceOptions) {
    return this.collection.findOneAndReplace(filter, newDoc, options);
  }

  deleteMany(filter: Record<string, any>) {
    return this.collection.deleteMany(filter);
  }

  deleteOne(filter: Record<string, any>, options?: DeleteOneOptions, callback?: NodeCallback<DeleteResult>) {
    const promise = this.collection.deleteOne(filter, options);

    if (callback != null) {
      promise.then((res: DeleteResult) => callback(null, res), (err: Error) => callback(err, null));
    }

    return promise;
  }

  updateOne(filter: Record<string, any>, update: Record<string, any>, options?: UpdateOneOptions) {
    return this.collection.updateOne(filter, update, options);
  }

  updateMany(filter: Record<string, any>, update: Record<string, any>, options?: UpdateManyOptions) {
    return this.collection.updateMany(filter, update, options);
  }

  // No-ops
  bulkWrite(ops: any[], options?: any) {
    throw new Error('bulkWrite() Not Implemented');
  }

  aggregate(pipeline: any[], options?: any) {
    throw new OperationNotSupportedError('aggregate() Not Implemented');
  }

  bulkSave(docs: any[], options?: any) {
    throw new OperationNotSupportedError('bulkSave() Not Implemented');
  }

  cleanIndexes(options?: any) {
    throw new OperationNotSupportedError('cleanIndexes() Not Implemented');
  }

  listIndexes(options?: any) {
    throw new OperationNotSupportedError('listIndexes() Not Implemented');
  }

  createIndex(fieldOrSpec: any, options?: any) {
    throw new OperationNotSupportedError('createIndex() Not Implemented');
  }

  dropIndexes() {
    throw new OperationNotSupportedError('dropIndexes() Not Implemented');
  }

  watch() {
    throw new OperationNotSupportedError('watch() Not Implemented');
  }
}

export class OperationNotSupportedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OperationNotSupportedError';
  }
}
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
  FindOneAndDeleteOptions,
  FindOneAndReplaceOptions,
  FindOneAndUpdateOptions,
  FindOneOptions,
  FindOptions,
  InsertManyOptions,
  UpdateManyOptions,
  UpdateOneOptions
} from '@/src/collections/collection';

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

  countDocuments(filter: Record<string, any>) {
    return this.collection.countDocuments(filter);
  }

  find(filter: Record<string, any>, options?: FindOptions) {
    return this.collection.find(filter, options);
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

  deleteOne(filter: Record<string, any>) {
    return this.collection.deleteOne(filter);
  }

  updateOne(filter: Record<string, any>, update: Record<string, any>, options?: UpdateOneOptions) {
    return this.collection.updateOne(filter, update, options);
  }

  updateMany(filter: Record<string, any>, update: Record<string, any>, options?: UpdateManyOptions) {
    return this.collection.updateMany(filter, update, options);
  }

  dropIndexes() {
    return this.collection.dropIndexes();
  }

  createIndex(index: any, options?: any) {
    return this.collection.createIndex(index, options);
  }

  // No-ops
  bulkWrite(ops: any[], options?: any) {
    throw new Error('bulkWrite() Not Implemented');
  }

}
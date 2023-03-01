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

export class Collection extends MongooseCollection {
  debugType = 'StargateMongooseCollection';

  constructor(name: string, conn: any, options: any) {
    super(name, conn, options);
    this.Promise = options.Promise || Promise;
    this.modelName = options.modelName;
    delete options.modelName;
    this._closed = false;
  }

  get collection() {
    return this.conn.db.collection(this.name);
  }

  find(query: any, options?: any) {
    return this.collection.find(query, options);
  }

  findOne(query: any, options?: any) {
    return this.collection.findOne(query, options);
  }

  insertOne(doc: any, options?: any) {
    return this.collection.insertOne(doc, options);
  }

  insert(docs: any, options?: any) {
    return this.collection.insertMany(docs, options);
  }

  insertMany(docs: any, options?: any) {
    return this.collection.insertMany(docs, options);
  }

  findOneAndUpdate(query: any, update: any, options?: any) {
    return this.collection.findOneAndUpdate(query, update, options);
  }

  findOneAndDelete(query: any, options?: any) {
    return this.collection.findOneAndDelete(query, options);
  }

  findOneAndReplace(query: any, newDoc: any, options?: any) {
    return this.collection.findOneAndReplace(query, newDoc, options);
  }

  deleteMany(query: any, options?: any) {
    return this.collection.deleteMany(query, options);
  }

  deleteOne(query: any, options?: any) {
    return this.collection.deleteOne(query, options);
  }

  updateOne(query: any, update: any, options?: any) {
    return this.collection.updateOne(query, update, options);
  }

  updateMany(query: any, update: any, options?: any) {
    return this.collection.updateMany(query, update, options);
  }

  dropIndexes() {
    return this.collection.dropIndexes();
  }

  // No-ops
  bulkWrite(ops: any[], options?: any) {
    throw new Error('bulkWrite() Not Implemented');
  }

  createIndex(index: any, options?: any) {
    return this.collection.createIndex(index, options);
  }
}

//  Collection.prototype.ensureIndex = function() {
//   throw new Error('Collection#ensureIndex unimplemented by driver');
// };

// Collection.prototype.save = function() {
//   throw new Error('Collection#save unimplemented by driver');
// };

// Collection.prototype.getIndexes = function() {
//   throw new Error('Collection#getIndexes unimplemented by driver');
// };

// Collection.prototype.mapReduce = function() {
//   throw new Error('Collection#mapReduce unimplemented by driver');
// };

// Collection.prototype.watch = function() {
//   throw new Error('Collection#watch unimplemented by driver');
// };

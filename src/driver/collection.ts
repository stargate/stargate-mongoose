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

  find(query: any, options?: any, cb?: any) {
    return this.collection.find(query, options, cb);
  }

  findOne(query: any, options?: any, cb?: any) {
    return this.collection.findOne(query, options, cb);
  }

  insertOne(doc: any, options?: any, cb?: any) {
    return this.collection.insertOne(doc, options, cb);
  }

  insert(docs: any, options?: any, cb?: any) {
    return this.collection.insertMany(docs, options, cb);
  }

  insertMany(docs: any, options?: any, cb?: any) {
    return this.collection.insertMany(docs, options, cb);
  }

  findAndModify(query: any, update: any, options?: any, cb?: any) {
    return this.collection.updateMany(query, update, options, cb);
  }

  findOneAndUpdate(query: any, update: any, options?: any, cb?: any) {
    return this.collection.findOneAndUpdate(query, update, options, cb);
  }

  findOneAndDelete(query: any, options?: any, cb?: any) {
    return this.collection.findOneAndDelete(query, options, cb);
  }

  findOneAndReplace(query: any, newDoc: any, options?: any, cb?: any) {
    return this.collection.findOneAndReplace(query, newDoc, options, cb);
  }

  deleteMany(query: any, options?: any, cb?: any) {
    return this.collection.deleteMany(query, options, cb);
  }

  deleteOne(query: any, options?: any, cb?: any) {
    return this.collection.deleteOne(query, options, cb);
  }

  remove(query: any, options: any, cb: any) {
    return this.collection.remove(query, options, cb);
  }

  updateOne(query: any, update: any, options?: any, cb?: any) {
    return this.collection.updateOne(query, update, options, cb);
  }

  updateMany(query: any, update: any, options?: any, cb?: any) {
    return this.collection.updateMany(query, update, options, cb);
  }

  update(query: any, update: any, options?: any, cb?: any) {
    return this.collection.updateMany(query, update, options, cb);
  }

  dropIndexes(cb?: any) {
    return this.collection.dropIndexes(cb);
  }

  // No-ops
  bulkWrite(ops: any[], options?: any, cb?: any) {
    throw new Error('bulkWrite() Not Implemented');
  }

  createIndex(index: any, options?: any, cb?: any) {
    return this.collection.createIndex(index, options, cb);
  }
}

//  Collection.prototype.ensureIndex = function() {
//   throw new Error('Collection#ensureIndex unimplemented by driver');
// };

// Collection.prototype.save = function() {
//   throw new Error('Collection#save unimplemented by driver');
// };

// Collection.prototype.update = function() {
//   throw new Error('Collection#update unimplemented by driver');
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

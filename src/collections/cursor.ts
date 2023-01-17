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
import { Collection } from './collection';
import { logger } from '@/src/logger';
import { formatQuery, setOptionsAndCb, executeOperation, QueryOptions } from './utils';

//this is as in mongo shell https://www.mongodb.com/docs/v5.0/tutorial/configure-mongo-shell/#change-the-mongo-shell-batch-size
const DEFAULT_PAGE_SIZE = 20;

interface ResultCallback {
  (err: Error | undefined, res: Array<any>): void;
}

export class FindCursor {
  collection: Collection;
  query: any;
  projection: any;
  options: any;
  documents: Record<string, any>[] = [];
  status: string = 'uninitialized';
  nextPageState?: string;
  limit: number;

  batch: Record<string, any>[] = [];
  batchSize: number;
  batchIndex: number;
  totalNumFetched: number;
  exhausted: boolean;

  /**
   *
   * @param collection
   * @param query
   * @param options
   */
  constructor(collection: any, query: any, projection?: any, options?: any) {
    this.collection = collection;
    this.query = formatQuery(query, options);
    this.projection = projection;
    this.options = options;
    this.limit = options?.limit || Infinity;
    this.status = 'initialized';
    this.exhausted = false;

    // Load this many documents at a time in `this.batch` when using next()
    this.batchSize = options?.pageSize || DEFAULT_PAGE_SIZE;
    // Current position in batch
    this.batchIndex = 0;
    // Total number of documents returned, should be < limit
    this.totalNumFetched = 0;
  }

  /**
   *
   * @returns void
   */
  private async getAll() {
    if (this.status === 'executed' || this.status === 'executing') {
      return;
    }

    for (let doc = await this.next(); doc != null; doc = await this.next()) {
      this.documents.push(doc);
    }

    return this.documents;
  }

  /**
   *
   * @param cb
   * @returns Promise
   */
  async toArray(cb?: ResultCallback): Promise<Array<any>> {
    return executeOperation(async () => {
      await this.getAll();
      return this.documents;
    }, cb);
  }

  /**
   *
   * @param iterator
   * @param cb
   */

  async next(cb?: any): Promise<any> {
    return executeOperation(async () => {
      if (this.batchIndex < this.batch.length) {
        const doc = this.batch[this.batchIndex++];
        if (cb != null) {
          return cb(null, doc);
        }
  
        return doc;
      }
  
      if (this.exhausted) {
        this.status = 'executed';
      }
  
      if (this.status === 'executed') {
        if (cb != null) {
          return cb(null, null);
        }
  
        return null;
      }
  
      this.status = 'executing';
  
      await this._getMore();
  
      const doc = this.batch[this.batchIndex++] || null;
      if (cb != null) {
        return cb(null, doc);
      }
  
      return doc;
    }, cb);
  }

  /*!
   * ignore
   */

  async _getMore() {
    const batchSize = Math.min(this.batchSize, this.limit - this.totalNumFetched);
    const command: {
      find: {
        filter?: string | undefined | null,
        projection?: string | undefined | null,
        options?: QueryOptions | undefined | null
      }
    } = {
      find: {
        filter: this.query,
        projection: this.projection,
      }
    };
    const options = {} as QueryOptions;
    if (this.batchSize != DEFAULT_PAGE_SIZE) { 
      options.pageSize = batchSize;
    }
    if (this.limit != Infinity) { 
      options.limit = this.limit;
    }
    if (this.nextPageState) {
      options.pageState = this.nextPageState;
    }
    if(Object.keys(options).length > 0){
      command.find.options = options;
    }
    const resp = await this.collection.httpClient.executeCommand(command);
    if (resp.errors && resp.errors.length > 0) {
      logger.error(resp.errors);
    }
    this.nextPageState = resp.pageState;
    if (this.nextPageState == null) {
      this.exhausted = true;
    }
    this.batch = _.keys(resp.data.docs).map(i => resp.data.docs[i]);
    this.batchIndex = 0;
    this.totalNumFetched += batchSize;
    if (this.totalNumFetched >= this.limit) {
      this.exhausted = true;
      delete this.nextPageState;
    }
  }

  /**
   *
   * @param iterator
   * @param cb
   */
  async forEach(iterator: any, cb?: any) {
    return executeOperation(async () => {
      for (let doc = await this.next(); doc != null; doc = await this.next()) {
        iterator(doc);
      }
    }, cb);
  }

  /**
   *
   * @param options
   * @param cb
   * @returns Promise<number>
   */
  async count(options?: any, cb?: any) {
    ({ options, cb } = setOptionsAndCb(options, cb));
    return executeOperation(async () => {
      await this.getAll();
      return this.documents.length;
    }, cb);
  }

  // NOOPS and unimplemented

  /**
   *
   * @param options
   */
  stream(options?: any) {
    throw new Error('Streaming cursors are not supported');
  }
}

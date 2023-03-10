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
import { executeOperation, QueryOptions } from './utils';

const DEFAULT_PAGE_SIZE = 20;

interface ResultCallback {
  (err: Error | undefined, res: Array<any>): void;
}

export class FindCursor {
  collection: Collection;
  filter: any;
  options: any;
  documents: Record<string, any>[] = [];
  status: string = 'uninitialized';
  pageState?: string;
  limit: number;

  page: Record<string, any>[] = [];
  pageSize: number;
  pageIndex: number;
  totalNumFetched: number;
  exhausted: boolean;

  /**
   *
   * @param collection
   * @param filter
   * @param options
   */
  constructor(collection: Collection, filter: any, options?: any) {
    this.collection = collection;
    this.filter = filter;
    this.options = options;
    this.limit = options?.limit || Infinity;
    this.status = 'initialized';
    this.exhausted = false;

    // Load this many documents at a time in `this.batch` when using next()
    this.pageSize = options?.pageSize || DEFAULT_PAGE_SIZE;
    // Current position in batch
    this.pageIndex = 0;
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
   * @returns Promise
   */
  async toArray(): Promise<any[]> {
    await this.getAll();
    return this.documents;
  }

  /**
   * @returns Promise
   */

  async next(): Promise<any> {
    return executeOperation(async () => {
      if (this.pageIndex < this.page.length) {
        const doc = this.page[this.pageIndex++];
  
        return doc;
      }
  
      if (this.exhausted) {
        this.status = 'executed';
      }
  
      if (this.status === 'executed') {  
        return null;
      }
  
      this.status = 'executing';
  
      await this._getMore();
  
      const doc = this.page[this.pageIndex++] || null;
  
      return doc;
    });
  }

  /*!
   * ignore
   */

  async _getMore() {
    const pageSize = Math.min(this.pageSize, this.limit - this.totalNumFetched);
    const command: {
      find: {
        filter?: string | undefined | null,
        projection?: string | undefined | null,
        options?: QueryOptions | undefined | null
      }
    } = {
      find: {
        filter: this.filter
      }
    };
    // Workaround for Automattic/mongoose#13050
    if (this.options && this.options.projection && Object.keys(this.options.projection).length > 0) {
      command.find.projection = this.options.projection;
    }
    const options = {} as QueryOptions;
    if (this.pageSize != DEFAULT_PAGE_SIZE) { 
      options.pageSize = pageSize;
    }
    if (this.limit != Infinity) { 
      options.limit = this.limit;
    }
    if (this.pageState) {
      options.pageState = this.pageState;
    }
    if(Object.keys(options).length > 0){
      command.find.options = options;
    }
    const resp = await this.collection.httpClient.executeCommand(command);
    this.pageState = resp.pageState;
    if (this.pageState == null) {
      this.exhausted = true;
    }
    this.page = _.keys(resp.data.docs).map(i => resp.data.docs[i]);
    this.pageIndex = 0;
    this.totalNumFetched += pageSize;
    if (this.totalNumFetched >= this.limit) {
      this.exhausted = true;
      delete this.pageState;
    }
  }

  /**
   *
   * @param iterator
   */
  async forEach(iterator: any) {
    return executeOperation(async () => {
      for (let doc = await this.next(); doc != null; doc = await this.next()) {
        iterator(doc);
      }
    });
  }

  /**
   *
   * @param options
   * @returns Promise<number>
   */
  async count(options?: any) {
    return executeOperation(async () => {
      await this.getAll();
      return this.documents.length;
    });
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

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

import { HTTPClient } from '@/src/client';
import { Collection } from './collection';
import { executeOperation } from './utils';
import _ from 'lodash';

interface CollectionCallback {
  (err: Error | undefined, res: undefined): void;
}

export class Db {
  httpClient: HTTPClient;
  name: string;

  /**
   *
   * @param astraClient
   * @param name
   */
  constructor(httpClient: HTTPClient, name: string) {
    if (!name) {
      throw new Error('Db: name is required');
    }
    // use a clone of the underlying http client to support multiple db's from a single connection
    this.httpClient = _.cloneDeep(httpClient);
    this.httpClient.baseUrl = `${this.httpClient.baseUrl}${this.httpClient.baseApiPath}/${name}`;
    this.name = name;
  }

  /**
   *
   * @param collectionName
   * @returns Collection
   */
  collection(collectionName: string): Collection {
    if (!collectionName) {
      throw new Error('Db: collection name is required');
    }
    return new Collection(this.httpClient, collectionName);
  }

  /**
   *
   * @param collectionName
   * @param options
   * @param cb
   * @returns Promise
   */
  async createCollection(collectionName: string, options?: any, cb?: CollectionCallback) {
    return executeOperation(async () => {
      const data = await this.httpClient
        .post('/collections', {
          name: collectionName
        })
        .then(res => res.data)
        .catch(err => {
          if (err?.response?.status === 409) {
            return null; // Collection already exists
          }
          throw err;
        });
      return data;
    }, cb);
  }

  /**
   *
   * @param collectionName
   * @param cb
   * @returns Promise
   */
  async dropCollection(collectionName: string, cb?: CollectionCallback) {
    return executeOperation(async () => {
      const data = await this.httpClient.delete(`/collections/${collectionName}`)
        .then(res => res.data)
        .catch(err => {
          if (err?.response?.status === 404) {
            return null; // No such collection
          }
          throw err;
        });
      return data;
    }, cb);
  }

  // NOOPS and unimplemented

  /**
   *
   * @param cb
   * @returns Promise
   */
  dropDatabase(cb?: CollectionCallback) {
    if (cb != null) {
      return cb(new Error('dropDatabase not implemented'), undefined);
    }
    throw new Error('dropDatabase not implemented');
  }
}

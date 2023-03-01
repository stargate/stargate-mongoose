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
   * @returns Promise
   */
  async createCollection(collectionName: string, options?: any) {
    return executeOperation(async () => {
      const command = {
        createCollection: {
          name: collectionName,
          options: options
        }
      };
      return await this.httpClient.executeCommand(command);
    });
}

  /**
   *
   * @param collectionName
   * @returns Promise
   */
  async dropCollection(collectionName: string) {
    const command = {
      deleteCollection: {
        name: collectionName
      }
    };
    return await this.httpClient.executeCommand(command);
  }

  // NOOPS and unimplemented

  /**
   *
   * @returns Promise
   */
  dropDatabase() {
    throw new Error('dropDatabase not implemented');
  }
}

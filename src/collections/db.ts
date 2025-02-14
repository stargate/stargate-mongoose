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

import { HTTPClient } from '../client';
import {
    CreateCollectionOptions,
    createCollectionOptionsKeys,
    ListCollectionOptions,
    listCollectionOptionsKeys,
    retainNoOptions
} from './options';
import { Collection } from './collection';
import { executeOperation, createNamespace, dropNamespace } from './utils';

export class Db {
    rootHttpClient: HTTPClient;
    httpClient: HTTPClient;
    name: string;
    collections: Map<string, Collection>;
    httpBasePath: string;

    constructor(httpClient: HTTPClient, name: string) {
        if (!name) {
            throw new Error('Db: name is required');
        }
        this.rootHttpClient = httpClient;
        // use a clone of the underlying http client to support multiple db's from a single connection
        this.httpClient = httpClient;
        this.name = name;
        this.collections = new Map<string, Collection>();
        this.httpBasePath = `/${name}`;
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
        const collection = this.collections.get(collectionName);
        if (collection != null) {
            return collection;
        }
        const newCollection = new Collection(this, collectionName);
        this.collections.set(collectionName, newCollection);
        return newCollection;
    }

    /**
   *
   * @param collectionName
   * @param options
   * @returns Promise
   */
    async createCollection(collectionName: string, options?: CreateCollectionOptions) {
        if (collectionName == null) {
            throw new TypeError(`Must specify a collection name when calling createCollection, got ${collectionName}`);
        }
        return executeOperation(async () => {
            const command = {
                createCollection: {
                    name: collectionName,
                    ...(options == null ? {} : { options })
                }
            };
            return await this.httpClient.executeCommandWithUrl(
                this.httpBasePath,
                command,
                createCollectionOptionsKeys
            );
        });
    }

    /**
   *
   * @param collectionName
   * @returns APIResponse
   */
    async dropCollection(collectionName: string) {
        if (collectionName == null) {
            throw new TypeError(`Must specify a collection name when calling dropCollection, got ${collectionName}`);
        }
        const command = {
            deleteCollection: {
                name: collectionName
            }
        };
        return await this.httpClient.executeCommandWithUrl(
            this.httpBasePath,
            command,
            retainNoOptions
        );
    }

    /**
   *
   * @returns Promise
   */
    async dropDatabase() {
        if (this.rootHttpClient.isAstra) {
            throw new StargateAstraError('Cannot drop database in Astra. Please use the Astra UI to drop the database.');
        }
        return await dropNamespace(this.rootHttpClient, this.name);
    }

    /**
   *
   * @returns Promise
   */
    async createDatabase() {
        return await createNamespace(this.rootHttpClient, this.name);
    }

    async findCollections(options?: ListCollectionOptions) {
        return executeOperation(async () => {
            const command = {
                findCollections: options != null ? { options } : {}
            };
            return await this.httpClient.executeCommandWithUrl(
                '/' + this.name,
                command,
                listCollectionOptionsKeys
            );
        });
    }

    async runCommand(command: Record<string, unknown>) {
        return executeOperation(async () => {
            return await this.httpClient.executeCommandWithUrl(
                '/' + this.name,
                command,
                retainNoOptions
            );
        });
    }
}

export class StargateAstraError extends Error {
    message: string;
    constructor(message: string) {
        super(message);
        this.message = message;
    }
}

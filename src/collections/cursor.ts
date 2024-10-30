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

import { Collection } from './collection';
import { executeOperation, omit } from './utils';
import {findInternalOptionsKeys, FindOptions, FindOptionsInternal} from './options';

export class FindCursor {
    collection: Collection;
    filter: Record<string, unknown>;
    options: FindOptions;
    documents: Record<string, unknown>[] = [];
    status = 'uninitialized';
    nextPageState?: string;
    limit: number;
    includeSortVector?: boolean;

    page: Record<string, unknown>[] = [];
    pageIndex: number;
    exhausted: boolean;
    sortVector?: number[];

    constructor(collection: Collection, filter: Record<string, unknown>, options?: FindOptions) {
        this.collection = collection;
        this.filter = filter;
        this.options = options ?? {};

        const isOverPageSizeLimit = this.options.sort &&
            !('$vector' in this.options.sort) &&
            !('$vectorize' in this.options.sort) &&
            (this.options.limit == null || this.options.limit > 20);
        if (isOverPageSizeLimit) {
            throw new Error('Cannot set sort option without limit <= 20, Data API can currently only return 20 documents with sort');
        }

        this.limit = options?.limit || Infinity;
        this.status = 'initialized';
        this.exhausted = false;
        this.includeSortVector = options?.includeSortVector;

        // Current position in batch
        this.pageIndex = 0;
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

    async getSortVector(): Promise<number[] | undefined> {
        if (!this.includeSortVector) {
            return undefined;
        }
        if (this.status === 'initialized') {
            await this._getMore();
        }
        return this.sortVector;
    }

    /**
   *
   * @returns Record<string, unknown>[]
   */
    async toArray(): Promise<Record<string, unknown>[]> {
        await this.getAll();
        return this.documents;
    }

    /**
   * @returns Promise
   */
    async next(): Promise<Record<string, unknown>> {
        return executeOperation(async () => {
            if (this.pageIndex < this.page.length) {
                return this.page[this.pageIndex++];
            }

            if (this.exhausted) {
                this.status = 'executed';
            }

            if (this.status === 'executed') {
                return null;
            }

            this.status = 'executing';

            await this._getMore();

            return this.page[this.pageIndex++] || null;
        });
    }

    async _getMore() {
        const options: FindOptionsInternal = {};
        if (this.limit != Infinity) {
            options.limit = this.limit;
        }
        if (this.nextPageState) {
            options.pagingState = this.nextPageState;
        }
        if (this.options?.skip) {
            options.skip = this.options.skip;
        }
        if (this.options.includeSimilarity) {
            options.includeSimilarity = this.options.includeSimilarity;
        }
        if (this.includeSortVector) {
            options.includeSortVector = this.includeSortVector;
        }

        const cleanOptions = omit(options, ['sort', 'projection']) ?? {};

        const command = {
            find: {
                filter: this.filter,
                ...(this.options?.sort != null ? { sort: this.options?.sort } : {}),
                ...(this.options?.projection != null ? { projection: this.options?.projection } : {}),
                ...(Object.keys(cleanOptions).length > 0 ? { options: cleanOptions } : {})
            }
        };
        
        const resp = await this.collection.httpClient.executeCommandWithUrl(
            this.collection.httpBasePath,
            command,
            findInternalOptionsKeys
        );
        this.nextPageState = resp.data.nextPageState;
        if (this.nextPageState == null) {
            this.exhausted = true;
        }
        this.page = resp.data.documents;
        if (this.includeSortVector) {
            this.sortVector = resp.status.sortVector;
        }
        this.pageIndex = 0;    
    }

    /**
   *
   * @param iterator
   */
    async forEach(iterator: (doc: Record<string, unknown>) => void) {
        return executeOperation(async () => {
            for (let doc = await this.next(); doc != null; doc = await this.next()) {
                iterator(doc);
            }
        });
    }

    /**
     *
     * @returns Promise<number>
     * @param options
     */
    async count(_options?: Record<string, unknown>) {
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
    stream(_options?: Record<string, unknown>) {
        throw new Error('Streaming cursors are not supported');
    }
}

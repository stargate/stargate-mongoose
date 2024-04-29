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

import { IndexingOptions, VectorOptions } from './collections';

export * as collections from './collections';
export * as driver from './driver';
export * as client from './client';
export * as logger from './logger';

declare module 'mongodb' {
  interface CreateCollectionOptions {
    vector?: VectorOptions;
    indexing?: IndexingOptions;
  }
}

declare module 'mongoose' {
  interface ConnectOptions {
    isAstra?: boolean;
    logSkippedOptions?: boolean;
  }

  function setDriver<T = Mongoose>(driver: any): T;
}

import { createStargateUri, createAstraUri } from './collections';
export { createStargateUri, createAstraUri };
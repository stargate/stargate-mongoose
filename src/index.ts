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

export * as collections from './collections';
export * as driver from './driver';
export * as client from './client';
export * as logger from './logger';

import { Collection, Connection } from './driver';
import { Model, Mongoose } from 'mongoose';

declare module 'mongoose' {
  interface ConnectOptions {
    isAstra?: boolean;
    logSkippedOptions?: boolean;
    authUrl?: string;
  }

  export function setDriver<TOverrides>(driver: any): Omit<Mongoose, keyof TOverrides> & TOverrides;
}

export interface StargateMongooseDriverOverrides {
  mongo: never;
  connection: Connection;
  connections: Connection[];
}
export type StargateMongoose = Omit<Mongoose, keyof StargateMongooseDriverOverrides> & StargateMongooseDriverOverrides;

import { createStargateUri, createAstraUri } from './collections';
export { createStargateUri, createAstraUri };
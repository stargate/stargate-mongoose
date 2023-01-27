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

import { Client } from '@/src/collections/client';
import { Collection } from './collection';
import { default as MongooseConnection } from 'mongoose/lib/connection';
import STATES from 'mongoose/lib/connectionstate';
import _ from 'lodash';
import { executeOperation } from '../collections/utils';

export class Connection extends MongooseConnection {
  debugType = 'StargateMongooseConnection';
  initialConnection: Promise<Connection> | null = null;

  constructor(base: any) {
    super(base);
  }

  _waitForClient() {
    return new Promise<void>((resolve, reject) => {
      if (
        (this.readyState === STATES.connecting || this.readyState === STATES.disconnected) &&
        this._shouldBufferCommands()
      ) {
        this._queue.push({ fn: resolve });
      } else if (this.readyState === STATES.disconnected && this.db == null) {
        reject(new Error('Connection is disconnected'));
      } else {
        resolve();
      }
    });
  }

  collection(name: string, options: any) {
    if (!(name in this.collections)) {
      this.collections[name] = new Collection(name, this, options);
    }
    return super.collection(name, options);
  }

  async createCollection(name: string, options: any, callback: any) {
    return executeOperation(async () => {
      await this._waitForClient();
      const db = this.client.db();
      return db.createCollection(name, options, callback);
    }, callback);
  }

  async dropCollection(name: string, callback: any) {
    return executeOperation(async () => {
      await this._waitForClient();
      const db = this.client.db();
      return db.dropCollection(name);
    }, callback);
  }

  async openUri(uri: string, options: any, callback: any) {
    if (typeof options === 'function') {
      callback = options;
      options = null;
    }

    let resolveInitialConnection: Function;
    let rejectInitialConnection: Function;
    this.initialConnection = new Promise((resolve, reject) => {
      resolveInitialConnection = resolve;
      rejectInitialConnection = reject;
    });

    try {
      this._connectionString = uri;
      this.readyState = STATES.connecting;
      this._closeCalled = false;

      for (const model of Object.values(this.models)) {
        // @ts-ignore
        model.init(() => {});
      }

      const client = await Client.connect(uri);
      this.client = client;
      this.db = client.db();

      this.readyState = STATES.connected;

      this.onOpen();

      // @ts-ignore
      resolveInitialConnection(this);

      if (callback != null) {
        setImmediate(() => callback(null));
        return null;
      }
    } catch (err) {
      this.readyState = STATES.disconnected;

      // @ts-ignore
      rejectInitialConnection(err);

      if (callback != null) {
        setImmediate(() => callback(null));
        return null;
      }
      throw err;
    }

    return this;
  }

  asPromise() {
    return this.initialConnection;
  }

  /**
   *
   * @param cb
   * @returns Client
   */
  doClose(force?: boolean, cb?: (err: Error | undefined) => void) {
    if (cb) {
      cb(undefined);
    }
    return this;
  }
}
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

import mongoose from 'mongoose';
import { driver } from '../src';
import type { Connection } from '../src/driver';

void main().catch(err => {
    console.error(err);
    process.exitCode = 1;
});

async function main() {
    const uri = process.env.DATA_API_URI;
    if (!uri) {
        throw new Error('DATA_API_URI must be set');
    }

    mongoose.setDriver(driver);
    await mongoose.connect(uri, {
        isAstra: false,
        username: process.env.DATA_API_USERNAME,
        password: process.env.DATA_API_PASSWORD
    });

    try {
        const connection = mongoose.connection as unknown as Connection;
        if (!connection.keyspaceName) {
            throw new Error('Connection keyspace name is required');
        }

        const { databases } = await connection.listDatabases();
        if (!databases.some(database => database.name === connection.keyspaceName)) {
            console.log(`Creating keyspace ${connection.keyspaceName}`);
            await connection.createKeyspace(connection.keyspaceName);
        }

        const collectionName = '__mongoose_warmup__';
        console.log(`Creating temporary collection ${collectionName}`);

        try {
            await connection.createCollection(collectionName);
        } catch (err) {
            if (!isAlreadyExistsError(err)) {
                throw err;
            }
        }

        const collection = connection.db!.collection(collectionName, {});
        await retryNotEnoughReplicas(async () => {
            await collection.insertOne({ ping: true, ts: new Date() });
            await collection.deleteMany({});
        });

        await collection.drop();
        console.log('Warm-up successful');
    } finally {
        await mongoose.disconnect();
    }
}

async function retryNotEnoughReplicas(fn: () => Promise<void>) {
    let lastError: unknown;

    for (let attempt = 1; attempt <= 10; ++attempt) {
        try {
            await fn();
            return;
        } catch (err) {
            if (!isNotEnoughReplicasError(err)) {
                throw err;
            }

            lastError = err;
            const delay = Math.pow(2, attempt) * 100;
            console.warn(`"Not enough replicas available for query" (attempt ${attempt}), retrying in ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }

    throw lastError;
}

function isAlreadyExistsError(err: unknown): err is Error {
    return err instanceof Error && /already exists/i.test(err.message);
}

function isNotEnoughReplicasError(err: unknown): err is Error {
    return err instanceof Error && err.message.includes('Not enough replicas available for query');
}

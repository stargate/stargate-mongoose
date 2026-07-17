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
        const collections = await connection.listCollections({ nameOnly: true });
        for (const collectionName of collections) {
            console.log(`Dropping collection ${collectionName}`);
            await connection.dropCollection(collectionName);
        }

        const tables = await connection.listTables({ nameOnly: true });
        for (const tableName of tables) {
            console.log(`Dropping table ${tableName}`);
            await connection.dropTable(tableName);
        }

        console.log(`Dropped ${collections.length} collections and ${tables.length} tables`);
    } finally {
        await mongoose.disconnect();
    }
}

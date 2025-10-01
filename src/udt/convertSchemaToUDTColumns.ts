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

import { TableScalarColumnDefinition, LooseCreateTypeFieldDefinition } from '@datastax/astra-db-ts';
import { Schema } from 'mongoose';
import convertSchemaToColumns from '../convertSchemaToColumns';
import { AstraMongooseError } from '../astraMongooseError';

/**
 * Given a Mongoose schema, create an equivalent Data API table definition for use with `createTable()`
 */
export default function convertSchemaToUDTColumns(schema: Schema, udtName?: string): Record<string, TableScalarColumnDefinition | LooseCreateTypeFieldDefinition> {
    const schemaColumns = convertSchemaToColumns(schema, udtName);
    const columns: Record<string, TableScalarColumnDefinition | LooseCreateTypeFieldDefinition> = {};

    for (const [name, column] of Object.entries(schemaColumns)) {
        // Inline disallowed types so TypeScript can correctly check types
        if (
            typeof column === 'object' &&
            (column?.type === 'map' ||
              column?.type === 'list' ||
              column?.type === 'set' ||
              column?.type === 'vector' ||
              column?.type === 'userDefined')
        ) {
            throw new AstraMongooseError(`${column.type} is not supported for UDT columns`);
        }
        columns[name] = column;
    }

    return columns;
}

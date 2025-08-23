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

import { AstraMongooseError } from '../astraMongooseError';
import { CreateTableColumnDefinitions } from '@datastax/astra-db-ts';
import { Schema } from 'mongoose';
import convertSchemaToColumns from '../convertSchemaToColumns';
import getUDTNameFromSchemaType from './getUDTNameFromSchemaType';

interface UDTDefinition { name: string; definition: CreateTableColumnDefinitions; }

/**
 * Given a Mongoose schema, get the definitions of all the UDTs used by this schema.
 * Used to create all UDTs required by the schema before creating the table.
 */
export default function udtDefinitionsFromSchema(schema: Schema): Record<string, UDTDefinition> {
    const result: Record<string, UDTDefinition> = {};

    for (const path of Object.keys(schema.paths)) {
        const schemaType = schema.paths[path];
        const udtName = getUDTNameFromSchemaType(schemaType);
        if (!udtName) {
            continue;
        }
        const udtSchema = schemaType.schema ?? schemaType.getEmbeddedSchemaType()?.schema;
        if (!udtSchema) {
            throw new AstraMongooseError(`Schema type ${path} is not a valid schema`);
        }
        const definition = convertSchemaToColumns(udtSchema);
        if (result[udtName]) {
            if (JSON.stringify(result[udtName].definition) !== JSON.stringify(definition)) {
                throw new AstraMongooseError(`Conflicting definition for UDT ${udtName} at ${path}`);
            }
            continue;
        }

        result[udtName] = { name: udtName, definition };
    }

    return result;
}

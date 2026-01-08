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
import { CreateTypeDefinition } from '@datastax/astra-db-ts';
import { Schema } from 'mongoose';
import convertSchemaToUDTColumns from './convertSchemaToUDTColumns';
import getUDTNameFromSchemaType from './getUDTNameFromSchemaType';

/**
 * Given a Mongoose schema, get the definitions of all the UDTs used by this schema.
 * Used to create all UDTs required by the schema before creating the table.
 */
export default function udtDefinitionsFromSchema(schema: Schema): Record<string, CreateTypeDefinition> {
    const result: Record<string, CreateTypeDefinition> = {};

    for (const path of Object.keys(schema.paths)) {
        const schemaType = schema.paths[path];
        const udtName = getUDTNameFromSchemaType(schemaType);
        if (!udtName) {
            continue;
        }
        const udtSchema = schemaType.schema ?? schemaType.getEmbeddedSchemaType()?.schema;
        if (!udtSchema) {
            throw new AstraMongooseError(`Path ${path} cannot store a UDT, must be a subdocument, document array, or map.`);
        }
        const fields = convertSchemaToUDTColumns(udtSchema);
        if (result[udtName]) {
            // Currently do not support multiple definitions for the same UDT no matter how slight
            // the difference. `JSON.stringify()` is used for deep equality comparison to ensure we can
            // return an AstraMongooseError. In the future we may consider supporting the case where one UDT
            // has a subset of the other's columns. We may also consider using assert.deepStrictEqual() here
            // to provide a more detailed error message.
            if (JSON.stringify(result[udtName].fields) !== JSON.stringify(fields)) {
                throw new AstraMongooseError(`Conflicting definition for UDT ${udtName} at ${path}`);
            }
            continue;
        }

        result[udtName] = { fields };
    }

    return result;
}

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

import { SchemaType } from 'mongoose';

export default function getUDTNameFromSchemaType(schemaType: SchemaType): string | null {
    if (schemaType.instance === 'Array' && schemaType.schema) {
        // @ts-expect-error Mongoose schemas don't have options property in TS
        return schemaType.schemaOptions?.udtName ?? schemaType.schema?.options?.udtName ?? null;
    }

    if (schemaType.options?.udtName) {
        return schemaType.options.udtName;
    }
    // `new Schema({}, { udtName })`
    if (schemaType.schema?.options?.udtName) {
        return schemaType.schema.options.udtName;
    }

    const embeddedSchemaType = schemaType.getEmbeddedSchemaType();
    if (embeddedSchemaType?.options?.udtName) {
        return embeddedSchemaType?.options?.udtName;
    }
    if (embeddedSchemaType?.schema?.options?.udtName) {
        return embeddedSchemaType?.schema?.options?.udtName;
    }
    return null;
}

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

import { CreateTableColumnDefinitions, ListTableColumnDefinitions } from '@datastax/astra-db-ts';

export default function compareTableDefinitions(
    def1: CreateTableColumnDefinitions | ListTableColumnDefinitions,
    def2: CreateTableColumnDefinitions | ListTableColumnDefinitions
) {
    // Get the keys of both definitions
    const keys1 = Object.keys(def1);
    const keys2 = Object.keys(def2);

    // Check if both have the same keys
    if (keys1.length !== keys2.length) return false;
    for (const key of keys1) {
        if (!keys2.includes(key)) return false;
    }

    // Check that each key has the same type and dimension (if applicable)
    for (const key of keys1) {
        const field1 = def1[key];
        const field2 = def2[key];

        if (!field2) return false;
        if (typeof field1 !== 'object' || typeof field2 !== 'object') {
            throw new Error('Cannot compare loose mode definitions');
        }

        if (field1.type !== field2.type) return false;

        // If type is 'vector', check dimension. Need to check both are vectors for TypeScript
        if (field1.type === 'vector' && field2.type === 'vector') {
            if (field1.dimension !== field2.dimension) return false;
        }
    }

    return true;
}

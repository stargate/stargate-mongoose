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

import type { Schema, SchemaType } from 'mongoose';
import { AstraMongooseError } from '../astraMongooseError';
import { CollectionFindAndRerankOptions } from '@datastax/astra-db-ts';
import { Collection } from './collection';

/**
 * Mongoose plugin to handle adding `$vector` to the projection by default if `$vector` has `select: true`.
 * Because `$vector` is deselected by default, this plugin makes it possible for the user to include `$vector`
 * by default from their schema.
 *
 * You do not need to call this function directly. Mongoose applies this plugin automatically when you call `setDriver()`.
 */

export function handleVectorFieldsProjection(schema: Schema) {
    schema.pre(['find', 'findOne', 'findOneAndUpdate', 'findOneAndReplace', 'findOneAndDelete'], function() {
        const projection = this.projection();
        const $vector = this.model.schema.paths['$vector'];
        const $vectorize = this.model.schema.paths['$vectorize'];

        if (projection != null) {
            if (Object.keys(projection).length === 1 && projection['*']) {
                // If schema has `select: true` for $vector or $vectorize, select: '*' will break with
                // "wildcard ('*') only allowed as the only root-level path" error because Mongoose will
                // add `$vector: 1` or `$vectorize: 1`. As a workaround, replace '*: 1' with including
                // vector and vectorize.
                if ($vector?.options?.select || $vectorize?.options?.select) {
                    this.projection({ $vector: 1, $vectorize: 1 });
                }
                return;
            }
        }
        if ($vector?.options?.select && projectionDoesNotHaveProperty(projection, '$vector')) {
            this.projection({ ...projection, $vector: 1 });
        }
        if ($vectorize?.options?.select && projectionDoesNotHaveProperty(projection, '$vectorize')) {
            this.projection({ ...projection, $vectorize: 1 });
        }
    });
}

function projectionDoesNotHaveProperty(projection: Record<string, unknown>, property: string) {
    return projection == null || !(property in projection);
}

/**
 * Mongoose plugin to validate arrays of numbers that have a `dimension` property. Ensure that the array
 * is either nullish or has a length equal to the dimension.
 *
 * You do not need to call this function directly. Mongoose applies this plugin automatically when you call `setDriver()`.
 */

export function addVectorDimensionValidator(schema: Schema) {
    schema.eachPath((_path: string, schemaType: SchemaType) => {
        const isValidArray = schemaType.instance === 'Array' || schemaType.instance === 'Vectorize';
        if (isValidArray && schemaType.getEmbeddedSchemaType()?.instance === 'Number' && typeof schemaType.options?.dimension === 'number') {
            const dimension = schemaType.options?.dimension;
            if (dimension <= 0) {
                throw new AstraMongooseError('`dimension` option for vectorize paths must be a positive integer, got: ' + dimension, {
                    options: schemaType.options,
                    path: schemaType.path,
                });
            }
            schemaType.validate((value: number[] | string | null) => {
                if (value == null) {
                    return true;
                }
                if (typeof value === 'string') {
                    return true;
                }
                return value.length === dimension;
            }, `Array must be of length ${dimension}, got value {VALUE}`);
        }
    });
}

export function findAndRerankStatic(schema: Schema) {
    schema.static('findAndRerank', async function findAndRerank(filter: Record<string, unknown>, options?: CollectionFindAndRerankOptions) {
        const collection = this.collection as unknown as Collection;
        const result = await collection.findAndRerank(filter, options);
        return result.toArray();
    });
}

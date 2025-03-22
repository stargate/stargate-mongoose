"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleVectorFieldsProjection = handleVectorFieldsProjection;
exports.addVectorDimensionValidator = addVectorDimensionValidator;
/**
 * Mongoose plugin to handle adding `$vector` to the projection by default if `$vector` has `select: true`.
 * Because `$vector` is deselected by default, this plugin makes it possible for the user to include `$vector`
 * by default from their schema.
 */
function handleVectorFieldsProjection(schema) {
    schema.pre(['find', 'findOne', 'findOneAndUpdate', 'findOneAndReplace', 'findOneAndDelete'], function () {
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
function projectionDoesNotHaveProperty(projection, property) {
    return projection == null || !(property in projection);
}
/**
 * Mongoose plugin to validate arrays of numbers that have a `dimension` property. Ensure that the array
 * is either nullish or has a length equal to the dimension.
 */
function addVectorDimensionValidator(schema) {
    schema.eachPath((_path, schemaType) => {
        const isValidArray = schemaType.instance === 'Array' || schemaType.instance === 'Vectorize';
        if (isValidArray && schemaType.getEmbeddedSchemaType()?.instance === 'Number' && typeof schemaType.options?.dimension === 'number') {
            const dimension = schemaType.options?.dimension;
            schemaType.validate((value) => {
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
//# sourceMappingURL=plugins.js.map
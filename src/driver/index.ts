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

export { Connection } from './connection';
export { Collection, OperationNotSupportedError } from './collection';
export { Vectorize, VectorizeOptions } from './vectorize';

import { Connection } from './connection';
import { Mongoose, Schema } from 'mongoose';
import { handleVectorFieldsProjection, addVectorDimensionValidator, findAndRerankStatic } from './plugins';

// @ts-expect-error workaround to allow Mongoose to handle $match, this syntax isn't part
// of Mongoose's public API
Schema.Types.String.prototype.$conditionalHandlers.$match = v => v;

export const plugins = [handleVectorFieldsProjection, addVectorDimensionValidator, findAndRerankStatic];

import { Vectorize } from './vectorize';
export const SchemaTypes = { Vectorize };

export type AstraMongoose = Mongoose & { connection: Connection, connections: Connection[] };

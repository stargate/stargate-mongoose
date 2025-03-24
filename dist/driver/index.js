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
exports.SchemaTypes = exports.plugins = exports.Vectorize = exports.OperationNotSupportedError = exports.Collection = exports.Connection = void 0;
var connection_1 = require("./connection");
Object.defineProperty(exports, "Connection", { enumerable: true, get: function () { return connection_1.Connection; } });
var collection_1 = require("./collection");
Object.defineProperty(exports, "Collection", { enumerable: true, get: function () { return collection_1.Collection; } });
Object.defineProperty(exports, "OperationNotSupportedError", { enumerable: true, get: function () { return collection_1.OperationNotSupportedError; } });
var vectorize_1 = require("./vectorize");
Object.defineProperty(exports, "Vectorize", { enumerable: true, get: function () { return vectorize_1.Vectorize; } });
const plugins_1 = require("./plugins");
exports.plugins = [plugins_1.handleVectorFieldsProjection, plugins_1.addVectorDimensionValidator];
const vectorize_2 = require("./vectorize");
exports.SchemaTypes = { Vectorize: vectorize_2.Vectorize };
//# sourceMappingURL=index.js.map
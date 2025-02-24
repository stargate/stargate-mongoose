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
exports.plugins = exports.OperationNotSupportedError = exports.Collection = exports.Connection = void 0;
var connection_1 = require("./connection");
Object.defineProperty(exports, "Connection", { enumerable: true, get: function () { return connection_1.Connection; } });
var collection_1 = require("./collection");
Object.defineProperty(exports, "Collection", { enumerable: true, get: function () { return collection_1.Collection; } });
Object.defineProperty(exports, "OperationNotSupportedError", { enumerable: true, get: function () { return collection_1.OperationNotSupportedError; } });
const plugins_1 = require("./plugins");
exports.plugins = [plugins_1.handleVectorFieldsProjection];
//# sourceMappingURL=index.js.map
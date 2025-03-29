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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = createAstraUri;
const url_1 = __importDefault(require("url"));
/**
 * Create an Astra connection URI while connecting to Astra Data API.
 */
function createAstraUri(apiEndpoint, apiToken, namespace, baseApiPath, authHeaderName) {
    const uri = new url_1.default.URL(apiEndpoint);
    let contextPath = '';
    contextPath += baseApiPath ? `/${baseApiPath}` : '/api/json/v1';
    contextPath += `/${namespace ?? 'default_keyspace'}`;
    uri.pathname = contextPath;
    if (apiToken) {
        uri.searchParams.append('applicationToken', apiToken);
    }
    if (authHeaderName) {
        uri.searchParams.append('authHeaderName', authHeaderName);
    }
    return uri.toString();
}
//# sourceMappingURL=createAstraUri.js.map
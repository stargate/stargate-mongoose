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
const assert_1 = __importDefault(require("assert"));
const createAstraUri_1 = __importDefault(require("../src/createAstraUri"));
describe('Utils test', () => {
    it('createProdAstraUriDefaultKeyspace', () => {
        const apiEndpoint = 'https://a5cf1913-b80b-4f44-ab9f-a8b1c98469d0-ap-south-1.apps.astra.datastax.com';
        const uri = (0, createAstraUri_1.default)(apiEndpoint, 'myToken');
        assert_1.default.strictEqual(uri, 'https://a5cf1913-b80b-4f44-ab9f-a8b1c98469d0-ap-south-1.apps.astra.datastax.com/api/json/v1/default_keyspace?applicationToken=myToken');
    });
    it('createProdAstraUriWithToken', () => {
        const apiEndpoint = 'https://a5cf1913-b80b-4f44-ab9f-a8b1c98469d0-ap-south-1.apps.astra.datastax.com';
        const uri = (0, createAstraUri_1.default)(apiEndpoint, 'myToken', 'testks1');
        assert_1.default.strictEqual(uri, 'https://a5cf1913-b80b-4f44-ab9f-a8b1c98469d0-ap-south-1.apps.astra.datastax.com/api/json/v1/testks1?applicationToken=myToken');
    });
    it('createProdAstraUriWithTokenAndProdEnum', () => {
        const apiEndpoint = 'https://a5cf1913-b80b-4f44-ab9f-a8b1c98469d0-ap-south-1.apps.astra.datastax.com';
        const uri = (0, createAstraUri_1.default)(apiEndpoint, 'myToken', 'testks1');
        assert_1.default.strictEqual(uri, 'https://a5cf1913-b80b-4f44-ab9f-a8b1c98469d0-ap-south-1.apps.astra.datastax.com/api/json/v1/testks1?applicationToken=myToken');
    });
    it('createProdAstraUriWithTokenAndProdEnum', () => {
        const apiEndpoint = 'https://a5cf1913-b80b-4f44-ab9f-a8b1c98469d0-ap-south-1.apps.astra.datastax.com';
        const uri = (0, createAstraUri_1.default)(apiEndpoint, 'myToken', 'testks1');
        assert_1.default.strictEqual(uri, 'https://a5cf1913-b80b-4f44-ab9f-a8b1c98469d0-ap-south-1.apps.astra.datastax.com/api/json/v1/testks1?applicationToken=myToken');
    });
    it('createProdAstraUriWithTokenAndProdEnumWithBaseAPIPath', () => {
        const apiEndpoint = 'https://a5cf1913-b80b-4f44-ab9f-a8b1c98469d0-ap-south-1.apps.astra.datastax.com';
        const uri = (0, createAstraUri_1.default)(apiEndpoint, 'myToken', 'testks1', 'apis');
        assert_1.default.strictEqual(uri, 'https://a5cf1913-b80b-4f44-ab9f-a8b1c98469d0-ap-south-1.apps.astra.datastax.com/apis/testks1?applicationToken=myToken');
    });
});
//# sourceMappingURL=createAstraUri.test.js.map
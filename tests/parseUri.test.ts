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

import assert from 'assert';
import { parseUri } from '../src/driver/connection';

describe('parseUri', () => {
    it('parses a standard URI', () => {
        const uri = 'https://xyz-us-east-2.apps.astra.datastax.com/api/json/v1/ecommerce_dev?applicationToken=AstraCS:ABC123';
        const result = parseUri(uri);
        assert.strictEqual(result.baseUrl, 'https://xyz-us-east-2.apps.astra.datastax.com');
        assert.strictEqual(result.baseApiPath, 'api/json/v1');
        assert.strictEqual(result.keyspaceName, 'ecommerce_dev');
        assert.strictEqual(result.applicationToken, 'AstraCS:ABC123');
    });

    it('parses a URI with multiple path segments', () => {
        const uri = 'https://xyz-us-east-2.apps.astra.datastax.com/api/json/v1/ecommerce_dev?applicationToken=AstraCS:ABC123';
        const result = parseUri(uri);
        assert.strictEqual(result.baseUrl, 'https://xyz-us-east-2.apps.astra.datastax.com');
        assert.strictEqual(result.baseApiPath, 'api/json/v1');
        assert.strictEqual(result.keyspaceName, 'ecommerce_dev');
        assert.strictEqual(result.applicationToken, 'AstraCS:ABC123');
    });

    it('parses a URI with only keyspace in path', () => {
        const uri = 'https://xyz-us-east-2.apps.astra.datastax.com/ecommerce_dev?applicationToken=AstraCS:ABC123';
        const result = parseUri(uri);
        assert.strictEqual(result.baseUrl, 'https://xyz-us-east-2.apps.astra.datastax.com');
        assert.strictEqual(result.baseApiPath, '/');
        assert.strictEqual(result.keyspaceName, 'ecommerce_dev');
        assert.strictEqual(result.applicationToken, 'AstraCS:ABC123');
    });

    it('throws if multiple applicationToken params are present', () => {
        const uri = 'https://xyz-us-east-2.apps.astra.datastax.com/api/json/v1/ecommerce_dev?applicationToken=abc123&applicationToken=def456';
        assert.throws(() => parseUri(uri), /multiple application tokens/);
    });

    it('throws if keyspace is missing', () => {
        const uri = 'https://xyz-us-east-2.apps.astra.datastax.com/?applicationToken=AstraCS:ABC123';
        assert.throws(() => parseUri(uri), /keyspace is required/);
    });

    it('handles trailing slash after keyspace', () => {
        const uri = 'https://xyz-us-east-2.apps.astra.datastax.com/api/json/v1/ecommerce_dev/?applicationToken=AstraCS:ABC123';
        const result = parseUri(uri);
        assert.strictEqual(result.baseUrl, 'https://xyz-us-east-2.apps.astra.datastax.com');
        assert.strictEqual(result.baseApiPath, 'api/json/v1');
        assert.strictEqual(result.keyspaceName, 'ecommerce_dev');
        assert.strictEqual(result.applicationToken, 'AstraCS:ABC123');
    });

    it('handles trailing slash after baseApiPath', () => {
        const uri = 'https://xyz-us-east-2.apps.astra.datastax.com/api/json/v1/ecommerce_dev/?applicationToken=AstraCS:ABC123';
        const result = parseUri(uri);
        assert.strictEqual(result.baseUrl, 'https://xyz-us-east-2.apps.astra.datastax.com');
        assert.strictEqual(result.baseApiPath, 'api/json/v1');
        assert.strictEqual(result.keyspaceName, 'ecommerce_dev');
        assert.strictEqual(result.applicationToken, 'AstraCS:ABC123');
    });

    it('parses URI with no query params', () => {
        const uri = 'https://xyz-us-east-2.apps.astra.datastax.com/api/json/v1/ecommerce_dev';
        const result = parseUri(uri);
        assert.strictEqual(result.baseUrl, 'https://xyz-us-east-2.apps.astra.datastax.com');
        assert.strictEqual(result.baseApiPath, 'api/json/v1');
        assert.strictEqual(result.keyspaceName, 'ecommerce_dev');
        assert.strictEqual(result.applicationToken, undefined);
    });
});

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
exports.StargateMongooseError = exports.Collection = void 0;
const cursor_1 = require("./cursor");
const utils_1 = require("./utils");
const options_1 = require("./options");
class Collection {
    constructor(db, name) {
        if (!name) {
            throw new Error('Collection name is required');
        }
        // use a clone of the underlying http client to support multiple collections from a single db
        this.httpClient = db.httpClient;
        this.name = name;
        this.collectionName = name;
        this.httpBasePath = `/${db.name}/${name}`;
    }
    async insertOne(document) {
        return (0, utils_1.executeOperation)(async () => {
            const command = {
                insertOne: {
                    document
                }
            };
            const resp = await this.httpClient.executeCommandWithUrl(this.httpBasePath, command, options_1.retainNoOptions);
            return {
                acknowledged: true,
                insertedId: resp.status.insertedIds[0]
            };
        });
    }
    async insertMany(documents, options) {
        return (0, utils_1.executeOperation)(async () => {
            const command = {
                insertMany: {
                    documents,
                    options
                }
            };
            const resp = await this.httpClient.executeCommandWithUrl(this.httpBasePath, command, options_1.insertManyInternalOptionsKeys);
            return {
                acknowledged: true,
                insertedCount: resp.status.insertedIds?.length || 0,
                insertedIds: resp.status.insertedIds,
                documentResponses: resp.status.documentResponses
            };
        });
    }
    async replaceOne(filter, replacement, options) {
        return (0, utils_1.executeOperation)(async () => {
            const command = {
                findOneAndReplace: {
                    filter,
                    replacement,
                    options: { ...options, projection: { '*': 0 } }
                }
            };
            (0, utils_1.setDefaultIdForUpsert)(command.findOneAndReplace);
            const findOneAndReplaceResp = await this.httpClient.executeCommandWithUrl(this.httpBasePath, command, options_1.updateOneInternalOptionsKeys);
            const resp = {
                modifiedCount: findOneAndReplaceResp.status.modifiedCount,
                matchedCount: findOneAndReplaceResp.status.matchedCount,
                acknowledged: true
            };
            if (findOneAndReplaceResp.status.upsertedId) {
                resp.upsertedId = findOneAndReplaceResp.status.upsertedId;
                resp.upsertedCount = 1;
            }
            return resp;
        });
    }
    async updateOne(filter, update, options) {
        return (0, utils_1.executeOperation)(async () => {
            const command = {
                updateOne: {
                    filter,
                    update,
                    options: (0, utils_1.omit)(options, ['sort']),
                    ...(options?.sort != null ? { sort: options?.sort } : {})
                }
            };
            (0, utils_1.setDefaultIdForUpsert)(command.updateOne);
            const updateOneResp = await this.httpClient.executeCommandWithUrl(this.httpBasePath, command, options_1.updateOneInternalOptionsKeys);
            const resp = {
                modifiedCount: updateOneResp.status.modifiedCount,
                matchedCount: updateOneResp.status.matchedCount,
                acknowledged: true
            };
            if (updateOneResp.status.upsertedId) {
                resp.upsertedId = updateOneResp.status.upsertedId;
                resp.upsertedCount = 1;
            }
            return resp;
        });
    }
    async updateMany(filter, update, options) {
        return (0, utils_1.executeOperation)(async () => {
            const command = {
                updateMany: {
                    filter,
                    update,
                    options
                }
            };
            (0, utils_1.setDefaultIdForUpsert)(command.updateMany);
            const resp = {
                modifiedCount: 0,
                matchedCount: 0,
                acknowledged: true,
            };
            if (options != null && options.usePagination) {
                let nextPageState = null;
                options = { ...options };
                delete options.usePagination;
                command.updateMany.options = options;
                while (true) {
                    if (nextPageState != null) {
                        command.updateMany.options.pageState = nextPageState;
                    }
                    const updateManyResp = await this.httpClient.executeCommandWithUrl(this.httpBasePath, command, options_1.updateManyInternalOptionsKeys);
                    const { status } = updateManyResp;
                    resp.modifiedCount += status.modifiedCount;
                    resp.matchedCount += status.matchedCount;
                    if (status.upsertedId) {
                        resp.upsertedId = status.upsertedId;
                        resp.upsertedCount = 1;
                    }
                    if (status.nextPageState == null) {
                        break;
                    }
                    nextPageState = status.nextPageState;
                }
            }
            else {
                const updateManyResp = await this.httpClient.executeCommandWithUrl(this.httpBasePath, command, options_1.updateManyInternalOptionsKeys);
                if (updateManyResp.status.moreData) {
                    throw new StargateMongooseError(`More than ${updateManyResp.status.modifiedCount} records found for update by the server`, command);
                }
                resp.modifiedCount = updateManyResp.status.modifiedCount;
                resp.matchedCount = updateManyResp.status.matchedCount;
                if (updateManyResp.status.upsertedId) {
                    resp.upsertedId = updateManyResp.status.upsertedId;
                    resp.upsertedCount = 1;
                }
            }
            return resp;
        });
    }
    async deleteOne(filter, options) {
        return (0, utils_1.executeOperation)(async () => {
            const command = {
                deleteOne: {
                    filter,
                    ...(options?.sort != null ? { sort: options.sort } : {})
                }
            };
            const deleteOneResp = await this.httpClient.executeCommandWithUrl(this.httpBasePath, command, options_1.retainNoOptions);
            return {
                acknowledged: true,
                deletedCount: deleteOneResp.status.deletedCount
            };
        });
    }
    async deleteMany(filter) {
        return (0, utils_1.executeOperation)(async () => {
            const command = {
                deleteMany: {
                    filter
                }
            };
            const deleteManyResp = await this.httpClient.executeCommandWithUrl(this.httpBasePath, command, options_1.retainNoOptions);
            if (deleteManyResp.status.moreData) {
                throw new StargateMongooseError(`More records found to be deleted even after deleting ${deleteManyResp.status.deletedCount} records`, command);
            }
            return {
                acknowledged: true,
                deletedCount: deleteManyResp.status.deletedCount
            };
        });
    }
    find(filter, options) {
        return new cursor_1.FindCursor(this, filter, options);
    }
    async findOne(filter, options) {
        return (0, utils_1.executeOperation)(async () => {
            const command = {
                findOne: {
                    filter,
                    options,
                    ...(options?.sort != null ? { sort: options?.sort } : {}),
                    ...(options?.projection != null ? { projection: options?.projection } : {}),
                }
            };
            const resp = await this.httpClient.executeCommandWithUrl(this.httpBasePath, command, options_1.findOneInternalOptionsKeys);
            if (options != null && options.includeSortVector) {
                resp.data.document.$sortVector = resp.status.sortVector;
            }
            return resp.data.document;
        });
    }
    async findOneAndReplace(filter, replacement, options) {
        return (0, utils_1.executeOperation)(async () => {
            const command = {
                findOneAndReplace: {
                    filter,
                    replacement,
                    options: (0, utils_1.omit)(options, ['sort']),
                    ...(options?.sort != null ? { sort: options?.sort } : {}),
                    ...(options?.projection != null ? { projection: options?.projection } : {}),
                }
            };
            (0, utils_1.setDefaultIdForUpsert)(command.findOneAndReplace, true);
            const resp = await this.httpClient.executeCommandWithUrl(this.httpBasePath, command, options_1.findOneAndReplaceInternalOptionsKeys);
            return {
                value: resp.data?.document,
                ok: 1
            };
        });
    }
    async distinct(_key, _filter, _options) {
        throw new Error('Not Implemented');
    }
    async countDocuments(filter) {
        return (0, utils_1.executeOperation)(async () => {
            const command = {
                countDocuments: {
                    filter
                }
            };
            const resp = await this.httpClient.executeCommandWithUrl(this.httpBasePath, command, options_1.retainNoOptions);
            return resp.status.count;
        });
    }
    async estimatedDocumentCount() {
        return (0, utils_1.executeOperation)(async () => {
            const command = { estimatedDocumentCount: {} };
            const resp = await this.httpClient.executeCommandWithUrl(this.httpBasePath, command, options_1.retainNoOptions);
            return resp.status.count;
        });
    }
    async findOneAndDelete(filter, options) {
        const command = {
            findOneAndDelete: {
                filter,
                ...(options?.sort != null ? { sort: options?.sort } : {}),
                ...(options?.projection != null ? { projection: options?.projection } : {}),
            }
        };
        const resp = await this.httpClient.executeCommandWithUrl(this.httpBasePath, command, options_1.retainNoOptions);
        return {
            value: resp.data?.document,
            ok: 1
        };
    }
    /**
   * @deprecated
   */
    async count(filter) {
        return this.countDocuments(filter);
    }
    async findOneAndUpdate(filter, update, options) {
        return (0, utils_1.executeOperation)(async () => {
            const command = {
                findOneAndUpdate: {
                    filter,
                    update,
                    options: (0, utils_1.omit)(options, ['sort']),
                    ...(options?.sort != null ? { sort: options?.sort } : {}),
                    ...(options?.projection != null ? { projection: options?.projection } : {}),
                }
            };
            (0, utils_1.setDefaultIdForUpsert)(command.findOneAndUpdate);
            const resp = await this.httpClient.executeCommandWithUrl(this.httpBasePath, command, options_1.findOneAndUpdateInternalOptionsKeys);
            return {
                value: resp.data?.document,
                ok: 1
            };
        });
    }
    async runCommand(command) {
        return (0, utils_1.executeOperation)(async () => {
            return await this.httpClient.executeCommandWithUrl(this.httpBasePath, command, null);
        });
    }
}
exports.Collection = Collection;
class StargateMongooseError extends Error {
    constructor(message, command) {
        const commandName = Object.keys(command)[0] || 'unknown';
        super(`Command "${commandName}" failed with the following error: ${message}`);
        this.command = command;
    }
}
exports.StargateMongooseError = StargateMongooseError;
//# sourceMappingURL=collection.js.map
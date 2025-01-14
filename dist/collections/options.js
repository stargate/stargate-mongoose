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
exports.retainNoOptions = exports.listCollectionOptionsKeys = exports.createCollectionOptionsKeys = exports.ReplaceOneInternalOptionsKeys = exports.updateOneInternalOptionsKeys = exports.updateManyInternalOptionsKeys = exports.insertManyInternalOptionsKeys = exports.findOneAndUpdateInternalOptionsKeys = exports.findOneAndReplaceInternalOptionsKeys = exports.findOneInternalOptionsKeys = exports.findInternalOptionsKeys = void 0;
class _FindOptionsInternal {
    constructor() {
        this.limit = undefined;
        this.skip = undefined;
        this.pagingState = undefined;
        this.includeSimilarity = undefined;
        this.includeSortVector = undefined;
    }
}
exports.findInternalOptionsKeys = new Set(Object.keys(new _FindOptionsInternal));
class _FindOneOptionsInternal {
    constructor() {
        this.includeSimilarity = undefined;
        this.includeSortVector = undefined;
    }
}
exports.findOneInternalOptionsKeys = new Set(Object.keys(new _FindOneOptionsInternal));
class _FindOneAndReplaceOptions {
    constructor() {
        this.upsert = undefined;
        this.returnDocument = undefined;
    }
}
exports.findOneAndReplaceInternalOptionsKeys = new Set(Object.keys(new _FindOneAndReplaceOptions));
class _FindOneAndUpdateOptions {
    constructor() {
        this.upsert = undefined;
        this.returnDocument = undefined;
    }
}
exports.findOneAndUpdateInternalOptionsKeys = new Set(Object.keys(new _FindOneAndUpdateOptions));
class _InsertManyOptions {
    constructor() {
        this.ordered = undefined;
        this.usePagination = undefined;
        this.returnDocumentResponses = undefined;
    }
}
exports.insertManyInternalOptionsKeys = new Set(Object.keys(new _InsertManyOptions));
class _UpdateManyOptions {
    constructor() {
        this.upsert = undefined;
        this.usePagination = undefined;
        this.pageState = undefined;
    }
}
// `usePagination` is supported as user-specified option, but not passed to Data API
exports.updateManyInternalOptionsKeys = new Set(Object.keys(new _UpdateManyOptions).filter(key => key !== 'usePagination'));
class _UpdateOneOptions {
    constructor() {
        this.upsert = undefined;
    }
}
exports.updateOneInternalOptionsKeys = new Set(Object.keys(new _UpdateOneOptions));
class _ReplaceOneOptions {
    constructor() {
        this.upsert = undefined;
    }
}
exports.ReplaceOneInternalOptionsKeys = new Set(Object.keys(new _ReplaceOneOptions));
class _CreateCollectionOptions {
    constructor() {
        this.vector = undefined;
        this.indexing = undefined;
        this.defaultId = undefined;
    }
}
exports.createCollectionOptionsKeys = new Set(Object.keys(new _CreateCollectionOptions));
class _ListCollectionOptions {
    constructor() {
        this.explain = undefined;
    }
}
exports.listCollectionOptionsKeys = new Set(Object.keys(new _ListCollectionOptions));
exports.retainNoOptions = new Set();
//# sourceMappingURL=options.js.map
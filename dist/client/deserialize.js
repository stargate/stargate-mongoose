"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deserialize = void 0;
const bson_1 = require("bson");
const mongoose_1 = __importDefault(require("mongoose"));
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function deserialize(data) {
    return data != null ? deserializeObjectIds(bson_1.EJSON.deserialize(data)) : data;
}
exports.deserialize = deserialize;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function deserializeObjectIds(data) {
    if (data == null) {
        return data;
    }
    if (Array.isArray(data)) {
        for (let i = 0; i < data.length; ++i) {
            if (data[i] == null) {
                continue;
            }
            if (typeof data[i].$objectId === 'string') {
                if (!mongoose_1.default.isObjectIdOrHexString(data[i].$objectId)) {
                    throw new TypeError(`Invalid $objectId "${data[i].$objectId}"`);
                }
                data[i] = new bson_1.ObjectId(data[i].$objectId);
            }
            else if (typeof data[i] === 'object') {
                deserializeObjectIds(data[i]);
            }
        }
    }
    for (const key of Object.keys(data)) {
        if (data[key] == null) {
            continue;
        }
        if (typeof data[key].$objectId === 'string') {
            if (!mongoose_1.default.isObjectIdOrHexString(data[key].$objectId)) {
                throw new TypeError(`Invalid $objectId "${data[key].$objectId}"`);
            }
            data[key] = new bson_1.ObjectId(data[key].$objectId);
        }
        else if (typeof data[key] === 'object') {
            deserializeObjectIds(data[key]);
        }
    }
    return data;
}
//# sourceMappingURL=deserialize.js.map
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.serialize = serialize;
const bson_1 = require("bson");
const mongoose_1 = __importDefault(require("mongoose"));
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function serialize(data) {
    return data != null
        ? applyTransforms(data)
        : data;
}
// Mongoose relies on certain values getting transformed into their BSON equivalents,
// most notably subdocuments and document arrays. Otherwise `$push` on a document array fails.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applyTransforms(data) {
    if (data == null) {
        return data;
    }
    if (typeof data === 'bigint') {
        return data.toString();
    }
    if (typeof data === 'string' || typeof data === 'number' || typeof data === 'boolean') {
        return data;
    }
    if (typeof data.toBSON === 'function') {
        data = data.toBSON();
    }
    if (data instanceof bson_1.ObjectId) {
        return data.toHexString();
    }
    else if (data instanceof BigInt) {
        return data.toString();
    }
    else if (data instanceof mongoose_1.default.Types.Decimal128) {
        //Decimal128 handling
        return Number(data.toString());
    }
    else if (data instanceof Map) {
        return Object.fromEntries(data.entries());
    }
    else if (data instanceof bson_1.Binary) {
        if (data.sub_type === 3 || data.sub_type === 4) {
            // UUIDs
            return data.toString('hex').replace(/(.{8})(.{4})(.{4})(.{4})(.{12})/, '$1-$2-$3-$4-$5');
        }
        return data.toString('hex');
    }
    else if (data instanceof bson_1.UUID) {
        return data.toString();
    }
    else if (Array.isArray(data)) {
        return data.map(el => applyTransforms(el));
    }
    else if (data._bsontype == null) {
        for (const key of Object.keys(data)) {
            if (data[key] == null) {
                continue;
            }
            else {
                data[key] = applyTransforms(data[key]);
            }
        }
        return data;
    }
    return data;
}
//# sourceMappingURL=serialize.js.map
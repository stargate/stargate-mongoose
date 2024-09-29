import { EJSON, ObjectId } from 'bson';
import mongoose from 'mongoose';

export function deserialize(data: Record<string, any>): Record<string, any> {
    return data != null ? deserializeObjectIds(EJSON.deserialize(deserializeBuffers(data))) : data;
}

function deserializeBuffers(data: Record<string, any>): Record<string, any> {
    if (data == null) {
        return data;
    }
    if (Array.isArray(data)) {
        for (let i = 0; i < data.length; ++i) {
            if (data[i] == null) {
                continue;
            }
            if (typeof data[i].$binary === 'string') {
                data[i] = Buffer.from(data[i].$binary, 'base64');
            } else if (typeof data[i] === 'object') {
                deserializeBuffers(data[i]);
            }
        }
    }
    for (const key of Object.keys(data)) {
        if (data[key] == null) {
            continue;
        }
        if (typeof data[key].$binary === 'string') {
            data[key] = Buffer.from(data[key].$binary, 'base64');
        } else if (typeof data[key] === 'object') {
            deserializeBuffers(data[key]);
        }
    }
    return data;
}

function deserializeObjectIds(data: Record<string, any>): Record<string, any> {
    if (data == null) {
        return data;
    }
    if (Array.isArray(data)) {
        for (let i = 0; i < data.length; ++i) {
            if (data[i] == null) {
                continue;
            }
            if (typeof data[i].$objectId === 'string') {
                if (!mongoose.isObjectIdOrHexString(data[i].$objectId)) {
                    throw new TypeError(`Invalid $objectId "${data[i].$objectId}"`);
                }
                data[i] = new ObjectId(data[i].$objectId);
            } else if (typeof data[i] === 'object') {
                deserializeObjectIds(data[i]);
            }
        }
    }
    for (const key of Object.keys(data)) {
        if (data[key] == null) {
            continue;
        }
        if (typeof data[key].$objectId === 'string') {
            if (!mongoose.isObjectIdOrHexString(data[key].$objectId)) {
                throw new TypeError(`Invalid $objectId "${data[key].$objectId}"`);
            }
            data[key] = new ObjectId(data[key].$objectId);
        } else if (typeof data[key] === 'object') {
            deserializeObjectIds(data[key]);
        }
    }
    return data;
}
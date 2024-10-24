import { EJSON } from 'bson';
import mongoose from 'mongoose';

export function serialize(data: Record<string, any>, pretty?: boolean): string {
    return data != null
        ? EJSON.stringify(
            applyToBSONTransform(data),
            (key, value) => serializeValue(value),
            pretty ? '  ' : ''
        )
        : data;
}

// Mongoose relies on certain values getting transformed into their BSON equivalents,
// most notably subdocuments and document arrays. Otherwise `$push` on a document array fails.
function applyToBSONTransform(data: Record<string, any> | any[]): Record<string, any> {
    if (data == null) {
        return data;
    }
    data = applyToBSON(data);
    if (Array.isArray(data)) {
        return data.map(el => applyToBSONTransform(el));
    }
    for (const key of Object.keys(data)) {
        if (data[key] == null) {
            continue;
        } else if (typeof data[key] === 'object') {
            data[key] = applyToBSONTransform(data[key]);
        }
    }
    return data;
}

function applyToBSON(value: any) {
    if (value?.isMongooseArrayProxy || value instanceof mongoose.Types.Subdocument) {
        return value.toBSON();
    }

    return value;
}

function serializeValue(value: any): any {
    if (value != null && typeof value === 'bigint') {
        //BigInt handling
        return Number(value);
    } else if (value != null && typeof value === 'object') {
        // ObjectId to strings
        if (value.$oid) {
            return value.$oid;
        } else if (value.$numberDecimal) {
            //Decimal128 handling
            return Number(value.$numberDecimal);
        } else if (value.$binary && (value.$binary.subType === '03' || value.$binary.subType === '04')) {
            //UUID handling. Subtype 03 or 04 is UUID. Refer spec : https://bsonspec.org/spec.html
            return Buffer.from(value.$binary.base64, 'base64').toString('hex')
                .replace(/(.{8})(.{4})(.{4})(.{4})(.{12})/, '$1-$2-$3-$4-$5');
        }
        //Date handling
        else if (value.$date) {
            // Use numbers instead of strings for dates
            value.$date = new Date(value.$date).valueOf();
        }
    }
    //all other values
    return value;
}
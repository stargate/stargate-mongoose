/// <reference path="../src/index.d.ts" />
/// <reference types="mongoose/types/aggregate" />
/// <reference types="mongoose/types/callback" />
/// <reference types="mongoose/types/collection" />
/// <reference types="mongoose/types/connection" />
/// <reference types="mongoose/types/cursor" />
/// <reference types="mongoose/types/document" />
/// <reference types="mongoose/types/error" />
/// <reference types="mongoose/types/expressions" />
/// <reference types="mongoose/types/helpers" />
/// <reference types="mongoose/types/middlewares" />
/// <reference types="mongoose/types/indexes" />
/// <reference types="mongoose/types/models" />
/// <reference types="mongoose/types/mongooseoptions" />
/// <reference types="mongoose/types/pipelinestage" />
/// <reference types="mongoose/types/populate" />
/// <reference types="mongoose/types/query" />
/// <reference types="mongoose/types/schemaoptions" />
/// <reference types="mongoose/types/schematypes" />
/// <reference types="mongoose/types/session" />
/// <reference types="mongoose/types/types" />
/// <reference types="mongoose/types/utility" />
/// <reference types="mongoose/types/validation" />
/// <reference types="mongoose/types/virtuals" />
/// <reference types="mongoose/types/inferschematype" />
/// <reference types="mongoose/types/inferrawdoctype" />
import { Schema } from 'mongoose';
export declare const productSchema: Schema<any, import("mongoose").Model<any, any, any, any, any, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, {
    tags: import("mongoose").Types.DocumentArray<{
        name?: string | null | undefined;
        _id?: unknown;
    }>;
    name?: string | null | undefined;
    price?: number | null | undefined;
    expiryDate?: NativeDate | null | undefined;
    isCertified?: boolean | null | undefined;
    category?: string | null | undefined;
}, import("mongoose").Document<unknown, {}, import("mongoose").FlatRecord<{
    tags: import("mongoose").Types.DocumentArray<{
        name?: string | null | undefined;
        _id?: unknown;
    }>;
    name?: string | null | undefined;
    price?: number | null | undefined;
    expiryDate?: NativeDate | null | undefined;
    isCertified?: boolean | null | undefined;
    category?: string | null | undefined;
}>> & import("mongoose").FlatRecord<{
    tags: import("mongoose").Types.DocumentArray<{
        name?: string | null | undefined;
        _id?: unknown;
    }>;
    name?: string | null | undefined;
    price?: number | null | undefined;
    expiryDate?: NativeDate | null | undefined;
    isCertified?: boolean | null | undefined;
    category?: string | null | undefined;
}> & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}>;
export declare const mongooseInstance: typeof import("mongoose");
export declare const Cart: import("mongoose").Model<{
    products: import("mongoose").Types.ObjectId[];
    name?: string | null | undefined;
    cartName?: string | null | undefined;
    user?: {
        [x: string]: unknown;
    } | null | undefined;
}, {}, {}, {}, import("mongoose").Document<unknown, {}, {
    products: import("mongoose").Types.ObjectId[];
    name?: string | null | undefined;
    cartName?: string | null | undefined;
    user?: {
        [x: string]: unknown;
    } | null | undefined;
}> & {
    products: import("mongoose").Types.ObjectId[];
    name?: string | null | undefined;
    cartName?: string | null | undefined;
    user?: {
        [x: string]: unknown;
    } | null | undefined;
} & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, Schema<any, import("mongoose").Model<any, any, any, any, any, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, {
    products: import("mongoose").Types.ObjectId[];
    name?: string | null | undefined;
    cartName?: string | null | undefined;
    user?: {
        [x: string]: unknown;
    } | null | undefined;
}, import("mongoose").Document<unknown, {}, import("mongoose").FlatRecord<{
    products: import("mongoose").Types.ObjectId[];
    name?: string | null | undefined;
    cartName?: string | null | undefined;
    user?: {
        [x: string]: unknown;
    } | null | undefined;
}>> & import("mongoose").FlatRecord<{
    products: import("mongoose").Types.ObjectId[];
    name?: string | null | undefined;
    cartName?: string | null | undefined;
    user?: {
        [x: string]: unknown;
    } | null | undefined;
}> & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}>>;
export declare const Product: import("mongoose").Model<{
    tags: import("mongoose").Types.DocumentArray<{
        name?: string | null | undefined;
        _id?: unknown;
    }>;
    name?: string | null | undefined;
    price?: number | null | undefined;
    expiryDate?: NativeDate | null | undefined;
    isCertified?: boolean | null | undefined;
    category?: string | null | undefined;
}, {}, {}, {}, import("mongoose").Document<unknown, {}, {
    tags: import("mongoose").Types.DocumentArray<{
        name?: string | null | undefined;
        _id?: unknown;
    }>;
    name?: string | null | undefined;
    price?: number | null | undefined;
    expiryDate?: NativeDate | null | undefined;
    isCertified?: boolean | null | undefined;
    category?: string | null | undefined;
}> & {
    tags: import("mongoose").Types.DocumentArray<{
        name?: string | null | undefined;
        _id?: unknown;
    }>;
    name?: string | null | undefined;
    price?: number | null | undefined;
    expiryDate?: NativeDate | null | undefined;
    isCertified?: boolean | null | undefined;
    category?: string | null | undefined;
} & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, Schema<any, import("mongoose").Model<any, any, any, any, any, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, {
    tags: import("mongoose").Types.DocumentArray<{
        name?: string | null | undefined;
        _id?: unknown;
    }>;
    name?: string | null | undefined;
    price?: number | null | undefined;
    expiryDate?: NativeDate | null | undefined;
    isCertified?: boolean | null | undefined;
    category?: string | null | undefined;
}, import("mongoose").Document<unknown, {}, import("mongoose").FlatRecord<{
    tags: import("mongoose").Types.DocumentArray<{
        name?: string | null | undefined;
        _id?: unknown;
    }>;
    name?: string | null | undefined;
    price?: number | null | undefined;
    expiryDate?: NativeDate | null | undefined;
    isCertified?: boolean | null | undefined;
    category?: string | null | undefined;
}>> & import("mongoose").FlatRecord<{
    tags: import("mongoose").Types.DocumentArray<{
        name?: string | null | undefined;
        _id?: unknown;
    }>;
    name?: string | null | undefined;
    price?: number | null | undefined;
    expiryDate?: NativeDate | null | undefined;
    isCertified?: boolean | null | undefined;
    category?: string | null | undefined;
}> & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}>>;
export declare function createMongooseCollections(): Promise<void>;

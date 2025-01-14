import { Schema, Mongoose, InferSchemaType, SubdocsToPOJOs } from 'mongoose';
import * as StargateMongooseDriver from '../src/driver';
export declare const productSchema: Schema<any, import("mongoose").Model<any, any, any, any, any, any>, {}, {}, {}, {}, {
    versionKey: false;
}, {
    tags: import("mongoose").Types.DocumentArray<{
        _id?: unknown;
        name?: string | null | undefined;
    }, import("mongoose").Types.Subdocument<unknown, any, {
        _id?: unknown;
        name?: string | null | undefined;
    }> & {
        _id?: unknown;
        name?: string | null | undefined;
    }>;
    name?: string | null | undefined;
    price?: number | null | undefined;
    expiryDate?: NativeDate | null | undefined;
    isCertified?: boolean | null | undefined;
    category?: string | null | undefined;
}, import("mongoose").Document<unknown, {}, import("mongoose").FlatRecord<{
    tags: import("mongoose").Types.DocumentArray<{
        _id?: unknown;
        name?: string | null | undefined;
    }, import("mongoose").Types.Subdocument<unknown, any, {
        _id?: unknown;
        name?: string | null | undefined;
    }> & {
        _id?: unknown;
        name?: string | null | undefined;
    }>;
    name?: string | null | undefined;
    price?: number | null | undefined;
    expiryDate?: NativeDate | null | undefined;
    isCertified?: boolean | null | undefined;
    category?: string | null | undefined;
}>> & import("mongoose").FlatRecord<{
    tags: import("mongoose").Types.DocumentArray<{
        _id?: unknown;
        name?: string | null | undefined;
    }, import("mongoose").Types.Subdocument<unknown, any, {
        _id?: unknown;
        name?: string | null | undefined;
    }> & {
        _id?: unknown;
        name?: string | null | undefined;
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
export declare const mongooseInstance: Omit<Mongoose, "connection"> & {
    connection: StargateMongooseDriver.Connection;
};
export declare const Cart: import("mongoose").Model<{
    products: import("mongoose").Types.ObjectId[];
    name?: string | null | undefined;
    cartName?: string | null | undefined;
    user?: {
        [x: string]: unknown;
    } | {
        name?: string | null | undefined;
    } | null | undefined;
}, {}, {}, {}, import("mongoose").Document<unknown, {}, {
    products: import("mongoose").Types.ObjectId[];
    name?: string | null | undefined;
    cartName?: string | null | undefined;
    user?: {
        [x: string]: unknown;
    } | {
        name?: string | null | undefined;
    } | null | undefined;
}> & {
    products: import("mongoose").Types.ObjectId[];
    name?: string | null | undefined;
    cartName?: string | null | undefined;
    user?: {
        [x: string]: unknown;
    } | {
        name?: string | null | undefined;
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
    } | {
        name?: string | null | undefined;
    } | null | undefined;
}, import("mongoose").Document<unknown, {}, import("mongoose").FlatRecord<{
    products: import("mongoose").Types.ObjectId[];
    name?: string | null | undefined;
    cartName?: string | null | undefined;
    user?: {
        [x: string]: unknown;
    } | {
        name?: string | null | undefined;
    } | null | undefined;
}>> & import("mongoose").FlatRecord<{
    products: import("mongoose").Types.ObjectId[];
    name?: string | null | undefined;
    cartName?: string | null | undefined;
    user?: {
        [x: string]: unknown;
    } | {
        name?: string | null | undefined;
    } | null | undefined;
}> & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}>>;
export declare const Product: import("mongoose").Model<{
    tags: import("mongoose").Types.DocumentArray<{
        _id?: unknown;
        name?: string | null | undefined;
    }, import("mongoose").Types.Subdocument<unknown, any, {
        _id?: unknown;
        name?: string | null | undefined;
    }> & {
        _id?: unknown;
        name?: string | null | undefined;
    }>;
    name?: string | null | undefined;
    price?: number | null | undefined;
    expiryDate?: NativeDate | null | undefined;
    isCertified?: boolean | null | undefined;
    category?: string | null | undefined;
}, {}, {}, {}, import("mongoose").Document<unknown, {}, {
    tags: import("mongoose").Types.DocumentArray<{
        _id?: unknown;
        name?: string | null | undefined;
    }, import("mongoose").Types.Subdocument<unknown, any, {
        _id?: unknown;
        name?: string | null | undefined;
    }> & {
        _id?: unknown;
        name?: string | null | undefined;
    }>;
    name?: string | null | undefined;
    price?: number | null | undefined;
    expiryDate?: NativeDate | null | undefined;
    isCertified?: boolean | null | undefined;
    category?: string | null | undefined;
}> & {
    tags: import("mongoose").Types.DocumentArray<{
        _id?: unknown;
        name?: string | null | undefined;
    }, import("mongoose").Types.Subdocument<unknown, any, {
        _id?: unknown;
        name?: string | null | undefined;
    }> & {
        _id?: unknown;
        name?: string | null | undefined;
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
}, Schema<any, import("mongoose").Model<any, any, any, any, any, any>, {}, {}, {}, {}, {
    versionKey: false;
}, {
    tags: import("mongoose").Types.DocumentArray<{
        _id?: unknown;
        name?: string | null | undefined;
    }, import("mongoose").Types.Subdocument<unknown, any, {
        _id?: unknown;
        name?: string | null | undefined;
    }> & {
        _id?: unknown;
        name?: string | null | undefined;
    }>;
    name?: string | null | undefined;
    price?: number | null | undefined;
    expiryDate?: NativeDate | null | undefined;
    isCertified?: boolean | null | undefined;
    category?: string | null | undefined;
}, import("mongoose").Document<unknown, {}, import("mongoose").FlatRecord<{
    tags: import("mongoose").Types.DocumentArray<{
        _id?: unknown;
        name?: string | null | undefined;
    }, import("mongoose").Types.Subdocument<unknown, any, {
        _id?: unknown;
        name?: string | null | undefined;
    }> & {
        _id?: unknown;
        name?: string | null | undefined;
    }>;
    name?: string | null | undefined;
    price?: number | null | undefined;
    expiryDate?: NativeDate | null | undefined;
    isCertified?: boolean | null | undefined;
    category?: string | null | undefined;
}>> & import("mongoose").FlatRecord<{
    tags: import("mongoose").Types.DocumentArray<{
        _id?: unknown;
        name?: string | null | undefined;
    }, import("mongoose").Types.Subdocument<unknown, any, {
        _id?: unknown;
        name?: string | null | undefined;
    }> & {
        _id?: unknown;
        name?: string | null | undefined;
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
export type ProductHydratedDoc = ReturnType<(typeof Product)['hydrate']>;
export type ProductRawDoc = SubdocsToPOJOs<InferSchemaType<typeof productSchema>>;
export declare function createMongooseCollections(): Promise<void>;

import { Schema, InferSchemaType, SubdocsToPOJOs } from 'mongoose';
export declare const productSchema: Schema<any, import("mongoose").Model<any, any, any, any, any, any>, {}, {}, {}, {}, {
    versionKey: false;
}, {
    name?: string | null | undefined;
    price?: number | null | undefined;
    expiryDate?: NativeDate | null | undefined;
    isCertified?: boolean | null | undefined;
    category?: string | null | undefined;
    tags?: import("mongoose").Types.DocumentArray<{
        _id?: unknown;
        name?: string | null | undefined;
    }, import("mongoose").Types.Subdocument<unknown, any, {
        _id?: unknown;
        name?: string | null | undefined;
    }> & {
        _id?: unknown;
        name?: string | null | undefined;
    }> | null | undefined;
}, import("mongoose").Document<unknown, {}, import("mongoose").FlatRecord<{
    name?: string | null | undefined;
    price?: number | null | undefined;
    expiryDate?: NativeDate | null | undefined;
    isCertified?: boolean | null | undefined;
    category?: string | null | undefined;
    tags?: import("mongoose").Types.DocumentArray<{
        _id?: unknown;
        name?: string | null | undefined;
    }, import("mongoose").Types.Subdocument<unknown, any, {
        _id?: unknown;
        name?: string | null | undefined;
    }> & {
        _id?: unknown;
        name?: string | null | undefined;
    }> | null | undefined;
}>> & import("mongoose").FlatRecord<{
    name?: string | null | undefined;
    price?: number | null | undefined;
    expiryDate?: NativeDate | null | undefined;
    isCertified?: boolean | null | undefined;
    category?: string | null | undefined;
    tags?: import("mongoose").Types.DocumentArray<{
        _id?: unknown;
        name?: string | null | undefined;
    }, import("mongoose").Types.Subdocument<unknown, any, {
        _id?: unknown;
        name?: string | null | undefined;
    }> & {
        _id?: unknown;
        name?: string | null | undefined;
    }> | null | undefined;
}> & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}>;
export declare const mongooseInstance: import("../src").StargateMongoose;
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
    name?: string | null | undefined;
    price?: number | null | undefined;
    expiryDate?: NativeDate | null | undefined;
    isCertified?: boolean | null | undefined;
    category?: string | null | undefined;
    tags?: import("mongoose").Types.DocumentArray<{
        _id?: unknown;
        name?: string | null | undefined;
    }, import("mongoose").Types.Subdocument<unknown, any, {
        _id?: unknown;
        name?: string | null | undefined;
    }> & {
        _id?: unknown;
        name?: string | null | undefined;
    }> | null | undefined;
}, {}, {}, {}, import("mongoose").Document<unknown, {}, {
    name?: string | null | undefined;
    price?: number | null | undefined;
    expiryDate?: NativeDate | null | undefined;
    isCertified?: boolean | null | undefined;
    category?: string | null | undefined;
    tags?: import("mongoose").Types.DocumentArray<{
        _id?: unknown;
        name?: string | null | undefined;
    }, import("mongoose").Types.Subdocument<unknown, any, {
        _id?: unknown;
        name?: string | null | undefined;
    }> & {
        _id?: unknown;
        name?: string | null | undefined;
    }> | null | undefined;
}> & {
    name?: string | null | undefined;
    price?: number | null | undefined;
    expiryDate?: NativeDate | null | undefined;
    isCertified?: boolean | null | undefined;
    category?: string | null | undefined;
    tags?: import("mongoose").Types.DocumentArray<{
        _id?: unknown;
        name?: string | null | undefined;
    }, import("mongoose").Types.Subdocument<unknown, any, {
        _id?: unknown;
        name?: string | null | undefined;
    }> & {
        _id?: unknown;
        name?: string | null | undefined;
    }> | null | undefined;
} & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, Schema<any, import("mongoose").Model<any, any, any, any, any, any>, {}, {}, {}, {}, {
    versionKey: false;
}, {
    name?: string | null | undefined;
    price?: number | null | undefined;
    expiryDate?: NativeDate | null | undefined;
    isCertified?: boolean | null | undefined;
    category?: string | null | undefined;
    tags?: import("mongoose").Types.DocumentArray<{
        _id?: unknown;
        name?: string | null | undefined;
    }, import("mongoose").Types.Subdocument<unknown, any, {
        _id?: unknown;
        name?: string | null | undefined;
    }> & {
        _id?: unknown;
        name?: string | null | undefined;
    }> | null | undefined;
}, import("mongoose").Document<unknown, {}, import("mongoose").FlatRecord<{
    name?: string | null | undefined;
    price?: number | null | undefined;
    expiryDate?: NativeDate | null | undefined;
    isCertified?: boolean | null | undefined;
    category?: string | null | undefined;
    tags?: import("mongoose").Types.DocumentArray<{
        _id?: unknown;
        name?: string | null | undefined;
    }, import("mongoose").Types.Subdocument<unknown, any, {
        _id?: unknown;
        name?: string | null | undefined;
    }> & {
        _id?: unknown;
        name?: string | null | undefined;
    }> | null | undefined;
}>> & import("mongoose").FlatRecord<{
    name?: string | null | undefined;
    price?: number | null | undefined;
    expiryDate?: NativeDate | null | undefined;
    isCertified?: boolean | null | undefined;
    category?: string | null | undefined;
    tags?: import("mongoose").Types.DocumentArray<{
        _id?: unknown;
        name?: string | null | undefined;
    }, import("mongoose").Types.Subdocument<unknown, any, {
        _id?: unknown;
        name?: string | null | undefined;
    }> & {
        _id?: unknown;
        name?: string | null | undefined;
    }> | null | undefined;
}> & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}>>;
export type CartModelType = typeof Cart;
export type ProductModelType = typeof Product;
export type ProductHydratedDoc = ReturnType<(typeof Product)['hydrate']>;
export type ProductRawDoc = SubdocsToPOJOs<InferSchemaType<typeof productSchema>>;
export declare const mongooseInstanceTables: import("../src").StargateMongoose;
export declare const CartTablesModel: import("mongoose").Model<{
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
export declare const ProductTablesModel: import("mongoose").Model<{
    name?: string | null | undefined;
    price?: number | null | undefined;
    expiryDate?: NativeDate | null | undefined;
    isCertified?: boolean | null | undefined;
    category?: string | null | undefined;
    tags?: import("mongoose").Types.DocumentArray<{
        _id?: unknown;
        name?: string | null | undefined;
    }, import("mongoose").Types.Subdocument<unknown, any, {
        _id?: unknown;
        name?: string | null | undefined;
    }> & {
        _id?: unknown;
        name?: string | null | undefined;
    }> | null | undefined;
}, {}, {}, {}, import("mongoose").Document<unknown, {}, {
    name?: string | null | undefined;
    price?: number | null | undefined;
    expiryDate?: NativeDate | null | undefined;
    isCertified?: boolean | null | undefined;
    category?: string | null | undefined;
    tags?: import("mongoose").Types.DocumentArray<{
        _id?: unknown;
        name?: string | null | undefined;
    }, import("mongoose").Types.Subdocument<unknown, any, {
        _id?: unknown;
        name?: string | null | undefined;
    }> & {
        _id?: unknown;
        name?: string | null | undefined;
    }> | null | undefined;
}> & {
    name?: string | null | undefined;
    price?: number | null | undefined;
    expiryDate?: NativeDate | null | undefined;
    isCertified?: boolean | null | undefined;
    category?: string | null | undefined;
    tags?: import("mongoose").Types.DocumentArray<{
        _id?: unknown;
        name?: string | null | undefined;
    }, import("mongoose").Types.Subdocument<unknown, any, {
        _id?: unknown;
        name?: string | null | undefined;
    }> & {
        _id?: unknown;
        name?: string | null | undefined;
    }> | null | undefined;
} & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, Schema<any, import("mongoose").Model<any, any, any, any, any, any>, {}, {}, {}, {}, {
    versionKey: false;
}, {
    name?: string | null | undefined;
    price?: number | null | undefined;
    expiryDate?: NativeDate | null | undefined;
    isCertified?: boolean | null | undefined;
    category?: string | null | undefined;
    tags?: import("mongoose").Types.DocumentArray<{
        _id?: unknown;
        name?: string | null | undefined;
    }, import("mongoose").Types.Subdocument<unknown, any, {
        _id?: unknown;
        name?: string | null | undefined;
    }> & {
        _id?: unknown;
        name?: string | null | undefined;
    }> | null | undefined;
}, import("mongoose").Document<unknown, {}, import("mongoose").FlatRecord<{
    name?: string | null | undefined;
    price?: number | null | undefined;
    expiryDate?: NativeDate | null | undefined;
    isCertified?: boolean | null | undefined;
    category?: string | null | undefined;
    tags?: import("mongoose").Types.DocumentArray<{
        _id?: unknown;
        name?: string | null | undefined;
    }, import("mongoose").Types.Subdocument<unknown, any, {
        _id?: unknown;
        name?: string | null | undefined;
    }> & {
        _id?: unknown;
        name?: string | null | undefined;
    }> | null | undefined;
}>> & import("mongoose").FlatRecord<{
    name?: string | null | undefined;
    price?: number | null | undefined;
    expiryDate?: NativeDate | null | undefined;
    isCertified?: boolean | null | undefined;
    category?: string | null | undefined;
    tags?: import("mongoose").Types.DocumentArray<{
        _id?: unknown;
        name?: string | null | undefined;
    }, import("mongoose").Types.Subdocument<unknown, any, {
        _id?: unknown;
        name?: string | null | undefined;
    }> & {
        _id?: unknown;
        name?: string | null | undefined;
    }> | null | undefined;
}> & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}>>;
export declare function createMongooseCollections(useTables: boolean): Promise<{
    mongooseInstance: import("../src").StargateMongoose;
    Product: import("mongoose").Model<{
        name?: string | null | undefined;
        price?: number | null | undefined;
        expiryDate?: NativeDate | null | undefined;
        isCertified?: boolean | null | undefined;
        category?: string | null | undefined;
        tags?: import("mongoose").Types.DocumentArray<{
            _id?: unknown;
            name?: string | null | undefined;
        }, import("mongoose").Types.Subdocument<unknown, any, {
            _id?: unknown;
            name?: string | null | undefined;
        }> & {
            _id?: unknown;
            name?: string | null | undefined;
        }> | null | undefined;
    }, {}, {}, {}, import("mongoose").Document<unknown, {}, {
        name?: string | null | undefined;
        price?: number | null | undefined;
        expiryDate?: NativeDate | null | undefined;
        isCertified?: boolean | null | undefined;
        category?: string | null | undefined;
        tags?: import("mongoose").Types.DocumentArray<{
            _id?: unknown;
            name?: string | null | undefined;
        }, import("mongoose").Types.Subdocument<unknown, any, {
            _id?: unknown;
            name?: string | null | undefined;
        }> & {
            _id?: unknown;
            name?: string | null | undefined;
        }> | null | undefined;
    }> & {
        name?: string | null | undefined;
        price?: number | null | undefined;
        expiryDate?: NativeDate | null | undefined;
        isCertified?: boolean | null | undefined;
        category?: string | null | undefined;
        tags?: import("mongoose").Types.DocumentArray<{
            _id?: unknown;
            name?: string | null | undefined;
        }, import("mongoose").Types.Subdocument<unknown, any, {
            _id?: unknown;
            name?: string | null | undefined;
        }> & {
            _id?: unknown;
            name?: string | null | undefined;
        }> | null | undefined;
    } & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, Schema<any, import("mongoose").Model<any, any, any, any, any, any>, {}, {}, {}, {}, {
        versionKey: false;
    }, {
        name?: string | null | undefined;
        price?: number | null | undefined;
        expiryDate?: NativeDate | null | undefined;
        isCertified?: boolean | null | undefined;
        category?: string | null | undefined;
        tags?: import("mongoose").Types.DocumentArray<{
            _id?: unknown;
            name?: string | null | undefined;
        }, import("mongoose").Types.Subdocument<unknown, any, {
            _id?: unknown;
            name?: string | null | undefined;
        }> & {
            _id?: unknown;
            name?: string | null | undefined;
        }> | null | undefined;
    }, import("mongoose").Document<unknown, {}, import("mongoose").FlatRecord<{
        name?: string | null | undefined;
        price?: number | null | undefined;
        expiryDate?: NativeDate | null | undefined;
        isCertified?: boolean | null | undefined;
        category?: string | null | undefined;
        tags?: import("mongoose").Types.DocumentArray<{
            _id?: unknown;
            name?: string | null | undefined;
        }, import("mongoose").Types.Subdocument<unknown, any, {
            _id?: unknown;
            name?: string | null | undefined;
        }> & {
            _id?: unknown;
            name?: string | null | undefined;
        }> | null | undefined;
    }>> & import("mongoose").FlatRecord<{
        name?: string | null | undefined;
        price?: number | null | undefined;
        expiryDate?: NativeDate | null | undefined;
        isCertified?: boolean | null | undefined;
        category?: string | null | undefined;
        tags?: import("mongoose").Types.DocumentArray<{
            _id?: unknown;
            name?: string | null | undefined;
        }, import("mongoose").Types.Subdocument<unknown, any, {
            _id?: unknown;
            name?: string | null | undefined;
        }> & {
            _id?: unknown;
            name?: string | null | undefined;
        }> | null | undefined;
    }> & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }>>;
    Cart: import("mongoose").Model<{
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
}>;

import { Schema, Document } from 'mongoose';
export declare class Vectorize extends Schema.Types.Array {
    constructor(key: string);
    cast(val: unknown, doc: Document, init: boolean, prev: unknown, options: unknown): any;
}

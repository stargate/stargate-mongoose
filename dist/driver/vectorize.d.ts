import { Schema, Document, AnyObject } from 'mongoose';
export declare class Vectorize extends Schema.Types.Array {
    constructor(key: string, options: AnyObject);
    cast(val: unknown, doc: Document, init: boolean, prev: unknown, options: unknown): any;
}

import { Schema, Document, SchemaTypeOptions } from 'mongoose';
export interface VectorizeOptions extends SchemaTypeOptions<number[]> {
    service: {
        provider: string;
        modelName: string;
        authentication?: Record<string, unknown>;
        parameters?: Record<string, unknown>;
    };
    dimension: number;
}
export declare class Vectorize extends Schema.Types.Array {
    constructor(key: string, options: VectorizeOptions);
    cast(val: unknown, doc: Document, init: boolean, prev: unknown, options: unknown): any;
    clone(): Vectorize;
}

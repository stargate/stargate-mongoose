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
/**
 * Vectorize is a custom Mongoose SchemaType that allows you set a vector value to a string
 * for tables mode vectorize API. A Vectorize path is an array of numbers that can also be set to a string.
 */
export declare class Vectorize extends Schema.Types.Array {
    /**
     * Create a new instance of the Vectorize SchemaType. You may need to instantiate this type to add to your Mongoose
     * schema using `Schema.prototype.path()` for better TypeScript support.
     * @param key the path to this vectorize field in your schema
     * @param options vectorize options that define how to interact with the vectorize service, including the dimension
     */
    constructor(key: string, options: VectorizeOptions);
    /**
     * Cast a given value to the appropriate type. Defers to the default casting behavior for Mongoose number arrays, with
     * the one exception being strings.
     */
    cast(val: unknown, doc: Document, init: boolean, prev: unknown, options: unknown): any;
    /**
     * Overwritten to account for Mongoose SchemaArray constructor taking different arguments than Vectorize
     */
    clone(): Vectorize;
}

/**
 * Base class for stargate-mongoose-specific errors.
 */
export declare class StargateMongooseError extends Error {
    extra?: Record<string, unknown>;
    constructor(message: string, extra?: Record<string, unknown>);
}

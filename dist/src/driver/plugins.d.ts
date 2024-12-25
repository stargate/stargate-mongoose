import type { Schema, Query } from 'mongoose';
/**
 * Mongoose plugin to handle adding `$vector` to the projection by default if `$vector` has `select: true`.
 * Because `$vector` is deselected by default, this plugin makes it possible for the user to include `$vector`
 * by default from their schema.
 */
export declare function handleVectorFieldsProjection(this: Query<unknown, unknown>, schema: Schema): void;

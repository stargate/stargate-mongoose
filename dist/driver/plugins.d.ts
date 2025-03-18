import type { Schema } from 'mongoose';
/**
 * Mongoose plugin to handle adding `$vector` to the projection by default if `$vector` has `select: true`.
 * Because `$vector` is deselected by default, this plugin makes it possible for the user to include `$vector`
 * by default from their schema.
 */
export declare function handleVectorFieldsProjection(schema: Schema): void;
/**
 * Mongoose plugin to validate arrays of numbers that have a `dimension` property. Ensure that the array
 * is either nullish or has a length equal to the dimension.
 */
export declare function addVectorDimensionValidator(schema: Schema): void;

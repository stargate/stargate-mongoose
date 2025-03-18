export { Connection } from './connection';
export { Collection, OperationNotSupportedError } from './collection';
export { Vectorize } from './vectorize';
import { Connection } from './connection';
import { Mongoose } from 'mongoose';
import { handleVectorFieldsProjection } from './plugins';
export declare const plugins: (typeof handleVectorFieldsProjection)[];
export type StargateMongoose = Mongoose & {
    connection: Connection;
    connections: Connection[];
};

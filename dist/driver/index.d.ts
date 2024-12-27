export { Connection } from './connection';
export { Collection, OperationNotSupportedError } from './collection';
import { Connection } from './connection';
import { Mongoose } from 'mongoose';
import { handleVectorFieldsProjection } from './plugins';
export declare const plugins: (typeof handleVectorFieldsProjection)[];
export type StargateMongoose = Mongoose & {
    connection: Connection;
    connections: Connection[];
};

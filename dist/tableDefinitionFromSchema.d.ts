import { CreateTableDefinition } from '@datastax/astra-db-ts';
import { Schema } from 'mongoose';
/**
 * Given a Mongoose schema, create an equivalent Data API table definition for use with `createTable()`
 */
export default function tableDefinitionFromSchema(schema: Schema): CreateTableDefinition;

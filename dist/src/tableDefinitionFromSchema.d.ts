import { CreateTableDefinition } from '@datastax/astra-db-ts';
import { Schema } from 'mongoose';
export default function tableDefinitionFromSchema(schema: Schema): CreateTableDefinition;

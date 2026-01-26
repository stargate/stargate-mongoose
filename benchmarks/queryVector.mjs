import astraMongoose from '../dist/index.js';
import fs from 'node:fs/promises';
import mongoose from 'mongoose';

const { driver, tableDefinitionFromSchema } = astraMongoose;

mongoose.set('autoCreate', false);
mongoose.set('autoIndex', false);
mongoose.setDriver(driver);

const isTable = !!process.env.IS_TABLE;

await mongoose.connect(process.env.ASTRA_URI, { isAstra: true, isTable });

const vectorField = isTable ? 'vector' : '$vector';

const contentSchema = new mongoose.Schema({
  text: {
    type: String,
    required: true
  },
  [vectorField]: {
    type: [Number],
    validate: v => v == null || v.length === 512,
    default: undefined,
    dimension: 512,
    index: { name: 'content_vector', vector: true }
  }
}, { versionKey: false });
const ContentModel = mongoose.model('Content', contentSchema, 'content');

const content = await ContentModel.findOne().select({ '*': 1 }).orFail();
const $meta = [...content[vectorField]];
$meta[0] = 0.001;

const start = process.hrtime.bigint();

const totalQueries = 2000;
const parallelism = 10;

for (let i = 0; i < totalQueries; i += parallelism) {
  const batchSize = Math.min(parallelism, totalQueries - i);
  await Promise.all(
    Array.from({ length: batchSize }, () =>
      ContentModel.find().limit(10).select({ [vectorField]: 0 }).sort({ [vectorField]: { $meta } })
    )
  );
}

const end = process.hrtime.bigint();
const seconds = Number(end - start) / 1e9;

console.log(JSON.stringify({
  queries: totalQueries,
  parallelism,
  seconds: +seconds.toFixed(6),
  queriesPerSecond: +(totalQueries / seconds).toFixed(6),
  secondsPerBatch: +(seconds / (totalQueries / parallelism)).toFixed(6)
}));

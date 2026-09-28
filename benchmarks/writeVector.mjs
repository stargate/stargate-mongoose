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
}, {
  versionKey: false,
  autoCreate: false,
  collectionOptions: { vector: { dimension: 512, metric: 'cosine' } }
});
const ContentModel = mongoose.model('Content', contentSchema, 'content');

const tables = await mongoose.connection.listTables();
const collections = await mongoose.connection.listCollections();

console.log('Tables', tables);
console.log('Collections', collections);

if (isTable) {
  if (collections.find(collection => collection.name === 'content')) {
    await mongoose.connection.dropCollection('content');
  }
  await mongoose.connection.collection('content').syncTable(
    tableDefinitionFromSchema(contentSchema)
  );
} else {
  const hasTable = tables.find(table => table.name === 'content');
  const hasCollection = collections.find(collection => collection.name === 'content');

  if (hasTable) {
    await mongoose.connection.dropTable('content');
  }

  if (!hasCollection) {
    await ContentModel.createCollection();
  }
}

await ContentModel.deleteMany();
if (isTable) {
  await ContentModel.syncIndexes();
}

const moviesPath = process.env.MOVIES_JSON_PATH || './movies.json';

let movies;
try {
  const moviesRaw = await fs.readFile(moviesPath, 'utf8');
  movies = JSON.parse(moviesRaw);
} catch (err) {
  console.error(`Failed to load movies dataset from "${moviesPath}".`);
  console.error('Set the MOVIES_JSON_PATH environment variable to point to a valid movies.json file.');
  console.error('Original error:', err?.message || err);
  process.exit(1);
}
const batchSize = 20;
const start = process.hrtime.bigint();

for (let i = 0; i < movies.length; i += batchSize) {
  const batch = movies.slice(i, i + batchSize).map(m => ({
    text: [m?.title, m?.plot, m?.fullplot].filter(Boolean).join('\n\n').slice(0, 5000),
    [vectorField]: m.vector
  }));

  await ContentModel.insertMany(batch, { ordered: false });
}

const end = process.hrtime.bigint();
const seconds = Number(end - start) / 1e9;

console.log(JSON.stringify({
  inserted: movies.length,
  seconds: +seconds.toFixed(6),
  docsPerSecond: +(movies.length / seconds).toFixed(6),
  secondsPerBatch: +(seconds / (movies.length / batchSize)).toFixed(6)
}));

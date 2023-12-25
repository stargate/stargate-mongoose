import { driver } from '../';
import mongoose from 'mongoose';

mongoose.set('autoCreate', false);
mongoose.set('autoIndex', false);

mongoose.setDriver(driver);

main().then(
  () => console.log('Done'),
  err => {
    console.error(err);
    process.exit(-1);
  }
);

async function main() {
  await mongoose.connect(process.env.JSON_API_URI ?? '', {
    username: process.env.JSON_API_USERNAME,
    password: process.env.JSON_API_PASSWORD,
    authUrl: process.env.JSON_API_AUTH_URL
  } as mongoose.ConnectOptions);
  const Vector = mongoose.model(
    'Vector',
    new mongoose.Schema({
      $vector: {
        type: [Number]
      },
      prompt: {
        type: String,
        required: true
      }
    }, {
      collectionOptions: { vector: { size: 1536, function: 'cosine' } },
      autoCreate: false
    }),
    'vectors'
  );

  await Vector.db.dropCollection('vectors').catch(() => {});
  await Vector.createCollection();

  const numVectors = 1000;
  for (let i = 0; i < numVectors; ++i) {
    const $vector = Array(1536).fill(0);
    $vector[i] = 1;
    await Vector.create({ $vector, prompt: `Test ${i}` });
  }

  const $meta = [1, ...Array(1535).fill(0)];
  const start = Date.now();
  for (let i = 0; i < 100; ++i) {
    await Vector
      .findOne({})
      .sort({ $vector: { $meta } });
  }
  const results = {
    name: 'benchmark-findone-mongoose-vector',
    totalTimeMS: Date.now() - start
  };
  console.log(JSON.stringify(results, null, '  '));
}

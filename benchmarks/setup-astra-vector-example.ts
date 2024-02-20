import { driver } from '../';
import mongoose from 'mongoose';

mongoose.set('autoCreate', false);
mongoose.set('autoIndex', false);

mongoose.setDriver(driver);

main().then(
    () => { process.exit(0); },
    err => {
        console.error(err);
        process.exit(-1);
    }
);

async function main() {
  if (!process.env.ASTRA_CONNECTION_STRING) {
      throw new Error('Must set ASTRA_CONNECTION_STRING');
  }
  if (!process.env.ASTRA_COLLECTION_NAME) {
    throw new Error('Must set ASTRA_COLLECTION_NAME');
}
  await mongoose.connect(process.env.ASTRA_CONNECTION_STRING, {
      isAstra: true
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
          collectionOptions: { vector: { dimension: 1536, metric: 'cosine' } },
          autoCreate: false
      }),
      process.env.ASTRA_COLLECTION_NAME
  );

  console.log('Recreating collection...');
  await Vector.db.dropCollection(process.env.ASTRA_COLLECTION_NAME);
  await Vector.createCollection();

  console.log('Creating vectors...');
  const numVectors = 1000;
  for (let i = 0; i < numVectors; ++i) {
      console.log(`${i} / ${numVectors}`);
      const $vector = Array(1536).fill(0);
      $vector[i] = 1;
      for (let j = 0; j < 3; ++j) {
        try {
          await Vector.create({ $vector, prompt: `Test ${i}` });
          break;
        } catch (err) {
          if (j >= 2) {
            throw err;
          }
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
      
  }

  console.log('Done');
  process.exit(0);
}
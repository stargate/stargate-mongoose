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
  const Test = mongoose.model('Test', new mongoose.Schema({
    name: {
      type: String,
      required: true
    },
    email: {
      type: String,
      required: true
    },
    age: {
      type: Number
    }
  }));

  await Test.db.dropCollection('tests').catch(() => {});
  await Test.createCollection();

  await Test.create({
    name: 'John Smith',
    email: 'john@gmail.com',
    age: 30
  });

  const start = Date.now();
  for (let i = 0; i < 10000; ++i) {
    await Test.findOne({ name: 'John Smith' });
  }
  const results = {
    name: 'benchmark-findone-mongoose',
    totalTimeMS: Date.now() - start
  };
  console.log(JSON.stringify(results, null, '  '));
}

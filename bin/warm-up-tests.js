const assert = require('assert');
const astraMongoose = require('@datastax/astra-mongoose');
const mongoose = require('mongoose');

mongoose.setDriver(astraMongoose.driver);

const uri = process.env.DATA_API_URL;
const username = process.env.DATA_API_AUTH_USERNAME;
const password = process.env.DATA_API_AUTH_PASSWORD;

assert.ok(uri, 'DATA_API_URL environment variable is required');
assert.ok(username, 'DATA_API_USERNAME environment variable is required');
assert.ok(password, 'DATA_API_PASSWORD environment variable is required');

(async function main() {
  console.log('Connecting to DSE...');
  await mongoose.connect(uri, { isAstra: false, username, password });
  assert.ok(mongoose.connection.keyspaceName);

  const { databases } = await mongoose.connection.listDatabases();
  if (!databases.find(db => db.name === mongoose.connection.keyspaceName)) {
    console.log('Creating keyspace', mongoose.connection.keyspaceName);
    await mongoose.connection.createKeyspace(mongoose.connection.keyspaceName);
  }

  // Create and prime a temporary test collection
  const testCollectionName = '__mongoose_warmup__';
  console.log(`Creating temporary collection: ${testCollectionName}`);

  try {
    await mongoose.connection.db.createCollection(testCollectionName);
  } catch (err) {
    if (!/already exists/i.test(err.message)) {
      throw err;
    }
  }

  const coll = mongoose.connection.db.collection(testCollectionName);
  let attempt = 0;
  let success = false;
  let lastError;

  while (attempt < 10 && !success) {
    try {
      await coll.insertOne({ ping: true, ts: new Date() });
      await coll.deleteMany({});
      success = true;
      console.log('Warm-up successful ✅');
    } catch (err) {
      if (!(err instanceof Error) || !err.message.includes('Not enough replicas available for query')) {
        throw err;
      }
      attempt++;
      lastError = err;
      const delay = Math.pow(2, attempt) * 100; // 200, 400, 800, ...
      console.warn(`"Not enough replicas available for query" (attempt ${attempt}), retrying in ${delay}ms...`);
      await new Promise(res => setTimeout(res, delay));
    }
  }

  if (!success) {
    console.error('Warm-up failed after retries ❌');
    throw lastError;
  }

  // Drop the temporary collection
  await coll.drop();

  console.log('Cleaned up temporary collection');
  await mongoose.disconnect();
  console.log('Disconnected.');
})();

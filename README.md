# stargate-mongoose

![tests workflow](https://github.com/riptano/stargate-mongoose/actions/workflows/main.yml/badge.svg)

`stargate-mongoose` is a mongoose driver for [JSON API Server](https://github.com/stargate/jsonapi)/[Astra DB](https://astra.datastax.com).

## Table of contents

1. [Quickstart](#quickstart)
2. [Testing](#testing)
3. [Compatability](#compatability)
4. [MongoDB Driver Overriding](#nodejs-mongodb-driver-overriding-experimental)
5. [API Reference](APIReference.md)

## Quickstart

To get started, install the the package and then override the `node-mongodb-native` driver that mongoose sets up by default. After that, set up your connection to JSON API Server/Astra DB and get started! Refer to the combatability section of the README to see what will just work and what won't.

```bash
npm i -s stargate-mongoose
```

### Connect to an Astra DB/ JSON API local instance
```javascript
import mongoose from 'mongoose';
import { driver, collections } from 'stargate-mongoose';

// override the default mongodb native driver
mongoose.setDriver(driver);

//Option 1: When we have the Authentication token to pass
const astraUri = process.env.ASTRA_URI 
//where ASTRA_URI is of the following format https://${databaseId}-${region}.apps.astra.datastax.com/${keyspace}?applicationToken=${applicationToken}

// get mongoose connected to Astra
await mongoose.connect(astraUri);

//OR

//Option 2 : When we want to just pass the username and password instead of token.
//In the case of a JSON API installation, we need to pass something called 'authUrl' in addition to the user credentials to let the driver know against which authenticator this needs to be validated (for example http://localhost:8081/v1/auth)

const options:ClientOptions = {  
  options.username = process.env.STARGATE_USERNAME;
  options.password = process.env.STARGATE_PASSWORD;
  options.authUrl = process.env.STARGATE_AUTH_URL;
}
await mongoose.connect(astraUri, options);

```

## Testing

Prerequisites:
- [Docker](https://docker.com/)
- An [JSON API Server](https://github.com/stargate/jsonapi)/[Astra DB Instance](https://astra.datastax.com/) 


First, create an `.env` file in the root of your project that includes your Astra DB connection details:

```env
ASTRA_URI=http://localhost:8080/v1/testks1
STARGATE_AUTH_URL=http://localhost:8081/v1/auth
STARGATE_USERNAME=cassandra
STARGATE_PASSWORD=cassandra
```

Launch a JSON API docker container: 

```bash
bin/start_jsonapi
```

Finally, run the tests:

```
npm test
```

## Releasing

We are using [npm-publish](https://github.com/JS-DevTools/npm-publish) to handle publishing, so to publish a release to NPM, we just need to adjust the version in `package.json`.

In order to do so, form up a PR with just the version change in it with the output from the changelog in the body of the PR (generate it from the releases ui of github).

After the release PR is merged, be sure to tag it as a release (with the same release notes).

## Compatability

MongoDB and AstraDB have some key differences that this library attempts to account for. However, there are some features that are not supported at this time. The tables below cover what is supported, not supported, and in progress. Please refer to them if your application is not behaving as expected.

### Query Operators

These are operators that are available when forming a MongoDB compatible query or providing options to a Cursor.

| Operation      | Status        | Notes                                                             |
| -------------- | ------------- | ----------------------------------------------------------------- |
| $eq            | supported     |                                                                   |
| $gt            | supported     |                                                                   |
| $gte           | supported     |                                                                   |
| $in            | supported     |                                                                   |
| $lt            | supported     |                                                                   |
| $lte           | supported     |                                                                   |
| $ne            | supported     |                                                                   |
| $nin           | supported     |                                                                   |
| $and           | supported     |                                                                   |
| $not           | not supported |                                                                   |
| $nor           | not supported |                                                                   |
| $or            | supported     |                                                                   |
| $exists        | supported     |                                                                   |
| $type          | not supported |                                                                   |
| $expr          | not supported |                                                                   |
| $jsonSchema    | in progress   | [Issue](https://github.com/riptano/stargate-mongoose/issues/2) |
| $mod           | not supported |                                                                   |
| $regex         | not supported |                                                                   |
| $text          | not supported |                                                                   |
| $where         | not supported |                                                                   |
| $geoIntersects | not supported |                                                                   |
| $geoWithin     | not supported |                                                                   |
| $near          | not supported |                                                                   |
| $nearSphere    | not supported |                                                                   |
| $all           | not supported |                                                                   |
| $elemMatch     | not supported |                                                                   |
| $size          | not supported |                                                                   |
| $bitsAllClear  | not supported |                                                                   |
| $bitsAllSet    | not supported |                                                                   |
| $bitsAnyClear  | not supported |                                                                   |
| $bitsAnySet    | not supported |                                                                   |
| $              | not supported |                                                                   |
| $elemMatch     | not supported |                                                                   |
| $meta          | not supported |                                                                   |
| $slice         | not supported |                                                                   |
| $comment       | in progress   | [Issue](https://github.com/riptano/stargate-mongoose/issues/3) |
| $rand          | in progress   | [Issue](https://github.com/riptano/stargate-mongoose/issues/4) |
| projection     | supported     |                                                                   |
| sort           | not supported |                                                                   |
| skip           | not supported |                                                                   |
| limit          | supported     | The maximum page size is 20                                       |
| collation      | not supported |                                                                   |

### Update Operators

These are operators that are available when forming a MongoDB compatible update operation.

| Operation    | Status        | Notes                                                              |
| ------------ | ------------- | ------------------------------------------------------------------ |
| $addFields   | supported     |                                                                    |
| $set         | supported     |                                                                    |
| $projection  | in progress   | [Issue](https://github.com/riptano/stargate-mongoose/issues/10) |
| $unset       | in progress   | [Issue](https://github.com/riptano/stargate-mongoose/issues/10) |
| $replaceRoot | supported     |                                                                    |
| $replaceWith | supported     |                                                                    |
| upsert       | not supported |                                                                    |

### Collection Operations

These are operations that are available when working with a mongodb Collection or a Mongoose Model.

| Operation                 | Status          | Notes                                                              |
| ------------------------- | --------------- | ------------------------------------------------------------------ |
| aggregate                 | not supported   |                                                                    |
| bulkWrite                 | supported       |                                                                    |
| count                     | limited support | [Issue](https://github.com/riptano/stargate-mongoose/issues/11) |
| countDocuments            | limited support | [Issue](https://github.com/riptano/stargate-mongoose/issues/11) |
| estimatedDocumentCount    | limited support | [Issue](https://github.com/riptano/stargate-mongoose/issues/11) |
| createIndex               | not supported   |                                                                    |
| deleteMany                | supported       |                                                                    |
| deleteOne                 | supported       |                                                                    |
| distinct                  | not supported   |                                                                    |
| drop                      | supported       |                                                                    |
| dropIndex                 | not supported   |                                                                    |
| find                      | supported       |                                                                    |
| findOne                   | supported       |                                                                    |
| findOneAndDelete          | supported       |                                                                    |
| findOneAndReplace         | supported       |                                                                    |
| findOneAndUpdate          | supported       |                                                                    |
| indexExists               | not supported   |                                                                    |
| indexes                   | not supported   |                                                                    |
| indexInformation          | not supported   |                                                                    |
| initializeOrderedBulkOp   | supported       |                                                                    |
| initializeUnorderedBulkOp | supported       |                                                                    |
| insert                    | supported       |                                                                    |
| insertMany                | supported       |                                                                    |
| insertOne                 | supported       |                                                                    |
| isCapped                  | not supported   |                                                                    |
| mapReduce                 | not supported   |                                                                    |
| options                   | not supported   |                                                                    |
| rename                    | not supported   |                                                                    |
| replaceOne                | supported       |                                                                    |
| stats                     | not supported   |                                                                    |
| update                    | supported       |                                                                    |
| updateMany                | supported       |                                                                    |
| updateOne                 | supported       |                                                                    |
| watch                     | not supported   |                                                                    |

### Database Operations

These are operations that are available when working with a mongodb Db or a Mongoose Connection.

| Operation        | Status        | Notes |
| ---------------- | ------------- | ----- |
| aggregate        | not supported |       |
| collection       | supported     |       |
| collections      | supported     |       |
| listCollections  | supported     |       |
| createCollection | supported     |       |
| createIndex      | not supported |       |
| dropCollection   | supported     |       |
| dropDatabase     | not supported |       |
| renameCollection | not supported |       |
| stats            | not supported |       |
| watch            | not supported |       |

### Index Operations

MongoDB compatible index operations are not supported. There is one caveat for `ttl` indexes: When adding a document, you can add a `ttl` option (determined in seconds) that will behave in the similar way to a `ttl` index. For example, with the collections client:

```javascript
import { Client, createAstraUri } from 'stargate-mongoose';

// connect to Astra
const client = await Client.connect(process.env.ASTRA_URI);

// get a collection
const collection = client.db().collection('docs');

// insert and expire this document in 10 seconds
await collection.insertOne({ hello: 'world' }, { ttl: 10 });
```

### Aggregation Operations

MongoDB compatible aggregation operations are not supported.

### Transaction Operations

MongoDB compatible transaction operations are not supported.

## NodeJS MongoDB Driver Overriding (experimental)

If you have an application that uses the NodeJS MongoDB driver, or a dependency that uses the NodeJS MongoDB driver, it is possible to override it's use with the collections package of `stargate-mongoose`. This makes your application use Astra DB documents instead of MongoDB documents. Doing so requires code changes in your application that address the compatibility section of this README, and a change in how you set up your client connection.

If your application uses `mongodb` you can override it's usage like so:

In your app's `mongodb` `package.json` entry:

```json
"mongodb": "stargate-mongoose@0.1.0",
```

Then, re-install your dependencies

```bash
npm i
```

Finally, modify your connection so that your driver connects to Astra

```javascript
import { MongoClient, createAstraUri } from 'stargate-mongoose';

// create an Astra DB URI

// connect to Astra
const client = await MongoClient.connect(process.env.ASTRA_URI);
```

If you have an application dependency that uses `mongodb`, you can override it's usage like so (this example uses `mongoose`):

Add an override to your app's `package.json` (requires NPM 8.3+), also, add `stargate-mongoose as a dependency:

```json
"dependencies": {
    "stargate-mongoose": "^0.1.0"
},
"overrides": {
    "mongoose": {
        "mongodb":  "stargate-mongoose@0.1.0"
    }
},
```

Then, re-install your dependencies

```bash
npm i
```

Finally, modify your depdendencies connection so that your driver connects to Astra

```javascript
import mongoose from 'mongoose';
import { createAstraUri } from 'stargate-mongoose';

// create an Astra DB URI

// connect to Astra
await mongoose.connect(process.env.ASTRA_URI);
```
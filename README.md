# stargate-mongoose ![ci-tests](https://github.com/stargate/stargate-mongoose/actions/workflows/ci-tests.yml/badge.svg)

`stargate-mongoose` is a Mongoose driver for [JSON API](https://github.com/stargate/jsonapi) which runs on top of Apache Cassandra / DataStax Enterprise.

1. [Quickstart](#quickstart)
2. [Architecture](#architecture)
3. [Version compatibility](#version-compatibility)
4. [Sample Applications]()
5. [Features](#features)
6. [MongoDB Driver Overriding](#nodejs-mongodb-driver-overriding-experimental)
7. [API Reference](APIReference.md)
8. [Developer Guide](DEVGUIDE.md)

## Quickstart
Prerequisites:
npm, node, Docker (for testing the sample app locally using docker compose)
- Start `Docker` on your local machine.
- Execute the script ``bin/start_json_api.sh`` and wait for it to complete, which starts a simple JSON API on local with a DSE 6.8 (DataStax Enterprise) as database backend.
- Make a directory called `sample-app`
- `cd sample-app`
- `npm init && npm install express mongoose stargate-mongoose`
- Copy below code into a file called `index.js`
```typescript
const express = require('express');
const mongoose = require('mongoose');
const stargate_mongoose = require('stargate-mongoose');
const Schema = mongoose.Schema;
const driver = stargate_mongoose.driver;

// override the default mongodb native driver
mongoose.setDriver(driver);

//Set up mongoose
// JSON API URL
const JSON_API_URI="http://localhost:8080/v1";
//Stargate Coordinator Authentication URL
const AUTH_URL="http://localhost:8081/v1/auth";
// Define Product schema
const productSchema = new Schema({ name: String, price: Number});
// Create Product model
const Product = mongoose.model('Product', productSchema);
//Connect to server
mongoose.connect(JSON_API_URI, {
                    //Default user name
                    "username":"cassandra",
                    //Default password
                    "password":"cassandra",
                    "authUrl": AUTH_URL,
                    //Name of the Namespace
                    "keyspaceName": "inventory",
                });
//Wait for collections to get created
Object.values(mongoose.connection.models).map(Model => Model.init());

//Start the express server
const HOST="0.0.0.0";
const PORT=8097;
const app = express();
//Add product API
app.get('/addproduct', (req, res) => {
  const newProduct = new Product(
    { name:"product"+Math.floor(Math.random() * 99 + 1), 
      price: "" + Math.floor(Math.random() * 900 + 100) });
  res.send('Added a product!');
});
//Get products API
app.get('/getproducts', (req, res) => {
  Product.find()
    .then(products => res.json(products));
});
//Start server
app.listen(PORT, HOST, () => {
  console.log(`Running on http://${HOST}:${PORT}` 
              + '\nNavigate to'
              + '\n\thttp://localhost:'+PORT+'/addproducts'
              + '\n\thttp://localhost:'+PORT+'/getproducts');
});
```
- Execute `node index.js`
- Navigate to below urls
    - http://localhost:8097/addproduct
    - http://localhost:8097/getproducts

## Architecture
### High level architecture
<img src="stargate-mongoose-arch.png" alt="stargate-mongoose usage end to end architecture"/>

### Components
- Cassandra Cluster - Apache Cassandra / DataStax Enterprise Cluster as backend database.
- Stargate Coordinator Nodes - [Stargate](https://stargate.io/) is an open source Data API Gateway for Cassandra. Coordinator is one of the primary components of Stargate which connects the API layer to the backend database. More details can be found [here](https://stargate.io/docs/latest/concepts/concepts.html#stargate-v2-0).
- Stargate JSON API - [JSON API](https://github.com/stargate/jsonapi) is an open source JSON API that runs on top of Stargate's coordinator.
- JavaScript Clients that use Mongoose - Mongoose is an elegant mongodb object modeling library for node.js applications. By implementing a driver required by the Mongoose interface to connect to the JSON API instead of native mongodb access layer, now a JavaScript client can store/retrieve documents on an Apache Cassandra/DSE backend.

The current implementation of the JSON API uses DataStax Enterprise (DSE) as the backend database.

## Version compatibility
| Component/Library Name |    Version |
|------------------------|------------|
|    Mongoose  | 7.x |
|    DataStax Enterprise  | 6.8.x |

CI tests are run using the Stargate and JSON API versions specified in the [api-compatibility.versions](api-compatibility.versions) file.

## Sample Applications

Sample applications developed using `stargate-mongoose` driver are available in below repository.

https://github.com/stargate/stargate-mongoose-sample-apps

## Features

### Service Commands
| <nobr>Operation Name</nobr> |  Description    |
| ------------------- | --------------- |
| Create Namespace    | When flag `createNamespaceOnConnect` is set to `true` the keyspace passed on to the `mongoose.connect` function is created automatically when the function is invoked.

### Namespace Commands
| <nobr>Operation Name</nobr> |  Description    |
| ------------------- | --------------- |
| Create collection   | `mongoose.model('ModelName',modelSchema)` creates a collection as required |
| Drop Collection     | `model.dropCollection()` drops the collection |
| Find Collections    | Not supported |

### Collection Commands
| <nobr>Operation Name</nobr> |  Description    |
| ------------------- | --------------- |
| Count Documents     | `Model.countDocuments()` returns the count of documents
| Estimated Document Count | Not supported |
| Delete Many | `Model.deleteMany(filter)` |
| deleteOne | `Model.deleteOne(filter)` |
| find | `Model.find(filter, projection)`. Projections are yet to be supported. |
| findOne | `Model.findOne(filter, projection)` |
| findOneAndDelete | `Model.findOneAndDelete(filter)` |
| findOneAndReplace | `Model.findOneAndReplace(filter, replacement)` |
| findOneAndUpdate | `Model.findOneAndUpdate(filter, update)` |
| insertMany | `Model.insertMany([{docs}])` |
| insertOne | `Model.insertOne({doc})` |
| updateMany | `Model.updateMany(filter, update)` |
| updateOne | `Model.updateOne(filter, update)` |

### Filter Clause
| Operator |  Description    |
| ------------------- | --------------- |
| literal comparison | Equal to. Example: `{ "first_name" : "jim" }` |
| $eq | Example: `{ "first_name" : { "$eq" : "jim" } }` |
| $gt | Example (age > 25): `{ "age" : { "$gt" : 25 } }` |
| $gte | Example (age >= 25): `{ "age" : { "$gte" : 25 } }` |
| $lt | Example (age < 25): `{ "age" : { "$lt" : 25 } }` |
| $lte | Example (age <= 25): `{ "age" : { "$lte" : 25 } }` |
| $ne | Not Equal to. Example: `{ "first_name" : { "$ne" : "jim" } }` |
| $in | Example: `{ "address.city" : { "$in" : ["nyc", "la"] } }` |
| $nin | Example: `{ "address.city" : { "$nin" : ["nyc", "la"] } }` |
| $not | Example: `{ "first_name" : { "$not" : { "$eq" : "jim" }}}` |
| $exists | Example: `{ "address.city" : { "$exists" : true} }` |
| $all | Array operation. Matches if all the elements of an array matches the given values. Example: `{ "tags" : { "$all" : [ "home", "school" ] } }` |
| $elemMatch | Array operation. Matches if the elements of an array in a document matches the given conditions. Example: `{"goals": { "$elemMatch": { "$gte": 2, "$lt": 10 }}}` |
| $size | Array Operation. Example: `{ "tags" : { "$size" : 1 } }` |
| $and | Logical expression. Example : ` { "$and" : [ {first_name : “jim”}, {"age" : {"$gt" : 25 } } ] } ` |
| $or | Not supported |

### Projection Clause
| Operator |  Description    |
| ------------------- | --------------- |
| $elemMatch (projection) | Not supported |
| $slice | Array related operation. Example: `{ "tags" : { "$slice": 1 }}` returns only the first element from the array field called tags.
| $ (projection) | Not supported |

### Sort Clause
| Operator  |  Description    |
| ------------------- | --------------- |
| Multi Field Sort | Not supported |

### Update Clause
| Operator  |  Description    |
| ------------------- | --------------- |
| $inc | Example: `{ $inc: { "points" : 5 } }`
| $min | Not supported |
| $max | Not supported |
| $rename | Not supported |
| $set | Example: `"$set": {"location": "New York"}`
| $setOnInsert | Not supported |
| $unset | Example: `{"$unset" : {"password": ""}}`
| $ (update) | Not supported |
| $[] (update) | Not supported |
| $[<identifier>] | Not supported |
| $addToSet | Example: `{"$addToSet" : {"points": 10}}`. This will add 10 to an array called `points` in the documents, without duplicates (i.e. ll skip if 10 is already present in the array)
| $pop | Example: `{"$pop" : {"points": 1 }}`. This removes the last 1 item from an array called `points`. -1 will remove the first 1 item.
| $pull | Not supported |
| $push | Example. `"$push": {"tags": "work"}`. This pushes an element called `work` to the array `tags`
| $pullAll | Not supported |


### Index Operations

Index operations are not supported. There is one caveat for `ttl` indexes: When adding a document, you can add a `ttl` option (determined in seconds) that will behave in the similar way to a `ttl` index. For example, with the collections client:

```javascript
import { Client } from 'stargate-mongoose';
// connect to JSON API
const client = await Client.connect(process.env.JSON_API_URI);
// get a collection
const collection = client.db().collection('docs');
// insert and expire this document in 10 seconds
await collection.insertOne({ hello: 'world' }, { ttl: 10 });
```

### Aggregation Operations

Aggregation operations are not supported.

### Transaction Operations

Transaction operations are not supported.

## NodeJS MongoDB Driver Overriding (experimental)

If you have an application that uses the NodeJS MongoDB driver, or a dependency that uses the NodeJS MongoDB driver, it is possible to override it's use with the collections package of `stargate-mongoose`. This makes your application use JSON API documents instead of MongoDB documents. Doing so requires code changes in your application that address the features section of this README, and a change in how you set up your client connection.

If your application uses `mongodb` you can override it's usage like so:

In your app's `mongodb` `package.json` entry:

```json
"mongodb": "stargate-mongoose@0.2.0-ALPHA",
```

Then, re-install your dependencies

```bash
npm i
```

Finally, modify your connection so that your driver connects to JSON API

```javascript
import { MongoClient } from 'stargate-mongoose';

// connect to JSON API
const client = await MongoClient.connect(process.env.JSON_API_URI);
```

If you have an application dependency that uses `mongodb`, you can override it's usage like so (this example uses `mongoose`):

Add an override to your app's `package.json` (requires NPM 8.3+), also, add `stargate-mongoose as a dependency:

```json
"dependencies": {
    "stargate-mongoose": "^0.2.0-ALPHA"
},
"overrides": {
    "mongoose": {
        "mongodb":  "stargate-mongoose@0.2.0-ALPHA"
    }
},
```

Then, re-install your dependencies

```bash
npm i
```

Finally, modify your depdendencies connection so that your driver connects to JSON API

```javascript
import mongoose from 'mongoose';

// connect to JSON API
await mongoose.connect(process.env.JSON_API_URI);
```

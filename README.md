# stargate-mongoose ![tests workflow](https://github.com/riptano/stargate-mongoose/actions/workflows/main.yml/badge.svg)

`stargate-mongoose` is a mongoose driver for [JSON API Server](https://github.com/stargate/jsonapi) which runs on top of Apache Cassandra / DataStax Enterprise.

1. [Quickstart](#quickstart)
2. [Architecture](#architecture)
3. [Features](#compatability)
4. [MongoDB Driver Overriding](#nodejs-mongodb-driver-overriding-experimental)
5. [API Reference](APIReference.md)
6. [Developer Guide](DEVGUIDE.md)


## Quickstart
Prerequisites:
npm, node, Docker (for testing the sample app locally using docker compose)
- Start `Docker` on your local.
- Execute the script ``bin/start_json_api_server.sh`` and wait for it to complete, which starts a simple JSON API Server on local with a DSE 6.8 (DataStax Enterprise) as database backend.
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
    {name:"product"+Math.floor(Math.random() * 99 + 1), 
    "price:": "" + Math.floor(Math.random() * 900 + 100) });
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
- Stargate Coordinator Nodes - [Stargate](https://stargate.io/) is an opensource Data API Gateway for Cassandra. Coordinator is one of the primary components of Stargate which connects the API layer to the backend database. More details can be found [here](https://stargate.io/docs/latest/concepts/concepts.html#stargate-v2-0).
- Stargate JSON API - [JSON API Server](https://github.com/stargate/jsonapi) is an opensource JSON API that runs on top of Stargate's coordinator.
- JavaScript Clients that use mongoose - mongoose is an elegant mongodb object modeling library for node.js applications. By implementing a driver required by the mongoose interface to connect to the JSON API server instead of native mongodb access layer, now a JavaScript client can store/retrieve documents on an Apache Cassandra/DSE backend.

## Version compatibility
| Component/Library Name |    Version |
|------------------------|------------|
|    mongoose  | 7.x |
|    Stargate coordinator  | v2.0.9 |
|    JSON API Server | v1.0.0-ALPHA-2 |

CI tests run using the versions specified in the `api-compatibility.versions` file.

## Features

### Service Commands
| Operation Name      |  Description    |
| ------------------- | --------------- |
| Create Namespace    | When flag `createNamespaceOnConnect` is set to `true`, the keyspace passed on to the `mongoose.connect` function is created automatically when the function is invoked.

### Namespace Commands
| Operation Name      |  Description    |
| ------------------- | --------------- |
| Create collection   | `mongoose.model('ModelName',modelSchema)` creates a collection as required |
| Drop Collection     | `model.dropCollection()` drops the collection |
| Find Collections    | _Description to be added_ |

### Collection Commands
| Operation Name      |  Description    |
| ------------------- | --------------- |
| Count Documents     | `Model.countDocuments()` returns the count of documents
| estimatedDocumentCount | _Description to be added_
| deleteMany | _Description to be added_ |
| deleteOne | _Description to be added_
| find | _Description to be added_
| findOne | _Description to be added_
| findOneAndDelete | _Description to be added_
| findOneAndReplace | _Description to be added_
| findOneAndUpdate | _Description to be added_
| insertMany | _Description to be added_
| insertOne | _Description to be added_
| updateMany | _Description to be added_
| updateOne | _Description to be added_

### Filter Clause
| Operator            |  Description    |
| ------------------- | --------------- |
| literal comparison | _Description to be added_ |
| $eq | _Description to be added_ |
| $gt | _Description to be added_ |
| $gte | _Description to be added_ |
| $lt | _Description to be added_ |
| $lte | _Description to be added_ |
| $ne | _Description to be added_ |
| $in | _Description to be added_ |
| $nin | _Description to be added_ |
| $not | _Description to be added_ |
| $exists | _Description to be added_ |
| $all | _Description to be added_ |
| $elemMatch | _Description to be added_ |
| $size | _Description to be added_ |
| $and | _Description to be added_ |
| $or | _Description to be added_ |
| $not | _Description to be added_ |

### Projection Clause
| Operator            |  Description    |
| ------------------- | --------------- |
| $elemMatch (projection) | _Description to be added_ |
| $slice | _Description to be added_ |
| $ (projection) | _Description to be added_ |

### Sort Clause
| Operator            |  Description    |
| ------------------- | --------------- |
| Multi Field Sort | _Description to be added_ |

### Update Clause
| Operator            |  Description    |
| ------------------- | --------------- |
| $inc | _Description to be added_ |
| $min | _Description to be added_ |
| $max | _Description to be added_ |
| $mul | _Description to be added_ |
| $rename | _Description to be added_ |
| $set | _Description to be added_ |
| $setOnInsert | _Description to be added_ |
| $unset | _Description to be added_ |
| $ (update) | _Description to be added_ |
| $[] (update) | _Description to be added_ |
| $[<identifier>] | _Description to be added_ |
| $addToSet | _Description to be added_ |
| $pop | _Description to be added_ |
| $pull | _Description to be added_ |
| $push | _Description to be added_ |
| $pullAll | _Description to be added_ |


### Index Operations

Index operations are not supported. There is one caveat for `ttl` indexes: When adding a document, you can add a `ttl` option (determined in seconds) that will behave in the similar way to a `ttl` index. For example, with the collections client:

```javascript
import { Client } from 'stargate-mongoose';
// connect to JSON API Server
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

If you have an application that uses the NodeJS MongoDB driver, or a dependency that uses the NodeJS MongoDB driver, it is possible to override it's use with the collections package of `stargate-mongoose`. This makes your application use JSON API Server documents instead of MongoDB documents. Doing so requires code changes in your application that address the compatibility section of this README, and a change in how you set up your client connection.

If your application uses `mongodb` you can override it's usage like so:

In your app's `mongodb` `package.json` entry:

```json
"mongodb": "stargate-mongoose@0.2.0-ALPHA",
```

Then, re-install your dependencies

```bash
npm i
```

Finally, modify your connection so that your driver connects to JSON API Server

```javascript
import { MongoClient } from 'stargate-mongoose';

// connect to JSON API Server
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

Finally, modify your depdendencies connection so that your driver connects to JSON API Server

```javascript
import mongoose from 'mongoose';

// connect to JSON API Server
await mongoose.connect(process.env.JSON_API_URI);
```
# Benchmarks

Each `benchmark-*.ts` file is a separate benchmark that tests different functionality.
Benchmarks use either stargate-mongoose or the Axios HTTP client directly; this is to check whether stargate-mongoose is adding significant overhead or not.

## Running Benchmarks

The easiest way to run all benchmarks is using the following npm command:

```
npm run benchmarks
```

This will run all benchmarks, and output results to both stdout and `.out` files in the `benchmarks` directory.

You can also run benchmarks individually using `ts-node` as follows:

```
$ ./node_modules/.bin/ts-node -r ./benchmarks/setup.ts ./benchmarks/benchmark-findone-mongoose.ts
{
  "name": "benchmark-findone-mongoose",
  "totalTimeMS": 14944
}
```

The `benchmarks/.env.benchmark` contains environment variables that configure the connection details for the benchmarks.
The `benchmarks/setup.ts` file sets up the environment using [dotenv](https://npmjs.com/package/dotenv).

## Astra Benchmarks

There are 3 benchmarks that connect to Astra, rather than local JSON API:

* `benchmark-findone-axios-vector-astra.ts`
* `benchmark-findone-mongoose-vector-astra.ts`
* `benchmark-findone-mongoose-vector-astra-http2.ts`

By default, these benchmarks are skipped:

```
$ ./node_modules/.bin/ts-node -r ./benchmarks/setup.ts ./benchmarks/benchmark-findone-mongoose-vector-astra
{"name":"benchmark-findone-mongoose-vector-astra"}
```

To run these benchmarks, you need to add the following environment variables to `.env.benchmark`:

```
ASTRA_CONNECTION_STRING=
ASTRA_COLLECTION_NAME=
```

`ASTRA_CONNECTION_STRING` contains the connection string that will be passed to `mongoose.connect()`, like `https://abc-us-east-2.apps.astra.datastax.com/api/json/v1/mykeyspace?applicationToken=AstraCS:...`, and `ASTRA_COLLECTION_NAME` is the name of the collection that the Mongoose model will connect to.
The Astra benchmarks assume that there is already a collection with data set up in Astra.

With these environment variables set up, you can run the Astra benchmarks:

```
$ ./node_modules/.bin/ts-node -r ./benchmarks/setup.ts ./benchmarks/benchmark-findone-mongoose-vector-astra
{
  "name": "benchmark-findone-mongoose-vector-astra",
  "totalTimeMS": 20966
}
```

If you add `ASTRA_CONNECTION_STRING` to `.env.benchmark`, be careful not to accidentally commit your changes to git.
An alternative approach is to set the environment variables in your CLI command as follows:

```
$ env ASTRA_CONNECTION_STRING="https://abc-us-east-2.apps.astra.datastax.com/..." env ASTRA_COLLECTION_NAME=mycollection ./node_modules/.bin/ts-node -r ./benchmarks/setup.ts ./benchmarks/benchmark-findone-mongoose-vector-astra
{
  "name": "benchmark-findone-mongoose-vector-astra",
  "totalTimeMS": 20436
}
```

# Contents
1. [Build & Run tests locally](#build--test)
2. [Update Stargate and Data API versions](#update-stargate-and-data-api-versions)
3. [Build API Reference Documentation](#build-api-reference-documentation)
4. [Contributing](CONTRIBUTING.md)
5. [Creating a release](#publishing-to-npm-registry)

## Build & Test

Prerequisites:
- [Docker](https://docker.com/) / [Data API](https://github.com/stargate/data-api)

### Build
```shell
npm install
npm run build
```

### Test
- Start Docker
- Start Data API
```shell
bin/start_data_api.sh
```
- Copy the `.env.example` file and create a new `.env` file that should have all the connection details as shown below.

```env
DATA_API_URI=http://localhost:8181/v1/testks1
STARGATE_AUTH_URL=http://localhost:8081/v1/auth
STARGATE_USERNAME=cassandra
STARGATE_PASSWORD=cassandra
```
- Run the tests
```shell
npm run test
```

### Lint
Run `npm run lint` to run ESLint.
ESLint will point out any formatting and code quality issues it finds.
ESLint can automatically fix some issues: run `npm run lint -- --fix` to tell ESLint to automatically fix what issues it can.
You should try to run `npm run lint` before committing to minimize risk of regressions.

## Update Stargate and Data API versions

Stargate and the Data API versions are maintained in the file `api-compatibility.versions`. Update the versions accordingly, submit a PR and make sure that the GitHub Actions that verify the new versions run fine.

## Debug Mode

Astra-mongoose supports Mongoose's `debug` mode for logging calls at the Mongoose driver layer.
Note that Mongoose debug mode logs function calls as they come in to astra-mongoose Collection instances as defined in `src/drivers/collection.ts`, **not** the requests sent to Data API.

```ts
import mongoose from 'mongoose';
import { driver } from 'astra-mongoose';

mongoose.set('debug', true); // Log to console
// Can also log to a custom function as follows:
// mongoose.set('debug', (collectionName: string, fnName: string, ...args: unknown[]) => { /* handle logging here */ });
mongoose.setDriver(driver);
```

Astra-mongoose also supports astra-db-ts' logging to enable logging requests sent to Data API.

```ts
import mongoose from 'mongoose';
import { driver } from 'astra-mongoose';

mongoose.setDriver(driver);
mongoose.connect(process.env.ASTRA_URI, {
  logging: 'all' // astra-db-ts logging config
});

const TestModel = mongoose.model('Test', mongoose.Schema({ name: String }), 'test');

// Listen to astra-db-ts events directly on the astra-db-ts collection or table.
mongoose.connection.collection('test').collection.on('commandStarted', ev => {
  console.log(ev);
});


await TestModel.findOne(); // Prints "CommandStartedEvent { ... }"
```

Astra-mongoose's tests use the above pattern to log requests sent to Data API.
To debug commands sent to Data API in astra-mongoose's tests, you can enable test debug mode as follows:

```
env D=1 npm test
```

## Build API Reference Documentation

API Documentation of this library is generated using [jsdoc-to-markdown](https://github.com/jsdoc2md/jsdoc-to-markdown)

Run below to generate API documentation. This takes the `APIReference.hbs` and the library code as input and generates APIReference.md file.
```shell
npm run build:docs
```

## Publishing to npm registry

We are using [npm-publish](https://github.com/JS-DevTools/npm-publish) to handle publishing.
So to publish a release to NPM, we need to
- Create a branch out of 'main' and change `version` in the `package.json` as needed.
- Run `npm install` (this will update `src/version.ts` file).
- Run `npm run build`
- Submit a PR and get that merged into `main` branch
- Check out 'main' branch & pull the latest
```shell
 git checkout main
 git pull origin main
```
- Then create a tag with the required version, prefixed with 'rel-'. This will trigger a workflow that publishes the current version to npm. For example: `rel-0.2.0-ALPHA`
```
git tag rel-x.y.z
git push origin rel-x.y.z
```
- Finally, check the astra-mongoose npm registry page https://www.npmjs.com/package/astra-mongoose and make sure the latest version is updated.

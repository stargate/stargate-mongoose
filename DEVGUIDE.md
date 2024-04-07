
# Contents
1. [Build & Run tests locally](#build--test)
2. [Debug Mode](#debug-mode)
3. [Update Stargate and Data API versions](#update-stargate-and-data-api-versions)
4. [Build API Reference Documentation](#build-api-reference-documentation)
5. [Contributing](CONTRIBUTING.md)
6. [Creating a release](#publishing-to-npm-registry)

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

## Debug Mode

You can make stargate-mongoose print all HTTP requests to the console using the `logger` option as follows.

```ts
import { logger } from 'stargate-mongoose';

logger.setLevel('http');
```

Once you've enabled the `http` logging level, you should see every HTTP request and response logged to the console in a format similar to the following:

```
http: --- request POST http://localhost:8181/v1/testks1 {
  "deleteCollection": {
    "name": "collection1"
  }
}
http: --- response 200 POST http://localhost:8181/v1/testks1 {
  "status": {
    "ok": 1
  }
}
```

When running tests, you can turn on the `http` logging level by setting the `D` environment variable as follows:

```
env D=1 npm test
```

[Stargate-mongoose's tests automatically enable `http` logging level if the `D` environment variable is set](https://github.com/stargate/stargate-mongoose/blob/913a6c6934d40848fb89eb5d8763492ee6445ddf/tests/setup.ts#L20-L25).
Otherwise, all console output is suppressed using `logger.silent = true`.
This means there's no way to enable console output without setting the `D` environment variable when running `npm test`.

## Update Stargate and Data API versions

Stargate and the Data API versions are maintained in the file `api-compatibility.versions`. Update the versions accordingly, submit a PR and make sure that the GitHub Actions that verify the new versions run fine.


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
- Finally, check the stargate-mongoose npm registry page https://www.npmjs.com/package/stargate-mongoose and make sure the latest version is updated.

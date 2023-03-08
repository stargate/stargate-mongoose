
# Contents
1. [Build & Run tests locally](#build--test)
2. [Build API Reference Documentation](#build-api-reference-documentation)
3. [Contributing](CONTRIBUTING.md)
4. [Creating a release](#releasing)

## Build & Test

Prerequisites:
- [Docker](https://docker.com/) / [JSON API Server](https://github.com/stargate/jsonapi)

### Build
- Run `npm install && npm run build`

### Test
- Start Docker
- Start JSON API Server 
```shell
bin/start_json_api_server.sh
```
- Copy the `.env.example` file and create a new `.env` file that should have all of the connection details as shown below.

```env
JSON_API_URI=http://localhost:8080/v1/testks1
STARGATE_AUTH_URL=http://localhost:8081/v1/auth
STARGATE_USERNAME=cassandra
STARGATE_PASSWORD=cassandra
```
- Run the tests
```shell
npm run test
```

## Build API Reference Documentation

API Documentation of this library is generated using [jsdoc-to-markdown](https://github.com/jsdoc2md/jsdoc-to-markdown)

Run below to genreate API documentation. This takes the `APIReference.hbs` and the library code as input and generates APIReference.md file.
```shell
npm run build:docs
```

## Releasing

We are using [npm-publish](https://github.com/JS-DevTools/npm-publish) to handle publishing, so to publish a release to NPM, we just need to adjust the version in `package.json`.

In order to do so, form up a PR with just the version change in it with the output from the changelog in the body of the PR (generate it from the releases ui of github).

After the release PR is merged, be sure to tag it as a release (with the same release notes).
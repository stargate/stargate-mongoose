# Agent Notes

## Project Purpose

- This package integrates Data API and Astra with Mongoose. End users are expected to use Mongoose APIs, not the driver implementation in `src/driver/*` directly.
- Code in the driver can rely on Mongoose's call patterns. For example, Mongoose already clones user-provided objects before passing options into the driver and consistently passes options objects, so driver code may mutate passed-in options and does not need to support `null` options unless Mongoose itself can pass `null`.
- Astra integration always goes through `@datastax/astra-db-ts`; do not bypass it with direct HTTP calls or duplicate Data API client behavior here.
- When using tables, users are responsible for creating and managing tables themselves. This project should not add automatic table lifecycle management beyond explicit user/API calls.

## Project Shape

- Public exports and Mongoose module augmentation live in `src/index.ts`.
- Mongoose driver integration lives in `src/driver/*`.
- Serialization and deserialization helpers live in `src/serialize.ts` and `src/deserializeDoc.ts`.
- Schema-to-table helpers live in `src/tableDefinitionFromSchema.ts` and `src/udt/*`.
- Tests live in `tests/*`; shared integration fixtures are in `tests/fixtures.ts` and `tests/mongooseFixtures.ts`.
- The driver's `Collection` class can wrap either an Astra collection or an Astra table depending on connection options.

## Do Not Edit Generated Files

- `dist/`
- `coverage/`
- `.nyc_output/`
- `APIReference.md` unless intentionally running `npm run build:docs`
- `src/version.ts` unless intentionally running `npm run update-version-file`

## Common Commands

- Install dependencies: `npm install`
- Lint: `npm run lint`
- Build package: `npm run build`
- Typecheck tests and source: `npm run build:test`
- Generate API docs: `npm run build:docs`
- Start local Data API for integration tests: `bin/start_data_api.sh`
- Run local Data API tests: `cp .env.example .env`, then `npm run test-dataapi`
- Debug Data API requests in tests: `env D=1 npm run test-dataapi`

## Test Guidance

- Prefer focused tests while developing, then run broader checks when the change touches shared driver behavior.
- To run one test file against local Data API, use:
  `env TEST_DOC_DB=dataapi node --env-file=.env ./node_modules/.bin/ts-mocha --forbid-only -p tsconfig.json tests/path/to/file.test.ts`
- Add tests near the behavior changed.
- Collection/table behavior often needs coverage for both collections and tables.
- Tests generally should delete all documents after use, not drop collections or tables. Keeping collections/tables around is intentional for performance so the suite stays fast.
- Unsupported MongoDB or Mongoose APIs should throw `OperationNotSupportedError` with a readable message.

## Style Notes

- Keep code compatible with Node >=20 and the Mongoose peer range in `package.json`.
- Follow the existing TypeScript style: 4-space indentation, semicolons, single quotes.
- Keep driver behavior aligned with Mongoose expectations first, then map to `@datastax/astra-db-ts` behavior.

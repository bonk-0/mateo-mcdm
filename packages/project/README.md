# @mateo/project

The `.mateo` project file (sub-phase P1.8, `docs/plan.md` §4, §5 and §13): schema, migrations, storage adapters, the repository API the UI uses, snapshots, and undo/redo for model edits. The file format itself is documented in [`docs/project-file.md`](../../docs/project-file.md).

Like the engine, this package has no UI or DOM imports. The app passes the browser pieces in (SQLite module, file store, `navigator.locks`).

| Folder            | What it holds                                                                |
| ----------------- | ---------------------------------------------------------------------------- |
| `src/model`       | In-memory project model, cell values, ids, structural validation             |
| `src/schema`      | Frozen schema version 1, migration list and runner, file identification      |
| `src/sql`         | `SqlConnection` and `StorageAdapter`, the interface both storages implement  |
| `src/storage`     | SQLite WebAssembly adapter, browser file stores, project locks               |
| `src/repository`  | `createProjectRepository`, `ProjectSession`, load, incremental save, records |
| `src/history`     | `History` (undo/redo) and the model edit commands                            |
| `src/autosave.ts` | The autosave hook                                                            |
| `src/recent.ts`   | Recent projects list                                                         |
| `src/messages`    | English and Turkish texts for error and command keys                         |
| `src/testing`     | Test helpers: sample project, test storage                                   |

## Using it

```ts
import {
  createAutosave,
  createProjectRepository,
  createRecentProjects,
  createWasmStorage,
  opfsFileStore,
  webProjectLocks,
  setCells,
  crispCell,
} from '@mateo/project';
import sqlite3InitModule from '@sqlite.org/sqlite-wasm';

// The app loads SQLite, picks where files live and shares locks between its tabs.
const storage = createWasmStorage({
  sqlite3: () => sqlite3InitModule(),
  files: opfsFileStore(await navigator.storage.getDirectory()),
  locks: webProjectLocks(navigator.locks),
});

const repository = createProjectRepository({
  storage,
  appVersion: __APP_VERSION__,
  recent: createRecentProjects(localStorage),
});

const session = await repository.create('Suppliers.mateo', { name: 'Suppliers' });
// or: await repository.open(path, { beforeMigrate: offerBackup })

const autosave = createAutosave(session, { onError: showSaveError });

session.execute(
  setCells(datasetId, matrixId, [{ alternativeId, criterionId, value: crispCell(4.2) }]),
);
session.undo();
session.redo();

session.subscribe(() => render(session.document, session.isDirty));

const analysis = await session.addAnalysis({
  datasetId,
  record: runMethod(method, input, params), // from @mateo/engine
  methodInput: input,
  numberType: 'crisp',
});

await autosave.flush();
await session.close();
```

## Things to know

**Document and records.** The document (project name, model, settings) lives in memory as immutable data; edits are synchronous and `save` writes only what changed. Records (snapshots, analyses, source files, import profiles and history) are written by the call that creates them and read on demand, because traces and files can be large.

**Undo/redo.** A command is a pure function from one model to the next (`src/history/commands.ts` has the edits the editor needs). The history keeps earlier states, which share all unchanged parts, so undo is exact. `isDirty` compares with the last saved state, so undoing back to it makes the project clean again. Add new commands as plain objects with a `type`, a `labelKey` and `apply`.

**Errors.** Everything thrown is a `ProjectError` with a stable `code` and a `messageKey`; `PROJECT_MESSAGES` has the English and Turkish texts. `NEWER_SCHEMA` is the one users will meet: the file was written by a newer Mateo and was not touched.

**Exact numbers.** Model numbers are stored as JSON text. Do not add `REAL` columns for values that must round-trip; see the format document.

**Storage.** `SqlConnection` is deliberately small: `select`, an atomic list of statements, and `copyTo`; there is no `begin`/`commit`, so a transaction is never left open between calls. `createWasmStorage` implements it with SQLite WebAssembly on an in-memory copy of the file, writing the whole file back to the `FileStore` after each transaction; with `locks` a project is open in one tab at a time (`IN_USE` otherwise). Why this design and what it costs: [`docs/project-file.md`](../../docs/project-file.md#storage). Tests run the real SQLite WebAssembly build over in-memory files (`src/testing/harness.ts`).

## Changing the schema

1. Never edit `src/schema/v1.ts` or a released migration.
2. Append a migration to `MIGRATIONS`. A change without SQL (a new cell kind, number type or role) is still a migration.
3. Before that, save a fixture written by the current version next to `src/__fixtures__/project-v1.mateo`, and extend `src/schema/migrations.test.ts`.
4. Update `docs/project-file.md`.

## Commands

```sh
pnpm --filter @mateo/project test            # unit and contract tests
pnpm --filter @mateo/project test:coverage   # fails below 90 % line coverage
```

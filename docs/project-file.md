# The `.mateo` project file

A Mateo project is one file with the extension `.mateo`. It is an ordinary SQLite database, so it is transactional, can be inspected with any SQLite tool, and can be copied or sent like any other document. This page describes the format. The code is in [`packages/project`](../packages/project/README.md).

**Status:** schema version 1 (sub-phase P1.8).

## Identification and versioning

| What | Where | Value |
|---|---|---|
| File type | `PRAGMA application_id` | `0x4D415445` (ASCII `MATE`) |
| Schema version | `PRAGMA user_version` | `1` |
| Journal | file header | rollback journal (never WAL), so the file never depends on side files |

Opening a file follows these rules, in this order, and nothing is written before the file is accepted:

1. Not an SQLite database, or a different application id: **not a Mateo project**.
2. Schema version higher than the app knows: **written by a newer Mateo**. The file is not modified and the user is told to update.
3. Schema version lower than current: the file is **migrated**, one version at a time. Each step is one transaction that includes the version bump, so a file is always entirely at one version. A failed step leaves the file at the last completed version. The app is told before migrating (to offer a backup), because older versions of Mateo cannot open an upgraded file.

### Rules for changing the format

- A released schema is frozen. `packages/project/src/schema/v1.ts` must never change; a test compares its hash.
- Every change is a new migration appended to `MIGRATIONS` in `packages/project/src/schema/migrations.ts`, together with a fixture file written by the previous version and a test that upgrades it.
- A change that needs no SQL still needs a migration: a new cell kind, number type, matrix role or criterion direction. The version bump is what makes an older Mateo refuse the file instead of misreading it. Readers reject unknown values as corruption.
- JSON documents stored in the file that have their own shape carry their own format version next to them (`snapshots.format_version`, `analyses.trace_format_version`, `import_profiles.format_version`), so immutable records are upgraded when read and never rewritten.

## Conventions

- All tables are `STRICT`.
- Ids are text. Mateo generates UUIDs; any id must match `[A-Za-z0-9][A-Za-z0-9._:-]{0,63}` and is unique in the whole file among datasets, criteria, alternatives, matrices and scales.
- Timestamps are ISO 8601 UTC text, for example `2026-01-01T12:00:00.000Z`.
- `position` is the zero-based index in the parent's ordered list.
- **Numbers of the model are stored as JSON text, not as SQL `REAL`.** Text written and parsed by JavaScript round-trips every IEEE 754 double exactly (including `-0`), whichever driver carries it. `NaN` and infinities cannot be stored. For ad-hoc queries use `CAST(value AS REAL)` or `json_extract`.
- Columns holding JSON have a `json_valid` check.

## Tables

### The document

Kept in memory while a project is open and written by "save".

| Table | Content |
|---|---|
| `project` | One row: `id`, `name`, `description`, `created_at`, `updated_at`, `created_with` and `updated_with` (app versions). |
| `settings` | Project settings: `key` → JSON `value`. |
| `scales` | Linguistic scales used by the project: `name` (text reference), `source_id` (the predefined scale it was copied from), `number_type` (`tfn`). |
| `scale_terms` | Terms of a scale in order: `id` (unique in the scale), `label` (text reference), `abbreviation`, `value` (`[l,m,u]`). |
| `datasets` | Decision problems: `name`, `description`, `created_at`. |
| `criteria` | Per dataset: `code` (the visible id such as `C1`), `name`, `description`, `direction` (`benefit` or `cost`), `unit`, `number_type` (`crisp` or `tfn`), `scale_id`. |
| `alternatives` | Per dataset: `code`, `name`, `description`, `group_name`. |
| `matrices` | Per dataset: `name`, `role` (`decision`). Phase 1 uses one matrix per dataset. |
| `cells` | One row per non-empty cell: `matrix_id`, `alternative_id`, `criterion_id`, `kind`, `value`. |

A text reference is JSON `{"key": "…"}` for built-in, translated text or `{"text": "…"}` for text the user typed.

Cell kinds:

| `kind` | `value` | Meaning |
|---|---|---|
| `crisp` | `12.5` | A number. |
| `tfn` | `[1,2,3]` | A triangular fuzzy number `(l, m, u)`. |
| `term` | `"H"` | A linguistic term, by its id in the scale of the cell's criterion. |

An empty cell has no row: Mateo never stores an invented value. The file accepts any finite numbers; whether a TFN is ordered or a value suits a method is decided by validation in the engine and the editor.

### Records

Written when they are created and read on demand.

| Table | Content |
|---|---|
| `source_files` | Imported files, unchanged: `name`, `media_type`, `byte_size`, `sha256`, `content` (BLOB). |
| `import_profiles` | Reusable import mappings: `name`, `definition` (JSON owned by `@mateo/io`), `format_version`. |
| `imports` | Import history: `dataset_id`, `source_file_id`, `profile_id`, `details` and `issues` (JSON). |
| `snapshots` | Immutable states of one dataset, see below. |
| `analyses` | Stored method runs, see below. |
| `schema_migrations` | Which migrations were applied, when and by which app version. |

Records refer to datasets by id without a foreign key: an analysis or an import entry outlives its dataset.

### Snapshots

A snapshot is the state of one dataset (criteria, alternatives, matrices with cells) plus the scales its criteria use, as canonical JSON (object keys sorted). Its `id` is the SHA-256 of that text. This gives three properties:

- the same model state always has the same snapshot, so repeated runs share one;
- a snapshot can be verified when it is read;
- "is this analysis still up to date?" is a comparison of two ids.

A trigger rejects any update of a snapshot except its `label`, which marks a snapshot the user keeps as a named version (the basis for P3.10). A snapshot is deleted with the last analysis that uses it unless it has a label.

### Analyses

One row per run, as required by `docs/plan.md` §13:

| Column | Content |
|---|---|
| `snapshot_id` | The model state the run was made on. |
| `method_id`, `method_version` | From the engine's run record. |
| `number_type`, `variant` | What the run worked with. |
| `parameters` | Every parameter with the value used, defaults included. |
| `method_input` | The exact input given to the engine, so a re-run needs no reconstruction. |
| `configuration` | How the input was assembled (which matrix, weight source…). Owned by the workspace. |
| `result`, `warnings`, `trace` | From the engine's run record. `trace_format_version` is the engine's `TRACE_FORMAT_VERSION`. |
| `app_version`, `created_at` | Which Mateo ran it and when. |
| `name` | The only column that may change. A trigger rejects every other update. |

## Storage

| Build | Adapter | How |
|---|---|---|
| Desktop | Tauri SQL plugin | The file on disk is the database. Each transaction is sent as one call. |
| Browser | SQLite WebAssembly | The file is loaded into memory and written back whole, to the origin private file system or IndexedDB, after each transaction. |

Both produce the same bytes-level format, so a project made in one opens in the other.

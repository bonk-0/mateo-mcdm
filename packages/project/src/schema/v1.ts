/**
 * Schema version 1 of the `.mateo` project file.
 *
 * FROZEN. Files written with this schema exist on users' disks, so these statements must
 * never change: a test compares their hash. Any change to the format is a new migration
 * in `./migrations.ts`. The format is described in `docs/project-file.md`.
 *
 * Conventions:
 * - Every table is STRICT: a value of the wrong type is an error, never a silent cast.
 * - Ids are text (UUIDs), timestamps are ISO 8601 UTC text.
 * - Columns holding JSON are TEXT with a `json_valid` check. Numbers inside them are
 *   written and parsed by JavaScript only, which keeps every double exact.
 * - Enumerated text columns (direction, number type, role, kind) have no CHECK: adding a
 *   value bumps the schema version instead of rebuilding tables. Readers reject unknown
 *   values.
 * - `position` is the index in the parent's ordered list.
 */
export const SCHEMA_V1: readonly string[] = [
  // One row: the project itself.
  `CREATE TABLE project (
    singleton INTEGER PRIMARY KEY NOT NULL CHECK (singleton = 1),
    id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    created_with TEXT NOT NULL,
    updated_with TEXT NOT NULL
  ) STRICT`,

  // Which migrations brought the file to its current version, for support and debugging.
  `CREATE TABLE schema_migrations (
    version INTEGER PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    applied_at TEXT NOT NULL,
    app_version TEXT NOT NULL
  ) STRICT`,

  `CREATE TABLE settings (
    key TEXT PRIMARY KEY NOT NULL,
    value TEXT NOT NULL CHECK (json_valid(value))
  ) STRICT`,

  // Linguistic scales. `name` and `label` are TextRef JSON: {"key": ...} or {"text": ...}.
  `CREATE TABLE scales (
    id TEXT PRIMARY KEY NOT NULL,
    position INTEGER NOT NULL,
    name TEXT NOT NULL CHECK (json_valid(name)),
    source_id TEXT,
    number_type TEXT NOT NULL
  ) STRICT`,

  `CREATE TABLE scale_terms (
    scale_id TEXT NOT NULL REFERENCES scales (id) ON DELETE CASCADE,
    id TEXT NOT NULL,
    position INTEGER NOT NULL,
    label TEXT NOT NULL CHECK (json_valid(label)),
    abbreviation TEXT NOT NULL,
    value TEXT NOT NULL CHECK (json_valid(value)),
    PRIMARY KEY (scale_id, id)
  ) STRICT, WITHOUT ROWID`,

  `CREATE TABLE datasets (
    id TEXT PRIMARY KEY NOT NULL,
    position INTEGER NOT NULL,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    created_at TEXT NOT NULL
  ) STRICT`,

  `CREATE TABLE criteria (
    id TEXT PRIMARY KEY NOT NULL,
    dataset_id TEXT NOT NULL REFERENCES datasets (id) ON DELETE CASCADE,
    position INTEGER NOT NULL,
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    direction TEXT NOT NULL,
    unit TEXT NOT NULL,
    number_type TEXT NOT NULL,
    scale_id TEXT REFERENCES scales (id) ON DELETE SET NULL
  ) STRICT`,
  `CREATE INDEX criteria_by_dataset ON criteria (dataset_id, position)`,
  `CREATE INDEX criteria_by_scale ON criteria (scale_id)`,

  `CREATE TABLE alternatives (
    id TEXT PRIMARY KEY NOT NULL,
    dataset_id TEXT NOT NULL REFERENCES datasets (id) ON DELETE CASCADE,
    position INTEGER NOT NULL,
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    group_name TEXT NOT NULL
  ) STRICT`,
  `CREATE INDEX alternatives_by_dataset ON alternatives (dataset_id, position)`,

  `CREATE TABLE matrices (
    id TEXT PRIMARY KEY NOT NULL,
    dataset_id TEXT NOT NULL REFERENCES datasets (id) ON DELETE CASCADE,
    position INTEGER NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL
  ) STRICT`,
  `CREATE INDEX matrices_by_dataset ON matrices (dataset_id, position)`,

  // One row per non-empty cell. `kind` is crisp, tfn or term; `value` is JSON text:
  // a number, [l,m,u] or a term id string.
  `CREATE TABLE cells (
    matrix_id TEXT NOT NULL REFERENCES matrices (id) ON DELETE CASCADE,
    alternative_id TEXT NOT NULL REFERENCES alternatives (id) ON DELETE CASCADE,
    criterion_id TEXT NOT NULL REFERENCES criteria (id) ON DELETE CASCADE,
    kind TEXT NOT NULL,
    value TEXT NOT NULL CHECK (json_valid(value)),
    PRIMARY KEY (matrix_id, alternative_id, criterion_id)
  ) STRICT, WITHOUT ROWID`,
  `CREATE INDEX cells_by_alternative ON cells (alternative_id)`,
  `CREATE INDEX cells_by_criterion ON cells (criterion_id)`,

  // Imported files, byte for byte as the user provided them.
  `CREATE TABLE source_files (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    media_type TEXT NOT NULL,
    byte_size INTEGER NOT NULL,
    sha256 TEXT NOT NULL,
    content BLOB NOT NULL,
    added_at TEXT NOT NULL
  ) STRICT`,

  // Saved import mappings. `definition` belongs to @mateo/io and carries its own version.
  `CREATE TABLE import_profiles (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    format_version INTEGER NOT NULL,
    definition TEXT NOT NULL CHECK (json_valid(definition)),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  ) STRICT`,

  // Import history: which file became which dataset, how, and with which warnings.
  // `dataset_id` is not a foreign key: the record outlives the dataset.
  `CREATE TABLE imports (
    id TEXT PRIMARY KEY NOT NULL,
    dataset_id TEXT,
    source_file_id TEXT REFERENCES source_files (id) ON DELETE SET NULL,
    profile_id TEXT REFERENCES import_profiles (id) ON DELETE SET NULL,
    details TEXT NOT NULL CHECK (json_valid(details)),
    issues TEXT NOT NULL CHECK (json_valid(issues)),
    imported_at TEXT NOT NULL
  ) STRICT`,
  `CREATE INDEX imports_by_source_file ON imports (source_file_id)`,
  `CREATE INDEX imports_by_profile ON imports (profile_id)`,

  // Immutable snapshots of one dataset and the scales it uses. `id` is the SHA-256 of
  // `content`, so equal states share one snapshot and a snapshot can be verified.
  `CREATE TABLE snapshots (
    id TEXT PRIMARY KEY NOT NULL,
    dataset_id TEXT NOT NULL,
    format_version INTEGER NOT NULL,
    content TEXT NOT NULL CHECK (json_valid(content)),
    label TEXT,
    created_at TEXT NOT NULL
  ) STRICT`,
  `CREATE INDEX snapshots_by_dataset ON snapshots (dataset_id, created_at)`,
  `CREATE TRIGGER snapshots_immutable
    BEFORE UPDATE OF id, dataset_id, format_version, content, created_at ON snapshots
    BEGIN
      SELECT RAISE(ABORT, 'snapshots are immutable');
    END`,

  // One row per stored method run (docs/plan.md §13). Everything except `name` is
  // immutable. `method_input` is the exact input given to the engine.
  `CREATE TABLE analyses (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    dataset_id TEXT NOT NULL,
    snapshot_id TEXT NOT NULL REFERENCES snapshots (id) ON DELETE RESTRICT,
    method_id TEXT NOT NULL,
    method_version TEXT NOT NULL,
    number_type TEXT NOT NULL,
    variant TEXT,
    parameters TEXT NOT NULL CHECK (json_valid(parameters)),
    configuration TEXT NOT NULL CHECK (json_valid(configuration)),
    method_input TEXT NOT NULL CHECK (json_valid(method_input)),
    result TEXT NOT NULL CHECK (json_valid(result)),
    warnings TEXT NOT NULL CHECK (json_valid(warnings)),
    trace_format_version INTEGER NOT NULL,
    trace TEXT NOT NULL CHECK (json_valid(trace)),
    app_version TEXT NOT NULL,
    created_at TEXT NOT NULL
  ) STRICT`,
  `CREATE INDEX analyses_by_snapshot ON analyses (snapshot_id)`,
  `CREATE INDEX analyses_by_dataset ON analyses (dataset_id, created_at)`,
  `CREATE TRIGGER analyses_immutable
    BEFORE UPDATE OF id, dataset_id, snapshot_id, method_id, method_version, number_type,
      variant, parameters, configuration, method_input, result, warnings,
      trace_format_version, trace, app_version, created_at ON analyses
    BEGIN
      SELECT RAISE(ABORT, 'analysis records are immutable');
    END`,
];

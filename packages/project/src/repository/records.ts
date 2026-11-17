import {
  canonicalJson,
  decodeTrace,
  deepFreeze,
  encodeTrace,
  EngineError,
  READABLE_TRACE_FORMAT_VERSIONS,
  TRACE_FORMAT_VERSION,
  type MethodRunRecord,
  type Trace,
  type ValidationIssue,
} from '@mateo/engine';
import { bytesToHex, hexToBytes } from '../bytes';
import { ProjectError } from '../errors';
import { sha256Hex, sha256HexOfText } from '../hash';
import { decodeJson, encodeJson, type JsonValue } from '../json';
import type { Dataset, LinguisticScale, ProjectModel } from '../model/types';
import { assertValidModel } from '../model/validate';
import { SNAPSHOT_FORMAT_VERSION } from '../schema/version';
import type { SqlConnection, SqlRow, SqlStatement } from '../sql/types';
import { statement } from '../sql/types';
import { integer, nullableText, text } from './rows';

// --- Snapshots ------------------------------------------------------------------------

/** The frozen state of one dataset: the dataset and the scales its criteria use. */
export interface SnapshotContent {
  readonly dataset: Dataset;
  readonly scales: readonly LinguisticScale[];
}

export interface SnapshotInfo {
  /** SHA-256 of the stored content. Equal model states have the same snapshot id. */
  readonly id: string;
  readonly datasetId: string;
  readonly formatVersion: number;
  /** Name given by the user, for snapshots kept as versions. */
  readonly label: string | null;
  readonly createdAt: string;
}

export interface Snapshot extends SnapshotInfo {
  readonly content: SnapshotContent;
}

export interface PreparedSnapshot {
  readonly id: string;
  readonly datasetId: string;
  readonly text: string;
}

/**
 * Builds the canonical content of a snapshot of one dataset and its id. Canonical JSON
 * (sorted keys) makes the id depend on the model state only, not on how it was built.
 */
export function prepareSnapshot(model: ProjectModel, datasetId: string): PreparedSnapshot {
  const dataset = model.datasets.find((item) => item.id === datasetId);
  if (!dataset) {
    throw new ProjectError('NOT_FOUND', `There is no dataset "${datasetId}".`, { datasetId });
  }
  const used = new Set(dataset.criteria.map((criterion) => criterion.scaleId));
  const content: SnapshotContent = {
    dataset,
    scales: model.scales.filter((scale) => used.has(scale.id)),
  };
  assertValidModel({ datasets: [content.dataset], scales: content.scales }, 'INVALID_ARGUMENT');
  const canonical = canonicalJson(content);
  return { id: sha256HexOfText(canonical), datasetId, text: canonical };
}

export function insertSnapshotStatement(
  snapshot: PreparedSnapshot,
  label: string | null,
  createdAt: string,
): SqlStatement {
  return statement(
    `INSERT INTO snapshots (id, dataset_id, format_version, content, label, created_at)
     VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT (id) DO NOTHING`,
    [snapshot.id, snapshot.datasetId, SNAPSHOT_FORMAT_VERSION, snapshot.text, label, createdAt],
  );
}

function snapshotInfo(row: SqlRow): SnapshotInfo {
  return {
    id: text(row, 'snapshots', 'id'),
    datasetId: text(row, 'snapshots', 'dataset_id'),
    formatVersion: integer(row, 'snapshots', 'format_version'),
    label: nullableText(row, 'snapshots', 'label'),
    createdAt: text(row, 'snapshots', 'created_at'),
  };
}

const SNAPSHOT_COLUMNS = 'id, dataset_id, format_version, label, created_at';

export async function listSnapshots(
  connection: SqlConnection,
  datasetId?: string,
): Promise<SnapshotInfo[]> {
  const rows =
    datasetId === undefined
      ? await connection.select(`SELECT ${SNAPSHOT_COLUMNS} FROM snapshots ORDER BY created_at, id`)
      : await connection.select(
          `SELECT ${SNAPSHOT_COLUMNS} FROM snapshots WHERE dataset_id = ? ORDER BY created_at, id`,
          [datasetId],
        );
  return rows.map(snapshotInfo);
}

export async function readSnapshotInfo(
  connection: SqlConnection,
  id: string,
): Promise<SnapshotInfo> {
  const rows = await connection.select(`SELECT ${SNAPSHOT_COLUMNS} FROM snapshots WHERE id = ?`, [
    id,
  ]);
  if (!rows[0]) throw new ProjectError('NOT_FOUND', `There is no snapshot "${id}".`, { id });
  return snapshotInfo(rows[0]);
}

/** Reads a snapshot and verifies that its content still matches its id. */
export async function readSnapshot(connection: SqlConnection, id: string): Promise<Snapshot> {
  const rows = await connection.select(
    `SELECT ${SNAPSHOT_COLUMNS}, content FROM snapshots WHERE id = ?`,
    [id],
  );
  const row = rows[0];
  if (!row) throw new ProjectError('NOT_FOUND', `There is no snapshot "${id}".`, { id });
  const info = snapshotInfo(row);
  const content = text(row, 'snapshots', 'content');
  if (sha256HexOfText(content) !== info.id) {
    throw new ProjectError('CORRUPT_FILE', `Snapshot "${id}" does not match its checksum.`, { id });
  }
  if (info.formatVersion !== SNAPSHOT_FORMAT_VERSION) {
    throw new ProjectError('CORRUPT_FILE', `Snapshot "${id}" has an unknown format.`, { id });
  }
  const parsed = decodeJson(content, `snapshot "${id}"`) as SnapshotContent;
  if (typeof parsed !== 'object' || parsed === null || typeof parsed.dataset !== 'object') {
    throw new ProjectError('CORRUPT_FILE', `Snapshot "${id}" is malformed.`, { id });
  }
  assertValidModel({ datasets: [parsed.dataset], scales: parsed.scales }, 'CORRUPT_FILE');
  return deepFreeze({ ...info, content: parsed });
}

// --- Analyses -------------------------------------------------------------------------

/** What the caller provides to store a method run (docs/plan.md §13). */
export interface NewAnalysis {
  readonly name?: string;
  /** The dataset the run was made on. Its current state is snapshotted with the run. */
  readonly datasetId: string;
  /** The record returned by `runMethod` of `@mateo/engine`. */
  readonly record: MethodRunRecord<unknown>;
  /** The exact input object that was given to `runMethod`. */
  readonly methodInput: unknown;
  /** Number type the run worked with, for example `crisp` or `tfn`. */
  readonly numberType: string;
  /** Variant of the method, when it has several. */
  readonly variant?: string | null;
  /**
   * How the input was put together (which matrix, where the weights came from...). Owned
   * by the workspace that ran the method; stored as-is.
   */
  readonly configuration?: JsonValue;
}

export interface AnalysisSummary {
  readonly id: string;
  readonly name: string;
  readonly datasetId: string;
  readonly snapshotId: string;
  readonly methodId: string;
  readonly methodVersion: string;
  readonly numberType: string;
  readonly variant: string | null;
  readonly traceFormatVersion: number;
  /** Version of Mateo that ran the analysis. */
  readonly appVersion: string;
  readonly createdAt: string;
}

export interface StoredAnalysis extends AnalysisSummary {
  /** The engine's run record, exactly as it was stored. */
  readonly record: MethodRunRecord<unknown>;
  readonly methodInput: unknown;
  readonly configuration: JsonValue;
}

export function insertAnalysisStatement(
  id: string,
  snapshotId: string,
  analysis: NewAnalysis,
  appVersion: string,
  createdAt: string,
): SqlStatement {
  const { record } = analysis;
  let trace: string;
  try {
    trace = encodeJson(encodeTrace(record.trace));
  } catch (cause) {
    if (!(cause instanceof EngineError)) throw cause;
    throw new ProjectError(
      'INVALID_ARGUMENT',
      `Cannot store the trace: ${cause.message}`,
      {},
      { cause },
    );
  }
  return statement(
    `INSERT INTO analyses (
       id, name, dataset_id, snapshot_id, method_id, method_version, number_type, variant,
       parameters, configuration, method_input, result, warnings, trace_format_version, trace,
       app_version, created_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      analysis.name ?? '',
      analysis.datasetId,
      snapshotId,
      record.methodId,
      record.methodVersion,
      analysis.numberType,
      analysis.variant ?? null,
      encodeJson(record.parameters),
      encodeJson(analysis.configuration ?? {}),
      encodeJson(analysis.methodInput),
      encodeJson(record.result),
      encodeJson(record.warnings),
      TRACE_FORMAT_VERSION,
      trace,
      appVersion,
      createdAt,
    ],
  );
}

const ANALYSIS_COLUMNS = `id, name, dataset_id, snapshot_id, method_id, method_version,
  number_type, variant, trace_format_version, app_version, created_at`;

function analysisSummary(row: SqlRow): AnalysisSummary {
  return {
    id: text(row, 'analyses', 'id'),
    name: text(row, 'analyses', 'name'),
    datasetId: text(row, 'analyses', 'dataset_id'),
    snapshotId: text(row, 'analyses', 'snapshot_id'),
    methodId: text(row, 'analyses', 'method_id'),
    methodVersion: text(row, 'analyses', 'method_version'),
    numberType: text(row, 'analyses', 'number_type'),
    variant: nullableText(row, 'analyses', 'variant'),
    traceFormatVersion: integer(row, 'analyses', 'trace_format_version'),
    appVersion: text(row, 'analyses', 'app_version'),
    createdAt: text(row, 'analyses', 'created_at'),
  };
}

/** Analyses without their bulky parts, oldest first. */
export async function listAnalyses(
  connection: SqlConnection,
  datasetId?: string,
): Promise<AnalysisSummary[]> {
  const rows =
    datasetId === undefined
      ? await connection.select(`SELECT ${ANALYSIS_COLUMNS} FROM analyses ORDER BY created_at, id`)
      : await connection.select(
          `SELECT ${ANALYSIS_COLUMNS} FROM analyses WHERE dataset_id = ? ORDER BY created_at, id`,
          [datasetId],
        );
  return rows.map(analysisSummary);
}

export async function readAnalysis(connection: SqlConnection, id: string): Promise<StoredAnalysis> {
  const rows = await connection.select(
    `SELECT ${ANALYSIS_COLUMNS}, parameters, configuration, method_input, result, warnings, trace
     FROM analyses WHERE id = ?`,
    [id],
  );
  const row = rows[0];
  if (!row) throw new ProjectError('NOT_FOUND', `There is no analysis "${id}".`, { id });
  const summary = analysisSummary(row);
  if (!READABLE_TRACE_FORMAT_VERSIONS.includes(summary.traceFormatVersion)) {
    throw new ProjectError('CORRUPT_FILE', `Analysis "${id}" has an unknown trace format.`, { id });
  }
  const json = (column: string): unknown =>
    decodeJson(text(row, 'analyses', column), `${column} of analysis "${id}"`);
  const storedTrace = json('trace');
  // The document names its own format too; it must agree with the column.
  if (
    (storedTrace as { formatVersion?: unknown } | null)?.formatVersion !==
    summary.traceFormatVersion
  ) {
    throw new ProjectError(
      'CORRUPT_FILE',
      `The trace of analysis "${id}" does not have the format its record names.`,
      { id },
    );
  }
  let trace: Trace;
  try {
    trace = decodeTrace(storedTrace);
  } catch (cause) {
    if (!(cause instanceof EngineError)) throw cause;
    throw new ProjectError(
      'CORRUPT_FILE',
      `The trace of analysis "${id}" is damaged: ${cause.message}`,
      { id },
      { cause },
    );
  }
  return deepFreeze({
    ...summary,
    record: {
      methodId: summary.methodId,
      methodVersion: summary.methodVersion,
      parameters: json('parameters') as MethodRunRecord<unknown>['parameters'],
      result: json('result'),
      trace,
      warnings: json('warnings') as ValidationIssue[],
    },
    methodInput: json('method_input'),
    configuration: json('configuration') as JsonValue,
  });
}

/**
 * Deletes an analysis and, with it, its snapshot when nothing else needs that snapshot
 * (no other analysis and no label).
 */
export function deleteAnalysisStatements(id: string, snapshotId: string): SqlStatement[] {
  return [
    statement('DELETE FROM analyses WHERE id = ?', [id]),
    statement(
      `DELETE FROM snapshots WHERE id = ? AND label IS NULL
         AND NOT EXISTS (SELECT 1 FROM analyses WHERE snapshot_id = snapshots.id)`,
      [snapshotId],
    ),
  ];
}

// --- Source files ---------------------------------------------------------------------

export interface NewSourceFile {
  /** Original file name, for display. */
  readonly name: string;
  readonly mediaType?: string;
  readonly content: Uint8Array;
}

export interface SourceFileInfo {
  readonly id: string;
  readonly name: string;
  readonly mediaType: string;
  readonly byteSize: number;
  readonly sha256: string;
  readonly addedAt: string;
}

export function insertSourceFileStatement(
  id: string,
  file: NewSourceFile,
  addedAt: string,
): { statement: SqlStatement; info: SourceFileInfo } {
  const info: SourceFileInfo = {
    id,
    name: file.name,
    mediaType: file.mediaType ?? '',
    byteSize: file.content.length,
    sha256: sha256Hex(file.content),
    addedAt,
  };
  return {
    info,
    statement: statement(
      `INSERT INTO source_files (id, name, media_type, byte_size, sha256, content, added_at)
       VALUES (?, ?, ?, ?, ?, unhex(?), ?)`,
      [
        id,
        info.name,
        info.mediaType,
        info.byteSize,
        info.sha256,
        bytesToHex(file.content),
        addedAt,
      ],
    ),
  };
}

export async function listSourceFiles(connection: SqlConnection): Promise<SourceFileInfo[]> {
  const rows = await connection.select(
    'SELECT id, name, media_type, byte_size, sha256, added_at FROM source_files ORDER BY added_at, id',
  );
  return rows.map((row) => ({
    id: text(row, 'source_files', 'id'),
    name: text(row, 'source_files', 'name'),
    mediaType: text(row, 'source_files', 'media_type'),
    byteSize: integer(row, 'source_files', 'byte_size'),
    sha256: text(row, 'source_files', 'sha256'),
    addedAt: text(row, 'source_files', 'added_at'),
  }));
}

/** The stored bytes of a source file, verified against its checksum. */
export async function readSourceFile(connection: SqlConnection, id: string): Promise<Uint8Array> {
  const rows = await connection.select(
    'SELECT sha256, hex(content) AS content FROM source_files WHERE id = ?',
    [id],
  );
  const row = rows[0];
  if (!row) throw new ProjectError('NOT_FOUND', `There is no source file "${id}".`, { id });
  const bytes = hexToBytes(text(row, 'source_files', 'content'));
  if (sha256Hex(bytes) !== text(row, 'source_files', 'sha256')) {
    throw new ProjectError('CORRUPT_FILE', `Source file "${id}" does not match its checksum.`, {
      id,
    });
  }
  return bytes;
}

// --- Import profiles and import history -----------------------------------------------

export interface ImportProfile {
  readonly id: string;
  readonly name: string;
  /** Version of the `definition` format, owned by `@mateo/io`. */
  readonly formatVersion: number;
  readonly definition: JsonValue;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export function upsertImportProfileStatement(profile: ImportProfile): SqlStatement {
  return statement(
    `INSERT INTO import_profiles (id, name, format_version, definition, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT (id) DO UPDATE SET name = excluded.name, format_version = excluded.format_version,
       definition = excluded.definition, updated_at = excluded.updated_at`,
    [
      profile.id,
      profile.name,
      profile.formatVersion,
      encodeJson(profile.definition),
      profile.createdAt,
      profile.updatedAt,
    ],
  );
}

export async function listImportProfiles(connection: SqlConnection): Promise<ImportProfile[]> {
  const rows = await connection.select(
    `SELECT id, name, format_version, definition, created_at, updated_at
     FROM import_profiles ORDER BY name, id`,
  );
  return rows.map((row) => {
    const id = text(row, 'import_profiles', 'id');
    return {
      id,
      name: text(row, 'import_profiles', 'name'),
      formatVersion: integer(row, 'import_profiles', 'format_version'),
      definition: decodeJson(
        text(row, 'import_profiles', 'definition'),
        `import profile "${id}"`,
      ) as JsonValue,
      createdAt: text(row, 'import_profiles', 'created_at'),
      updatedAt: text(row, 'import_profiles', 'updated_at'),
    };
  });
}

/** One import: which source file became which dataset, how, and with which warnings. */
export interface ImportRecord {
  readonly id: string;
  readonly datasetId: string | null;
  readonly sourceFileId: string | null;
  readonly profileId: string | null;
  /** The structure decisions that were applied. Owned by `@mateo/io`; stored as-is. */
  readonly details: JsonValue;
  /** Validation issues reported by the import, stored with the dataset (plan §9). */
  readonly issues: JsonValue;
  readonly importedAt: string;
}

export function insertImportStatement(record: ImportRecord): SqlStatement {
  return statement(
    `INSERT INTO imports (id, dataset_id, source_file_id, profile_id, details, issues, imported_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      record.id,
      record.datasetId,
      record.sourceFileId,
      record.profileId,
      encodeJson(record.details),
      encodeJson(record.issues),
      record.importedAt,
    ],
  );
}

export async function listImports(connection: SqlConnection): Promise<ImportRecord[]> {
  const rows = await connection.select(
    `SELECT id, dataset_id, source_file_id, profile_id, details, issues, imported_at
     FROM imports ORDER BY imported_at, id`,
  );
  return rows.map((row) => {
    const id = text(row, 'imports', 'id');
    return {
      id,
      datasetId: nullableText(row, 'imports', 'dataset_id'),
      sourceFileId: nullableText(row, 'imports', 'source_file_id'),
      profileId: nullableText(row, 'imports', 'profile_id'),
      details: decodeJson(text(row, 'imports', 'details'), `import "${id}"`) as JsonValue,
      issues: decodeJson(text(row, 'imports', 'issues'), `import "${id}"`) as JsonValue,
      importedAt: text(row, 'imports', 'imported_at'),
    };
  });
}

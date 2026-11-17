import { deepFreeze, TRACE_FORMAT_VERSION } from '@mateo/engine';
import { ProjectError } from '../errors';
import type { Command } from '../history/history';
import { History } from '../history/history';
import type { JsonValue } from '../json';
import { encodeJson } from '../json';
import { assertValidId } from '../model/ids';
import type { ProjectDocument, ProjectModel } from '../model/types';
import { assertValidModel } from '../model/validate';
import type { SqlConnection, SqlStatement, StorageAdapter } from '../sql/types';
import { statement } from '../sql/types';
import type {
  AnalysisSummary,
  ImportProfile,
  ImportRecord,
  NewAnalysis,
  NewSourceFile,
  Snapshot,
  SnapshotInfo,
  SourceFileInfo,
  StoredAnalysis,
} from './records';
import {
  deleteAnalysisStatements,
  insertAnalysisStatement,
  insertImportStatement,
  insertSnapshotStatement,
  insertSourceFileStatement,
  listAnalyses,
  listImportProfiles,
  listImports,
  listSnapshots,
  listSourceFiles,
  prepareSnapshot,
  readAnalysis,
  readSnapshot,
  readSnapshotInfo,
  readSourceFile,
  upsertImportProfileStatement,
} from './records';
import { planModelSave, planSettingsSave } from './save';

export interface SessionEnvironment {
  readonly storage: StorageAdapter;
  readonly appVersion: string;
  /** Current time as an ISO 8601 UTC string. */
  readonly now: () => string;
  readonly newId: () => string;
  /** Called after the project was opened, saved under a new name, renamed or closed. */
  readonly onLocated: (session: ProjectSession) => void;
}

/**
 * An open project.
 *
 * Two kinds of data live in a project file, and they are handled differently:
 *
 * - The **document** (project name, model, settings) is kept in memory as immutable data.
 *   Edits are synchronous; `save` writes what changed since the last save. `isDirty` tells
 *   whether there is anything to write, and `createAutosave` saves in the background.
 * - **Records** (snapshots, analyses, source files, import profiles and history) are
 *   written to the file by the call that creates them and read on demand. They can be
 *   large and are append-mostly, so they are never held in memory as a whole.
 *
 * Model edits go through `execute` and can be undone. All file access of a session runs
 * one operation at a time, in call order.
 */
export class ProjectSession {
  /** Undo/redo of model edits. `execute`, `undo` and `redo` are shortcuts to it. */
  readonly history: History<ProjectModel>;

  private current: ProjectDocument;
  private saved: ProjectDocument;
  private where: string;
  private connection: SqlConnection;
  private closed = false;
  private queue: Promise<unknown> = Promise.resolve();
  private readonly listeners = new Set<() => void>();
  private readonly snapshotIds = new WeakMap<object, Map<string, string>>();

  /** Sessions are made by `ProjectRepository.create` and `open`. */
  constructor(
    private readonly environment: SessionEnvironment,
    connection: SqlConnection,
    location: string,
    document: ProjectDocument,
  ) {
    this.connection = connection;
    this.where = location;
    this.current = document;
    this.saved = document;
    this.history = new History(document.model);
    this.history.subscribe(() => {
      if (this.history.present !== this.current.model) {
        this.current = { ...this.current, model: this.history.present };
        this.emit();
      }
    });
  }

  /** File path (desktop) or file name (browser) of the project. */
  get location(): string {
    return this.where;
  }

  /** The current in-memory state. A new object after every change. */
  get document(): ProjectDocument {
    return this.current;
  }

  /** Whether the document differs from what the file holds. */
  get isDirty(): boolean {
    return (
      this.current.model !== this.saved.model ||
      this.current.settings !== this.saved.settings ||
      this.current.info.name !== this.saved.info.name ||
      this.current.info.description !== this.saved.info.description
    );
  }

  get isClosed(): boolean {
    return this.closed;
  }

  /** Calls `listener` after every change of `document`, `isDirty` or `location`. */
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  // --- Editing the document -----------------------------------------------------------

  /** Applies an undoable model edit. */
  execute(command: Command<ProjectModel>): void {
    this.assertOpen();
    this.history.execute({
      ...command,
      apply: (model) => {
        const next = command.apply(model);
        return next === model ? model : deepFreeze(next);
      },
    });
  }

  undo(): void {
    this.assertOpen();
    this.history.undo();
  }

  redo(): void {
    this.assertOpen();
    this.history.redo();
  }

  /** Renames or re-describes the project. Not part of undo. */
  setInfo(patch: { readonly name?: string; readonly description?: string }): void {
    this.assertOpen();
    const info = {
      ...this.current.info,
      name: patch.name ?? this.current.info.name,
      description: patch.description ?? this.current.info.description,
    };
    if (
      info.name === this.current.info.name &&
      info.description === this.current.info.description
    ) {
      return;
    }
    this.current = deepFreeze({ ...this.current, info });
    this.emit();
  }

  /** Sets a project setting, or removes it with `undefined`. Not part of undo. */
  setSetting(key: string, value: JsonValue | undefined): void {
    this.assertOpen();
    if (key.length === 0 || key === '__proto__') {
      throw new ProjectError('INVALID_ARGUMENT', `Invalid setting key ${JSON.stringify(key)}.`);
    }
    const settings: Record<string, JsonValue> = { ...this.current.settings };
    if (value === undefined) {
      if (!Object.hasOwn(settings, key)) return;
      delete settings[key];
    } else {
      // Rejects values that cannot be stored now, instead of at the next save.
      const encoded = encodeJson(value);
      if (Object.hasOwn(settings, key) && encodeJson(settings[key]) === encoded) return;
      settings[key] = value;
    }
    this.current = deepFreeze({ ...this.current, settings });
    this.emit();
  }

  // --- Saving -------------------------------------------------------------------------

  /**
   * Writes every change of the document to the file as one transaction. Resolves once the
   * data is durable. Does nothing when nothing changed. Edits made while a save is running
   * stay dirty and are written by the next save.
   */
  save(): Promise<void> {
    return this.exclusive(() => this.saveNow());
  }

  /**
   * Saves, writes a copy of the project to `location` and continues working on the copy.
   * Records are part of the copy. The original file is left as it was last saved.
   */
  saveAs(location: string): Promise<void> {
    return this.exclusive(async () => {
      await this.saveNow();
      if (location === this.where) return;
      await this.connection.copyTo(location);
      const next = await this.environment.storage.open(location, { create: false });
      try {
        await next.prepareForWriting();
      } catch (error) {
        await next.close().catch(() => undefined);
        throw error;
      }
      const previous = this.connection;
      this.connection = next;
      this.where = location;
      await previous.close().catch(() => undefined);
      this.environment.onLocated(this);
      this.emit();
    });
  }

  /**
   * Closes the file. Unsaved changes are **not** written: call `save` (or flush the
   * autosave) first if they should be kept.
   */
  close(): Promise<void> {
    if (this.closed) return this.queue.then(() => undefined);
    const done = this.exclusive(async () => {
      this.environment.onLocated(this);
      await this.connection.close();
    });
    this.closed = true;
    return done;
  }

  private async saveNow(): Promise<void> {
    const document = this.current;
    const base = this.saved;
    if (!this.isDirty) return;
    assertValidModel(document.model, 'INVALID_ARGUMENT');
    const updatedAt = this.environment.now();
    const updatedWith = this.environment.appVersion;
    const plan: SqlStatement[] = [
      ...planModelSave(base.model, document.model),
      ...planSettingsSave(base.settings, document.settings),
      statement('UPDATE project SET name = ?, description = ?, updated_at = ?, updated_with = ?', [
        document.info.name,
        document.info.description,
        updatedAt,
        updatedWith,
      ]),
    ];
    await this.connection.transaction(plan);
    const renamed = base.info.name !== document.info.name;
    this.saved = deepFreeze({ ...document, info: { ...document.info, updatedAt, updatedWith } });
    this.current = deepFreeze({
      ...this.current,
      info: { ...this.current.info, updatedAt, updatedWith },
    });
    if (renamed) this.environment.onLocated(this);
    this.emit();
  }

  // --- Snapshots ----------------------------------------------------------------------

  /**
   * Stores an immutable snapshot of the current state of a dataset (saved or not) and the
   * scales it uses. Taking a snapshot of an unchanged dataset returns the existing one. A
   * `label` marks a snapshot the user wants to keep as a version.
   */
  createSnapshot(datasetId: string, options: { label?: string } = {}): Promise<SnapshotInfo> {
    return this.exclusive(async () => {
      const snapshot = prepareSnapshot(this.current.model, datasetId);
      const label = options.label ?? null;
      const plan = [insertSnapshotStatement(snapshot, label, this.environment.now())];
      if (label !== null) {
        plan.push(statement('UPDATE snapshots SET label = ? WHERE id = ?', [label, snapshot.id]));
      }
      await this.connection.transaction(plan);
      return await readSnapshotInfo(this.connection, snapshot.id);
    });
  }

  /**
   * The id a snapshot of the dataset's current state has, without storing anything. Equal
   * to `AnalysisSummary.snapshotId` exactly when the analysis was run on the same data.
   */
  snapshotIdOf(datasetId: string): string {
    // Pages ask on every render whether an analysis is current, and hashing a large
    // dataset takes a while. The model is immutable, so its ids are kept with it.
    const { model } = this.current;
    let ids = this.snapshotIds.get(model);
    if (ids === undefined) {
      ids = new Map();
      this.snapshotIds.set(model, ids);
    }
    let id = ids.get(datasetId);
    if (id === undefined) {
      id = prepareSnapshot(model, datasetId).id;
      ids.set(datasetId, id);
    }
    return id;
  }

  listSnapshots(datasetId?: string): Promise<SnapshotInfo[]> {
    return this.exclusive(() => listSnapshots(this.connection, datasetId));
  }

  getSnapshot(id: string): Promise<Snapshot> {
    return this.exclusive(() => readSnapshot(this.connection, id));
  }

  // --- Analyses -----------------------------------------------------------------------

  /**
   * Stores a method run together with a snapshot of the dataset it was made on, as one
   * transaction. The stored record is immutable; only its name can change.
   */
  addAnalysis(analysis: NewAnalysis): Promise<AnalysisSummary> {
    return this.exclusive(async () => {
      const id = this.environment.newId();
      assertValidId(id, 'analysis');
      const createdAt = this.environment.now();
      const snapshot = prepareSnapshot(this.current.model, analysis.datasetId);
      await this.connection.transaction([
        insertSnapshotStatement(snapshot, null, createdAt),
        insertAnalysisStatement(id, snapshot.id, analysis, this.environment.appVersion, createdAt),
      ]);
      return {
        id,
        name: analysis.name ?? '',
        datasetId: analysis.datasetId,
        snapshotId: snapshot.id,
        methodId: analysis.record.methodId,
        methodVersion: analysis.record.methodVersion,
        numberType: analysis.numberType,
        variant: analysis.variant ?? null,
        traceFormatVersion: TRACE_FORMAT_VERSION,
        appVersion: this.environment.appVersion,
        createdAt,
      };
    });
  }

  /** Analyses without trace and results, oldest first. */
  listAnalyses(datasetId?: string): Promise<AnalysisSummary[]> {
    return this.exclusive(() => listAnalyses(this.connection, datasetId));
  }

  /** A stored analysis with parameters, input, results, warnings and full trace. */
  getAnalysis(id: string): Promise<StoredAnalysis> {
    return this.exclusive(() => readAnalysis(this.connection, id));
  }

  renameAnalysis(id: string, name: string): Promise<void> {
    return this.exclusive(() =>
      this.connection.transaction([
        statement('UPDATE analyses SET name = ? WHERE id = ?', [name, id]),
      ]),
    );
  }

  deleteAnalysis(id: string): Promise<void> {
    return this.exclusive(async () => {
      const rows = await this.connection.select('SELECT snapshot_id FROM analyses WHERE id = ?', [
        id,
      ]);
      const snapshotId = rows[0]?.['snapshot_id'];
      if (typeof snapshotId !== 'string') return;
      await this.connection.transaction(deleteAnalysisStatements(id, snapshotId));
    });
  }

  // --- Source files -------------------------------------------------------------------

  /** Stores an imported file byte for byte. */
  addSourceFile(file: NewSourceFile): Promise<SourceFileInfo> {
    return this.exclusive(async () => {
      const id = this.environment.newId();
      assertValidId(id, 'source file');
      const planned = insertSourceFileStatement(id, file, this.environment.now());
      await this.connection.transaction([planned.statement]);
      return planned.info;
    });
  }

  listSourceFiles(): Promise<SourceFileInfo[]> {
    return this.exclusive(() => listSourceFiles(this.connection));
  }

  readSourceFile(id: string): Promise<Uint8Array> {
    return this.exclusive(() => readSourceFile(this.connection, id));
  }

  deleteSourceFile(id: string): Promise<void> {
    return this.exclusive(() =>
      this.connection.transaction([statement('DELETE FROM source_files WHERE id = ?', [id])]),
    );
  }

  // --- Import profiles and history ----------------------------------------------------

  /** Adds an import profile, or replaces the one with the same `id`. */
  saveImportProfile(profile: {
    readonly id?: string;
    readonly name: string;
    readonly formatVersion: number;
    readonly definition: JsonValue;
  }): Promise<ImportProfile> {
    return this.exclusive(async () => {
      const now = this.environment.now();
      const id = profile.id ?? this.environment.newId();
      assertValidId(id, 'import profile');
      const existing = (await listImportProfiles(this.connection)).find((item) => item.id === id);
      const stored: ImportProfile = {
        id,
        name: profile.name,
        formatVersion: profile.formatVersion,
        definition: profile.definition,
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
      };
      await this.connection.transaction([upsertImportProfileStatement(stored)]);
      return stored;
    });
  }

  listImportProfiles(): Promise<ImportProfile[]> {
    return this.exclusive(() => listImportProfiles(this.connection));
  }

  deleteImportProfile(id: string): Promise<void> {
    return this.exclusive(() =>
      this.connection.transaction([statement('DELETE FROM import_profiles WHERE id = ?', [id])]),
    );
  }

  /** Adds an entry to the import history. */
  recordImport(entry: {
    readonly datasetId: string | null;
    readonly sourceFileId: string | null;
    readonly profileId?: string | null;
    readonly details?: JsonValue;
    readonly issues?: JsonValue;
  }): Promise<ImportRecord> {
    return this.exclusive(async () => {
      const id = this.environment.newId();
      assertValidId(id, 'import');
      const stored: ImportRecord = {
        id,
        datasetId: entry.datasetId,
        sourceFileId: entry.sourceFileId,
        profileId: entry.profileId ?? null,
        details: entry.details ?? {},
        issues: entry.issues ?? [],
        importedAt: this.environment.now(),
      };
      await this.connection.transaction([insertImportStatement(stored)]);
      return stored;
    });
  }

  listImports(): Promise<ImportRecord[]> {
    return this.exclusive(() => listImports(this.connection));
  }

  // --- Internals ----------------------------------------------------------------------

  private assertOpen(): void {
    if (this.closed) {
      throw new ProjectError('PROJECT_CLOSED', 'The project is closed.', { location: this.where });
    }
  }

  /** Runs file operations one at a time, in the order they were requested. */
  private exclusive<T>(operation: () => Promise<T>): Promise<T> {
    if (this.closed) {
      return Promise.reject(
        new ProjectError('PROJECT_CLOSED', 'The project is closed.', { location: this.where }),
      );
    }
    const result = this.queue.then(operation);
    this.queue = result.catch(() => undefined);
    return result;
  }

  private emit(): void {
    for (const listener of [...this.listeners]) listener();
  }
}

/**
 * Project files through the real Tauri SQL plugin.
 *
 * `@mateo/project` tests its Tauri adapter against a stand-in for the plugin. Here the
 * same adapter runs against the real thing: the real `@tauri-apps/plugin-sql` JavaScript
 * class talks, through Tauri's IPC mock, to the `sql_bridge` example, which serves the
 * app's own Rust setup (plugins, commands, `tauri.conf.json` and capabilities) on Tauri's
 * mock runtime. Only the transport between the two is replaced; sqlx and SQLite are real
 * and the files are real files in a temporary folder.
 *
 * The bridge has to be built first:
 *
 *     cd apps/desktop/src-tauri && cargo build --example sql_bridge
 *
 * Without it the suite is skipped, unless `MATEO_REQUIRE_SQL_BRIDGE=1` (set in CI), which
 * turns a missing bridge into a failure.
 */
import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createInterface } from 'node:readline';
import { fileURLToPath } from 'node:url';
import { canonicalJson } from '@mateo/engine';
import {
  createProjectRepository,
  createTauriStorage,
  isProjectError,
  type ProjectErrorCode,
  type ProjectRepository,
  type StorageAdapter,
} from '@mateo/project';
import { fillSample, runToyMethod, SAMPLE_DATASET } from '@mateo/project/testing';
import { invoke } from '@tauri-apps/api/core';
import { clearMocks, mockIPC } from '@tauri-apps/api/mocks';
import Database from '@tauri-apps/plugin-sql';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

const BRIDGE =
  process.env['MATEO_SQL_BRIDGE'] ??
  fileURLToPath(
    new URL(
      `../src-tauri/target/debug/examples/sql_bridge${process.platform === 'win32' ? '.exe' : ''}`,
      import.meta.url,
    ),
  );
const REQUIRED = process.env['MATEO_REQUIRE_SQL_BRIDGE'] === '1';
const AVAILABLE = existsSync(BRIDGE);

if (REQUIRED && !AVAILABLE) {
  throw new Error(`MATEO_REQUIRE_SQL_BRIDGE is set but there is no bridge at ${BRIDGE}.`);
}

interface Answer {
  readonly id: number;
  readonly ok: boolean;
  readonly value?: unknown;
  readonly error?: unknown;
}

/** One running `sql_bridge`, answering IPC calls in order. */
class Bridge {
  private readonly process: ChildProcessWithoutNullStreams;
  private readonly pending = new Map<
    number,
    { resolve: (value: unknown) => void; reject: (error: unknown) => void }
  >();
  private next = 0;
  private stderr = '';

  constructor(path: string) {
    this.process = spawn(path, [], { stdio: 'pipe' });
    this.process.stderr.on('data', (chunk: Buffer) => {
      this.stderr += chunk.toString();
    });
    this.process.on('exit', (code) => {
      for (const { reject } of this.pending.values()) {
        reject(new Error(`sql_bridge exited with ${String(code)}: ${this.stderr}`));
      }
      this.pending.clear();
    });
    createInterface({ input: this.process.stdout }).on('line', (line) => {
      const answer = JSON.parse(line) as Answer;
      const waiting = this.pending.get(answer.id);
      this.pending.delete(answer.id);
      if (answer.ok) waiting?.resolve(answer.value);
      // The webview's `invoke` rejects with the error value the command returned.
      else waiting?.reject(answer.error);
    });
  }

  call(cmd: string, args: unknown): Promise<unknown> {
    const id = ++this.next;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      // The real IPC serializes arguments as JSON too.
      this.process.stdin.write(`${JSON.stringify({ id, cmd, args: args ?? {} })}\n`);
    });
  }

  async stop(): Promise<void> {
    const exited = new Promise((resolve) => this.process.once('exit', resolve));
    this.process.stdin.end();
    await exited;
  }
}

/** The storage exactly as the desktop app builds it (`apps/web/src/project/desktop.ts`). */
function desktopStorage(): StorageAdapter {
  return createTauriStorage({
    load: (connection, options) => Database.load(connection, options),
    removeFile: (path) => invoke('remove_project_file', { path }),
  });
}

/** The file plus any SQLite side file next to it. */
function filesOf(dir: string): string[] {
  return readdirSync(dir).sort();
}

async function expectProjectError(promise: Promise<unknown>, code: ProjectErrorCode) {
  const error: unknown = await promise.then(
    () => undefined,
    (reason: unknown) => reason,
  );
  expect(isProjectError(error) ? error.code : error).toBe(code);
}

describe.skipIf(!AVAILABLE)('project files through the real Tauri SQL plugin', () => {
  let bridge: Bridge;
  let dir: string;
  let repository: ProjectRepository;

  beforeAll(() => {
    // The IPC mock installs itself on `window`.
    (globalThis as { window?: unknown }).window ??= globalThis;
    bridge = new Bridge(BRIDGE);
    mockIPC((cmd, args) => bridge.call(cmd, args));
  });

  afterAll(async () => {
    clearMocks();
    await bridge?.stop();
  });

  beforeEach((context) => {
    dir = mkdtempSync(join(tmpdir(), 'mateo-sql-plugin-'));
    repository = createProjectRepository({ storage: desktopStorage(), appVersion: '0.1.0-test' });
    context.onTestFinished(() => rmSync(dir, { recursive: true, force: true }));
  });

  it('saves and reopens crisp, TFN and linguistic data, an analysis and a source file', async () => {
    // Characters sqlx would misread unless escaped, and non-ASCII ones.
    const location = join(dir, 'Tedarikçi #1 ?50% şube.mateo');
    const created = await repository.create(location, { name: 'Tedarikçi' });
    fillSample(created);
    created.setSetting('editor.precision', 4);
    await created.save();
    expect(created.isDirty).toBe(false);

    const run = runToyMethod();
    const analysis = await created.addAnalysis({
      datasetId: SAMPLE_DATASET.id,
      record: run.record,
      methodInput: run.methodInput,
      numberType: 'crisp',
    });
    const content = Uint8Array.from({ length: 70_000 }, (_, index) => (index * 31) % 256);
    const source = await created.addSourceFile({
      name: 'tedarikçiler.xlsx',
      mediaType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      content,
    });
    const before = created.document;
    await created.close();

    // One portable file: no WAL or journal left next to it.
    expect(filesOf(dir)).toEqual(['Tedarikçi #1 ?50% şube.mateo']);

    const reopened = await repository.open(location);
    // Strict number identity (-0, 5e-324, 0.1 + 0.2...) through sqlx and back.
    expect(canonicalJson(reopened.document)).toBe(canonicalJson(before));
    expect(reopened.document).toEqual(before);
    const stored = await reopened.getAnalysis(analysis.id);
    expect(canonicalJson(stored.record)).toBe(canonicalJson(run.record));
    expect(canonicalJson(stored.methodInput)).toBe(canonicalJson(run.methodInput));
    expect(await reopened.readSourceFile(source.id)).toEqual(content);
    await reopened.close();
  });

  it('writes a rollback-journal SQLite file that identifies as a Mateo project', async () => {
    const location = join(dir, 'header.mateo');
    const session = await repository.create(location, { name: 'Header' });
    await session.close();

    const bytes = readFileSync(location);
    expect(bytes.subarray(0, 16).toString('latin1')).toBe('SQLite format 3\0');
    // File format write/read versions: 1 = rollback journal, 2 = WAL.
    expect([bytes[18], bytes[19]]).toEqual([1, 1]);
    expect(bytes.readUInt32BE(60)).toBe(repository.schemaVersion); // user_version
    expect(bytes.readUInt32BE(68)).toBe(0x4d415445); // application_id "MATE"
  });

  it('sends a transaction as one call, so a failing statement leaves nothing behind', async () => {
    const storage = desktopStorage();
    const location = join(dir, 'atomic.mateo');
    const connection = await storage.open(location, { create: true });
    await connection.prepareForWriting();
    await connection.transaction([
      { sql: 'CREATE TABLE t (id INTEGER PRIMARY KEY, v TEXT NOT NULL) STRICT', params: [] },
    ]);

    await expectProjectError(
      connection.transaction([
        { sql: 'INSERT INTO t (id, v) VALUES (?, ?)', params: [1, 'kept?'] },
        { sql: 'INSERT INTO t (id, v) VALUES (?, ?)', params: [2, null] },
      ]),
      'STORAGE_FAILED',
    );
    expect(await connection.select('SELECT count(*) AS n FROM t')).toEqual([{ n: 0 }]);

    // The connection recovered and values are assigned across statements in order.
    await connection.transaction([
      { sql: 'INSERT INTO t (id, v) VALUES (?, ?)', params: [1, 'a'] },
      { sql: 'INSERT INTO t (id, v) VALUES (?, ?)', params: [2, 'b'] },
    ]);
    expect(await connection.select('SELECT id, v FROM t ORDER BY id')).toEqual([
      { id: 1, v: 'a' },
      { id: 2, v: 'b' },
    ]);
    await connection.close();
  });

  it('saves as a copy, replacing an existing file the user chose to overwrite', async () => {
    const original = join(dir, 'original.mateo');
    const copy = join(dir, 'copy.mateo');
    const other = await repository.create(copy, { name: 'Overwritten' });
    await other.close();

    const session = await repository.create(original, { name: 'Original' });
    fillSample(session);
    await session.saveAs(copy);
    expect(session.location).toBe(copy);
    expect(session.isDirty).toBe(false);
    const saved = session.document;
    // Work continues in the copy; the original keeps the state it had at "Save As".
    session.setInfo({ name: 'Copy' });
    await session.save();
    await session.close();

    const reopened = await repository.open(copy);
    expect(reopened.document.info.name).toBe('Copy');
    expect(reopened.document.model).toEqual(saved.model);
    await reopened.close();
    const untouched = await repository.open(original);
    expect(untouched.document.info.name).toBe('Original');
    expect(untouched.document.model).toEqual(saved.model);
    await untouched.close();
    expect(filesOf(dir)).toEqual(['copy.mateo', 'original.mateo']);
  });

  it('refuses files written by a newer Mateo without touching them', async () => {
    const location = join(dir, 'future.mateo');
    const session = await repository.create(location, { name: 'Future' });
    await session.close();
    const database = await Database.load(`sqlite:${location}`, { autoCreate: false });
    await database.execute(`PRAGMA user_version = ${repository.schemaVersion + 1}`);
    await database.close(database.path);
    const bytes = readFileSync(location);

    await expectProjectError(repository.open(location), 'NEWER_SCHEMA');
    expect(readFileSync(location).equals(bytes)).toBe(true);
  });

  it('tells missing files and other SQLite files apart from projects', async () => {
    await expectProjectError(repository.open(join(dir, 'missing.mateo')), 'NOT_FOUND');
    expect(filesOf(dir)).toEqual([]);

    const location = join(dir, 'other.mateo');
    const database = await Database.load(`sqlite:${location}`);
    await database.execute('CREATE TABLE notes (text TEXT)');
    await database.close(database.path);
    await expectProjectError(repository.open(location), 'NOT_A_PROJECT_FILE');
    await expectProjectError(repository.create(location, { name: 'X' }), 'LOCATION_NOT_EMPTY');
  });

  it('only lets the app delete .mateo files', async () => {
    await expect(invoke('remove_project_file', { path: join(dir, 'notes.txt') })).rejects.toMatch(
      /not an absolute \.mateo path/,
    );
  });
});

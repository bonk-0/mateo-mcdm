import sqlite3InitModule, { type Sqlite3Static } from '@sqlite.org/sqlite-wasm';

let loaded: Promise<Sqlite3Static> | undefined;

/** The real SQLite WebAssembly build, loaded once per test file. */
export function loadSqlite(): Promise<Sqlite3Static> {
  return (loaded ??= sqlite3InitModule());
}

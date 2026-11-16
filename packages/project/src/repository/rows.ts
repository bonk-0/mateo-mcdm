import { ProjectError } from '../errors';
import type { SqlRow } from '../sql/types';

/** Typed access to query results. A value of the wrong type means the file is damaged. */

function bad(table: string, column: string): never {
  throw new ProjectError(
    'CORRUPT_FILE',
    `Unexpected value in column "${column}" of table "${table}".`,
    { table, column },
  );
}

export function text(row: SqlRow, table: string, column: string): string {
  const value = row[column];
  return typeof value === 'string' ? value : bad(table, column);
}

export function nullableText(row: SqlRow, table: string, column: string): string | null {
  const value = row[column];
  return value === null || typeof value === 'string' ? value : bad(table, column);
}

export function integer(row: SqlRow, table: string, column: string): number {
  const value = row[column];
  return typeof value === 'number' && Number.isSafeInteger(value) ? value : bad(table, column);
}

import { decodeJson, encodeJson } from '../json';
import { ProjectError } from '../errors';
import type { CellGrid, CellValue, ModelMatrix, TfnValue } from './types';

/** The value of a cell, or `undefined` when the cell is empty. */
export function getCell(
  matrix: ModelMatrix,
  alternativeId: string,
  criterionId: string,
): CellValue | undefined {
  return cellOf(matrix.cells, alternativeId, criterionId);
}

export function cellOf(
  cells: CellGrid,
  alternativeId: string,
  criterionId: string,
): CellValue | undefined {
  if (!Object.hasOwn(cells, alternativeId)) return undefined;
  const row = cells[alternativeId] as Readonly<Record<string, CellValue>>;
  return Object.hasOwn(row, criterionId) ? row[criterionId] : undefined;
}

export function crispCell(value: number): CellValue {
  return { kind: 'crisp', value };
}

export function tfnCell(l: number, m: number, u: number): CellValue {
  return { kind: 'tfn', value: { l, m, u } };
}

export function termCell(termId: string): CellValue {
  return { kind: 'term', termId };
}

export function cellsEqual(a: CellValue | undefined, b: CellValue | undefined): boolean {
  if (a === b) return true;
  if (a === undefined || b === undefined || a.kind !== b.kind) return false;
  switch (a.kind) {
    case 'crisp':
      return Object.is(a.value, (b as typeof a).value);
    case 'tfn': {
      const other = (b as typeof a).value;
      return (
        Object.is(a.value.l, other.l) &&
        Object.is(a.value.m, other.m) &&
        Object.is(a.value.u, other.u)
      );
    }
    case 'term':
      return a.termId === (b as typeof a).termId;
  }
}

/** JSON text stored for a TFN: `[l,m,u]`. */
export function encodeTfn(value: TfnValue): string {
  return encodeJson([value.l, value.m, value.u]);
}

export function decodeTfn(text: string, what: string): TfnValue {
  const parsed = decodeJson(text, what);
  if (
    !Array.isArray(parsed) ||
    parsed.length !== 3 ||
    !parsed.every((item) => typeof item === 'number' && Number.isFinite(item))
  ) {
    throw new ProjectError('CORRUPT_FILE', `Invalid triangular fuzzy number in ${what}.`, { what });
  }
  const [l, m, u] = parsed as [number, number, number];
  return { l, m, u };
}

/**
 * The stored form of a cell: its kind and a JSON text. Numbers are kept as JSON text
 * instead of SQL REAL so that every double survives exactly, whatever number handling
 * the storage driver has.
 */
export function encodeCell(cell: CellValue): { kind: string; value: string } {
  switch (cell.kind) {
    case 'crisp':
      return { kind: 'crisp', value: encodeJson(cell.value) };
    case 'tfn':
      return { kind: 'tfn', value: encodeTfn(cell.value) };
    case 'term':
      return { kind: 'term', value: encodeJson(cell.termId) };
    default:
      throw new ProjectError(
        'INVALID_ARGUMENT',
        `Unknown cell kind ${JSON.stringify((cell as { kind?: unknown }).kind)}.`,
      );
  }
}

export function decodeCell(kind: string, text: string, what: string): CellValue {
  switch (kind) {
    case 'crisp': {
      const value = decodeJson(text, what);
      if (typeof value !== 'number' || !Number.isFinite(value)) break;
      return { kind: 'crisp', value };
    }
    case 'tfn':
      return { kind: 'tfn', value: decodeTfn(text, what) };
    case 'term': {
      const termId = decodeJson(text, what);
      if (typeof termId !== 'string') break;
      return { kind: 'term', termId };
    }
    default:
      throw new ProjectError('CORRUPT_FILE', `Unknown cell kind "${kind}" in ${what}.`, { what });
  }
  throw new ProjectError('CORRUPT_FILE', `Invalid ${kind} value in ${what}.`, { what });
}

/**
 * Golden-test helpers: compare a method trace with the printed tables of a reference
 * fixture (docs/methods/fixtures.md, "How golden tests use a fixture").
 *
 * - A printed value matches when `|computed − printed| ≤ 0.5 × 10^−decimals + 1e-9`.
 * - A value listed in the fixture's `deviations` is compared with `recomputed` instead
 *   (to 4 decimals), and every listed deviation must be used.
 * - Ranks are compared exactly.
 */
import type { Trace, TraceStep, TraceValue } from '@mateo/engine';

export interface FixtureBlock {
  readonly printedIn: string;
  readonly decimals?: number;
  readonly rows?: readonly string[];
  readonly values: unknown;
}

export interface Deviation {
  readonly path: string;
  readonly printed: number;
  readonly recomputed: number;
  readonly note: string;
}

export interface GoldenFixture {
  readonly precision: { readonly decimals: number };
  readonly steps: Readonly<Record<string, FixtureBlock>>;
  readonly result: Readonly<Record<string, FixtureBlock>>;
  readonly deviations: readonly Deviation[];
}

/** Where a printed table lives in the trace. */
export interface GoldenSpec {
  /** `steps.<name>` or `result.<name>` of the fixture. */
  readonly fixture: string;
  readonly step: string;
  /**
   * `matrix`: printed rows × every column of the step. `column`: one value per printed row
   * from one column. `row`: the single row of a row vector. `scalar`: one cell.
   * `by-id`: an object `{ rowId: value }` read from one column.
   */
  readonly kind: 'matrix' | 'column' | 'row' | 'scalar' | 'by-id';
  /** Column id for `column` and `by-id`. Default: the step's only column. */
  readonly column?: string;
  /** Compare exactly (ranks). */
  readonly exact?: boolean;
}

export interface Mismatch {
  readonly path: string;
  readonly printed: number;
  readonly computed: number;
  readonly expected: number;
  readonly tolerance: number;
}

export interface GoldenReport {
  /** Number of printed values compared. */
  readonly checked: number;
  readonly mismatches: readonly Mismatch[];
  /** Deviations that were applied, by path. */
  readonly deviationsUsed: readonly string[];
}

type Value = number | readonly number[];

function decode(value: TraceValue): Value {
  if (typeof value === 'number') return value;
  if (value !== null && typeof value === 'object' && value.type === 'tfn') {
    const { l, m, u } = value.components as { l: number; m: number; u: number };
    return [l, m, u];
  }
  throw new Error(`Unexpected trace value ${JSON.stringify(value)}`);
}

function findStep(trace: Trace, id: string): TraceStep {
  const step = trace.steps.find((candidate) => candidate.id === id);
  if (step === undefined) throw new Error(`The trace has no step "${id}"`);
  return step;
}

function cell(step: TraceStep, row: string | number, column: string | number): Value {
  const { rows, columns, cells } = step.output;
  const r = typeof row === 'number' ? row : rows.findIndex((item) => item.id === row);
  const c = typeof column === 'number' ? column : columns.findIndex((item) => item.id === column);
  if (r < 0 || c < 0) {
    throw new Error(`Step "${step.id}" has no cell (${String(row)}, ${String(column)})`);
  }
  return decode(cells[r]![c]!.value);
}

function computedFor(trace: Trace, spec: GoldenSpec, block: FixtureBlock): unknown {
  const step = findStep(trace, spec.step);
  const rowIds = block.rows ?? step.output.rows.map((item) => item.id);
  const column = spec.column ?? 0;
  switch (spec.kind) {
    case 'matrix':
      return rowIds.map((row) => step.output.columns.map((_, c) => cell(step, row, c)));
    case 'column':
      return rowIds.map((row) => cell(step, row, column));
    case 'row':
      return step.output.columns.map((_, c) => cell(step, 0, c));
    case 'scalar':
      return cell(step, 0, 0);
    case 'by-id':
      return Object.fromEntries(
        Object.keys(block.values as object).map((row) => [row, cell(step, row, column)]),
      );
  }
}

export function compareWithFixture(
  fixture: GoldenFixture,
  trace: Trace,
  specs: readonly GoldenSpec[],
): GoldenReport {
  const deviations = new Map(fixture.deviations.map((d) => [d.path, d]));
  const mismatches: Mismatch[] = [];
  const used: string[] = [];
  let checked = 0;

  const walk = (
    printed: unknown,
    computed: unknown,
    path: string,
    decimals: number,
    exact: boolean,
  ) => {
    if (typeof printed === 'number') {
      if (typeof computed !== 'number') throw new Error(`${path}: shape differs from the trace`);
      checked += 1;
      const deviation = deviations.get(path);
      if (deviation !== undefined) used.push(path);
      const expected = deviation?.recomputed ?? printed;
      const tolerance = exact
        ? 0
        : deviation !== undefined
          ? 0.5e-4 + 1e-9
          : 0.5 * 10 ** -decimals + 1e-9;
      if (!(Math.abs(computed - expected) <= tolerance)) {
        mismatches.push({ path, printed, computed, expected, tolerance });
      }
      return;
    }
    if (Array.isArray(printed)) {
      if (!Array.isArray(computed) || computed.length !== printed.length) {
        throw new Error(`${path}: shape differs from the trace`);
      }
      printed.forEach((value, i) => walk(value, computed[i], `${path}[${i}]`, decimals, exact));
      return;
    }
    if (typeof printed === 'object' && printed !== null) {
      for (const [k, value] of Object.entries(printed)) {
        walk(value, (computed as Record<string, unknown>)[k], `${path}.${k}`, decimals, exact);
      }
      return;
    }
    throw new Error(`${path}: unexpected printed value ${JSON.stringify(printed)}`);
  };

  for (const spec of specs) {
    const [section, name] = spec.fixture.split('.') as ['steps' | 'result', string];
    const block = fixture[section][name];
    if (block === undefined) throw new Error(`The fixture has no ${spec.fixture}`);
    const decimals = block.decimals ?? fixture.precision.decimals;
    walk(
      block.values,
      computedFor(trace, spec, block),
      `${spec.fixture}.values`,
      decimals,
      spec.exact ?? false,
    );
  }
  return { checked, mismatches, deviationsUsed: used };
}

/** Every printed table of a fixture, as `steps.<name>` / `result.<name>`. */
export function fixtureTables(fixture: GoldenFixture): string[] {
  return [
    ...Object.keys(fixture.steps).map((name) => `steps.${name}`),
    ...Object.keys(fixture.result).map((name) => `result.${name}`),
  ];
}

import { encodeJson } from '../json';
import { encodeCell, encodeTfn } from '../model/cells';
import type {
  CellGrid,
  CellValue,
  Dataset,
  ModelMatrix,
  ProjectModel,
  ProjectSettings,
} from '../model/types';
import type { SqlStatement, SqlValue } from '../sql/types';
import { statement } from '../sql/types';

/**
 * Plans the statements that bring the stored model from `saved` to `current`.
 *
 * The model is immutable, so parts that are the same object in both states are known to
 * be unchanged and are skipped; a typical edit rewrites a few rows instead of the file.
 * Everything else is written as "delete what is gone, upsert what is there", which is
 * idempotent: running a plan twice gives the same file.
 *
 * Rows travel as one JSON array per statement and are unpacked by `json_each`. All values
 * in it are strings, integers or null; numbers of the model are already JSON text inside
 * those strings, so SQLite never parses or prints a real number.
 */
export function planModelSave(saved: ProjectModel, current: ProjectModel): SqlStatement[] {
  if (saved === current) return [];
  const plan: SqlStatement[] = [];

  // 1. Removals. Foreign keys cascade to everything owned by a removed row.
  const removals: [table: string, before: readonly string[], after: readonly string[]][] = [
    ['scales', saved.scales.map((s) => s.id), current.scales.map((s) => s.id)],
    ['datasets', saved.datasets.map((d) => d.id), current.datasets.map((d) => d.id)],
    ['matrices', idsOf(saved, (d) => d.matrices), idsOf(current, (d) => d.matrices)],
    ['criteria', idsOf(saved, (d) => d.criteria), idsOf(current, (d) => d.criteria)],
    ['alternatives', idsOf(saved, (d) => d.alternatives), idsOf(current, (d) => d.alternatives)],
  ];
  for (const [table, before, after] of removals) {
    const kept = new Set(after);
    const removed = before.filter((id) => !kept.has(id));
    if (removed.length > 0) {
      plan.push(
        statement(`DELETE FROM ${table} WHERE id IN (SELECT value FROM json_each(?))`, [
          JSON.stringify(removed),
        ]),
      );
    }
  }

  // 2. Scales, before the criteria that refer to them.
  if (saved.scales !== current.scales) {
    const savedScales = new Map(saved.scales.map((scale) => [scale.id, scale]));
    pushRows(
      plan,
      upsert(
        'scales',
        ['id', 'position', 'name', 'source_id', 'number_type'],
        current.scales.map((scale, position) => [
          scale.id,
          position,
          encodeJson(scale.name),
          scale.sourceId,
          scale.numberType,
        ]),
      ),
    );
    for (const scale of current.scales) {
      if (savedScales.get(scale.id)?.terms === scale.terms) continue;
      plan.push(statement('DELETE FROM scale_terms WHERE scale_id = ?', [scale.id]));
      if (scale.terms.length > 0) {
        plan.push(
          insert(
            'scale_terms',
            ['scale_id', 'id', 'position', 'label', 'abbreviation', 'value'],
            scale.terms.map((term, position) => [
              scale.id,
              term.id,
              position,
              encodeJson(term.label),
              term.abbreviation,
              encodeTfn(term.value),
            ]),
          ),
        );
      }
    }
  }

  // 3. Datasets and what they own.
  if (saved.datasets !== current.datasets) {
    const savedDatasets = new Map(saved.datasets.map((dataset) => [dataset.id, dataset]));
    pushRows(
      plan,
      upsert(
        'datasets',
        ['id', 'position', 'name', 'description', 'created_at'],
        current.datasets.map((dataset, position) => [
          dataset.id,
          position,
          dataset.name,
          dataset.description,
          dataset.createdAt,
        ]),
      ),
    );
    for (const dataset of current.datasets) {
      const before = savedDatasets.get(dataset.id);
      if (before !== dataset) planDataset(plan, before, dataset);
    }
  }
  return plan;
}

function idsOf(
  model: ProjectModel,
  pick: (dataset: Dataset) => readonly { readonly id: string }[],
): string[] {
  return model.datasets.flatMap((dataset) => pick(dataset).map((item) => item.id));
}

function planDataset(plan: SqlStatement[], before: Dataset | undefined, dataset: Dataset): void {
  if (before?.criteria !== dataset.criteria && dataset.criteria.length > 0) {
    plan.push(
      upsert(
        'criteria',
        [
          'id',
          'dataset_id',
          'position',
          'code',
          'name',
          'description',
          'direction',
          'unit',
          'number_type',
          'scale_id',
        ],
        dataset.criteria.map((criterion, position) => [
          criterion.id,
          dataset.id,
          position,
          criterion.code,
          criterion.name,
          criterion.description,
          criterion.direction,
          criterion.unit,
          criterion.numberType,
          criterion.scaleId,
        ]),
      ),
    );
  }
  if (before?.alternatives !== dataset.alternatives && dataset.alternatives.length > 0) {
    plan.push(
      upsert(
        'alternatives',
        ['id', 'dataset_id', 'position', 'code', 'name', 'description', 'group_name'],
        dataset.alternatives.map((alternative, position) => [
          alternative.id,
          dataset.id,
          position,
          alternative.code,
          alternative.name,
          alternative.description,
          alternative.group,
        ]),
      ),
    );
  }
  if (before?.matrices !== dataset.matrices && dataset.matrices.length > 0) {
    plan.push(
      upsert(
        'matrices',
        ['id', 'dataset_id', 'position', 'name', 'role'],
        dataset.matrices.map((matrix, position) => [
          matrix.id,
          dataset.id,
          position,
          matrix.name,
          matrix.role,
        ]),
      ),
    );
  }
  // A matrix may have moved here from another dataset, so look it up by id everywhere.
  const savedMatrices = new Map((before?.matrices ?? []).map((matrix) => [matrix.id, matrix]));
  for (const matrix of dataset.matrices) {
    const savedMatrix = savedMatrices.get(matrix.id);
    if (savedMatrix !== matrix) planCells(plan, savedMatrix, matrix, savedMatrix === undefined);
  }
}

const EMPTY_GRID: CellGrid = {};
const EMPTY_ROW: Readonly<Record<string, CellValue>> = {};

function planCells(
  plan: SqlStatement[],
  before: ModelMatrix | undefined,
  matrix: ModelMatrix,
  unknownHistory: boolean,
): void {
  if (unknownHistory) {
    // Not in the saved dataset: new, or moved between datasets. Start from a clean slate.
    plan.push(statement('DELETE FROM cells WHERE matrix_id = ?', [matrix.id]));
  }
  const savedCells = before?.cells ?? EMPTY_GRID;
  if (savedCells === matrix.cells) return;

  const stale: string[] = [];
  const rows: SqlValue[][] = [];
  const alternativeIds = new Set([...Object.keys(savedCells), ...Object.keys(matrix.cells)]);
  for (const alternativeId of alternativeIds) {
    const savedRow = Object.hasOwn(savedCells, alternativeId)
      ? savedCells[alternativeId]
      : undefined;
    const row = Object.hasOwn(matrix.cells, alternativeId)
      ? matrix.cells[alternativeId]
      : undefined;
    if (savedRow === row) continue;
    if (savedRow !== undefined) stale.push(alternativeId);
    for (const [criterionId, cell] of Object.entries(row ?? EMPTY_ROW)) {
      const encoded = encodeCell(cell);
      rows.push([matrix.id, alternativeId, criterionId, encoded.kind, encoded.value]);
    }
  }
  if (stale.length > 0) {
    plan.push(
      statement(
        'DELETE FROM cells WHERE matrix_id = ? AND alternative_id IN (SELECT value FROM json_each(?))',
        [matrix.id, JSON.stringify(stale)],
      ),
    );
  }
  if (rows.length > 0) {
    plan.push(
      insert('cells', ['matrix_id', 'alternative_id', 'criterion_id', 'kind', 'value'], rows),
    );
  }
}

/** Plans the statements that bring the stored settings from `saved` to `current`. */
export function planSettingsSave(saved: ProjectSettings, current: ProjectSettings): SqlStatement[] {
  if (saved === current) return [];
  const plan: SqlStatement[] = [];
  const removed = Object.keys(saved).filter((key) => !Object.hasOwn(current, key));
  if (removed.length > 0) {
    plan.push(
      statement('DELETE FROM settings WHERE key IN (SELECT value FROM json_each(?))', [
        JSON.stringify(removed),
      ]),
    );
  }
  const changed = Object.keys(current)
    .filter((key) => !Object.hasOwn(saved, key) || saved[key] !== current[key])
    .map((key) => [key, encodeJson(current[key])]);
  if (changed.length > 0) plan.push(upsert('settings', ['key', 'value'], changed, 'key'));
  return plan;
}

/** Adds a row statement unless it carries no rows. */
function pushRows(plan: SqlStatement[], rows: SqlStatement): void {
  if (rows.params[0] !== '[]') plan.push(rows);
}

function selectFromJson(columns: readonly string[]): string {
  return columns.map((_, index) => `json_extract(value, '$[${index}]')`).join(', ');
}

/** `INSERT` of many rows passed as one JSON array of arrays. */
function insert(
  table: string,
  columns: readonly string[],
  rows: readonly (readonly SqlValue[])[],
): SqlStatement {
  return statement(
    `INSERT INTO ${table} (${columns.join(', ')}) SELECT ${selectFromJson(columns)} FROM json_each(?)`,
    [JSON.stringify(rows)],
  );
}

/** Like `insert`, but rows whose key exists are updated in place. */
function upsert(
  table: string,
  columns: readonly string[],
  rows: readonly (readonly SqlValue[])[],
  key = 'id',
): SqlStatement {
  const updates = columns
    .filter((column) => column !== key)
    .map((column) => `${column} = excluded.${column}`)
    .join(', ');
  // `WHERE true` separates the SELECT from ON CONFLICT for the SQLite parser.
  return statement(
    `INSERT INTO ${table} (${columns.join(', ')}) SELECT ${selectFromJson(columns)} FROM json_each(?) WHERE true ON CONFLICT (${key}) DO UPDATE SET ${updates}`,
    [JSON.stringify(rows)],
  );
}

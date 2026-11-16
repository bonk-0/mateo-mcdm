import { deepFreeze, type CriterionDirection, type TextRef } from '@mateo/engine';
import { ProjectError } from '../errors';
import { decodeJson, type JsonValue } from '../json';
import { decodeCell, decodeTfn } from '../model/cells';
import type {
  CellValue,
  Dataset,
  LinguisticScale,
  MatrixRole,
  ModelAlternative,
  ModelCriterion,
  ModelMatrix,
  ProjectDocument,
  ProjectInfo,
  ScaleTerm,
} from '../model/types';
import { assertValidModel } from '../model/validate';
import type { SqlConnection, SqlRow } from '../sql/types';
import { nullableText, text } from './rows';

function pushTo<K, V>(map: Map<K, V[]>, key: K, value: V): void {
  const list = map.get(key);
  if (list) list.push(value);
  else map.set(key, [value]);
}

/** A null-prototype record, so that no stored id can collide with `Object.prototype`. */
function record<V>(): Record<string, V> {
  return Object.create(null) as Record<string, V>;
}

export async function loadInfo(connection: SqlConnection): Promise<ProjectInfo> {
  const rows = await connection.select(
    'SELECT id, name, description, created_at, updated_at, created_with, updated_with FROM project',
  );
  const row = rows[0];
  if (rows.length !== 1 || row === undefined) {
    throw new ProjectError('CORRUPT_FILE', 'The project file has no project record.');
  }
  return {
    id: text(row, 'project', 'id'),
    name: text(row, 'project', 'name'),
    description: text(row, 'project', 'description'),
    createdAt: text(row, 'project', 'created_at'),
    updatedAt: text(row, 'project', 'updated_at'),
    createdWith: text(row, 'project', 'created_with'),
    updatedWith: text(row, 'project', 'updated_with'),
  };
}

/** Reads the whole in-memory part of a project and checks that it is well-formed. */
export async function loadDocument(connection: SqlConnection): Promise<ProjectDocument> {
  const info = await loadInfo(connection);

  const settings = record<JsonValue>();
  for (const row of await connection.select('SELECT key, value FROM settings ORDER BY key')) {
    const key = text(row, 'settings', 'key');
    settings[key] = decodeJson(text(row, 'settings', 'value'), `setting "${key}"`) as JsonValue;
  }

  const termsByScale = new Map<string, ScaleTerm[]>();
  for (const row of await connection.select(
    'SELECT scale_id, id, label, abbreviation, value FROM scale_terms ORDER BY scale_id, position',
  )) {
    const id = text(row, 'scale_terms', 'id');
    pushTo(termsByScale, text(row, 'scale_terms', 'scale_id'), {
      id,
      label: decodeJson(text(row, 'scale_terms', 'label'), `label of term "${id}"`) as TextRef,
      abbreviation: text(row, 'scale_terms', 'abbreviation'),
      value: decodeTfn(text(row, 'scale_terms', 'value'), `scale term "${id}"`),
    });
  }
  const scales: LinguisticScale[] = (
    await connection.select(
      'SELECT id, name, source_id, number_type FROM scales ORDER BY position, id',
    )
  ).map((row) => {
    const id = text(row, 'scales', 'id');
    return {
      id,
      name: decodeJson(text(row, 'scales', 'name'), `name of scale "${id}"`) as TextRef,
      sourceId: nullableText(row, 'scales', 'source_id'),
      numberType: text(row, 'scales', 'number_type') as 'tfn',
      terms: termsByScale.get(id) ?? [],
    };
  });

  const criteria = new Map<string, ModelCriterion[]>();
  for (const row of await connection.select(
    `SELECT id, dataset_id, code, name, description, direction, unit, number_type, scale_id
     FROM criteria ORDER BY dataset_id, position, id`,
  )) {
    pushTo(criteria, text(row, 'criteria', 'dataset_id'), {
      id: text(row, 'criteria', 'id'),
      code: text(row, 'criteria', 'code'),
      name: text(row, 'criteria', 'name'),
      description: text(row, 'criteria', 'description'),
      direction: text(row, 'criteria', 'direction') as CriterionDirection,
      unit: text(row, 'criteria', 'unit'),
      numberType: text(row, 'criteria', 'number_type'),
      scaleId: nullableText(row, 'criteria', 'scale_id'),
    });
  }

  const alternatives = new Map<string, ModelAlternative[]>();
  for (const row of await connection.select(
    `SELECT id, dataset_id, code, name, description, group_name
     FROM alternatives ORDER BY dataset_id, position, id`,
  )) {
    pushTo(alternatives, text(row, 'alternatives', 'dataset_id'), {
      id: text(row, 'alternatives', 'id'),
      code: text(row, 'alternatives', 'code'),
      name: text(row, 'alternatives', 'name'),
      description: text(row, 'alternatives', 'description'),
      group: text(row, 'alternatives', 'group_name'),
    });
  }

  const cells = new Map<string, Record<string, Record<string, CellValue>>>();
  for (const row of await connection.select(
    'SELECT matrix_id, alternative_id, criterion_id, kind, value FROM cells',
  )) {
    const matrixId = text(row, 'cells', 'matrix_id');
    const alternativeId = text(row, 'cells', 'alternative_id');
    const criterionId = text(row, 'cells', 'criterion_id');
    let grid = cells.get(matrixId);
    if (!grid) cells.set(matrixId, (grid = record()));
    const cellRow = (grid[alternativeId] ??= record<CellValue>());
    cellRow[criterionId] = decodeCell(
      text(row, 'cells', 'kind'),
      text(row, 'cells', 'value'),
      `cell (${alternativeId}, ${criterionId}) of matrix "${matrixId}"`,
    );
  }

  const matrices = new Map<string, ModelMatrix[]>();
  for (const row of await connection.select(
    'SELECT id, dataset_id, name, role FROM matrices ORDER BY dataset_id, position, id',
  )) {
    const id = text(row, 'matrices', 'id');
    pushTo(matrices, text(row, 'matrices', 'dataset_id'), {
      id,
      name: text(row, 'matrices', 'name'),
      role: text(row, 'matrices', 'role') as MatrixRole,
      cells: cells.get(id) ?? record(),
    });
  }

  const datasets: Dataset[] = (
    await connection.select(
      'SELECT id, name, description, created_at FROM datasets ORDER BY position, id',
    )
  ).map((row: SqlRow) => {
    const id = text(row, 'datasets', 'id');
    return {
      id,
      name: text(row, 'datasets', 'name'),
      description: text(row, 'datasets', 'description'),
      createdAt: text(row, 'datasets', 'created_at'),
      criteria: criteria.get(id) ?? [],
      alternatives: alternatives.get(id) ?? [],
      matrices: matrices.get(id) ?? [],
    };
  });

  const model = { datasets, scales };
  assertValidModel(model, 'CORRUPT_FILE');
  return deepFreeze({ info, model, settings });
}

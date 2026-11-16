import { ProjectError } from '../errors';
import { cellOf, cellsEqual } from '../model/cells';
import type {
  CellValue,
  Dataset,
  LinguisticScale,
  ModelAlternative,
  ModelCriterion,
  ModelMatrix,
  ProjectModel,
} from '../model/types';
import type { Command } from './history';

/**
 * The model edits of the editor as undoable commands (consumed by P1.11).
 *
 * Every command is a pure function of the model. It throws `INVALID_ARGUMENT` when it
 * refers to something that does not exist, and returns the same model object when there
 * is nothing to change, so that no empty undo step is recorded. Commands keep the model
 * consistent: removing a criterion or an alternative removes its cells, removing a scale
 * clears the references to it.
 */
export type ModelCommand = Command<ProjectModel>;

function command(
  type: string,
  apply: (model: ProjectModel) => ProjectModel,
  mergeKey?: string,
): ModelCommand {
  const base = { type, labelKey: `project.command.${type}`, apply };
  return mergeKey === undefined ? base : { ...base, mergeKey };
}

function invalid(message: string): never {
  throw new ProjectError('INVALID_ARGUMENT', message);
}

function withDataset(
  model: ProjectModel,
  datasetId: string,
  change: (dataset: Dataset) => Dataset,
): ProjectModel {
  const index = model.datasets.findIndex((dataset) => dataset.id === datasetId);
  const dataset = model.datasets[index];
  if (!dataset) return invalid(`There is no dataset "${datasetId}".`);
  const next = change(dataset);
  if (next === dataset) return model;
  return { ...model, datasets: model.datasets.with(index, next) };
}

function insertAt<T>(list: readonly T[], item: T, index: number | undefined): T[] {
  const at = index === undefined ? list.length : Math.max(0, Math.min(index, list.length));
  return [...list.slice(0, at), item, ...list.slice(at)];
}

function moveTo<T extends { readonly id: string }>(
  list: readonly T[],
  id: string,
  toIndex: number,
  what: string,
): readonly T[] {
  const from = list.findIndex((item) => item.id === id);
  const item = list[from];
  if (!item) return invalid(`There is no ${what} "${id}".`);
  const to = Math.max(0, Math.min(toIndex, list.length - 1));
  if (to === from) return list;
  const rest = list.filter((_, index) => index !== from);
  return [...rest.slice(0, to), item, ...rest.slice(to)];
}

function patchItem<T extends { readonly id: string }>(
  list: readonly T[],
  id: string,
  patch: Partial<Omit<T, 'id'>>,
  what: string,
): readonly T[] {
  const index = list.findIndex((item) => item.id === id);
  const item = list[index];
  if (!item) return invalid(`There is no ${what} "${id}".`);
  const changes = Object.entries(patch).filter(
    ([key, value]) => value !== undefined && !Object.is(item[key as keyof T], value),
  );
  if (changes.length === 0) return list;
  return list.with(index, { ...item, ...Object.fromEntries(changes), id: item.id });
}

function assertNewId(list: readonly { readonly id: string }[], id: string, what: string): void {
  if (list.some((item) => item.id === id)) invalid(`The ${what} "${id}" already exists.`);
}

/** Removes rows (alternatives) and columns (criteria) from every matrix of a dataset. */
function dropCells(
  matrices: readonly ModelMatrix[],
  alternativeIds: ReadonlySet<string>,
  criterionIds: ReadonlySet<string>,
): readonly ModelMatrix[] {
  let changedAny = false;
  const next = matrices.map((matrix) => {
    let changed = false;
    const cells: Record<string, Readonly<Record<string, CellValue>>> = {};
    for (const [alternativeId, row] of Object.entries(matrix.cells)) {
      if (alternativeIds.has(alternativeId)) {
        changed = true;
        continue;
      }
      const kept = Object.entries(row).filter(([criterionId]) => !criterionIds.has(criterionId));
      if (kept.length === Object.keys(row).length) {
        cells[alternativeId] = row;
      } else {
        changed = true;
        if (kept.length > 0) cells[alternativeId] = Object.fromEntries(kept);
      }
    }
    if (!changed) return matrix;
    changedAny = true;
    return { ...matrix, cells };
  });
  return changedAny ? next : matrices;
}

// --- Datasets -------------------------------------------------------------------------

export function addDataset(dataset: Dataset, index?: number): ModelCommand {
  return command('dataset.add', (model) => {
    assertNewId(model.datasets, dataset.id, 'dataset');
    return { ...model, datasets: insertAt(model.datasets, dataset, index) };
  });
}

export function updateDataset(
  datasetId: string,
  patch: Partial<Pick<Dataset, 'name' | 'description'>>,
): ModelCommand {
  return command(
    'dataset.update',
    (model) => {
      const datasets = patchItem(model.datasets, datasetId, patch, 'dataset');
      return datasets === model.datasets ? model : { ...model, datasets };
    },
    `dataset.update:${datasetId}:${Object.keys(patch).sort().join(',')}`,
  );
}

export function removeDataset(datasetId: string): ModelCommand {
  return command('dataset.remove', (model) => {
    if (!model.datasets.some((dataset) => dataset.id === datasetId)) {
      return invalid(`There is no dataset "${datasetId}".`);
    }
    return { ...model, datasets: model.datasets.filter((dataset) => dataset.id !== datasetId) };
  });
}

export function moveDataset(datasetId: string, toIndex: number): ModelCommand {
  return command('dataset.move', (model) => {
    const datasets = moveTo(model.datasets, datasetId, toIndex, 'dataset');
    return datasets === model.datasets ? model : { ...model, datasets };
  });
}

// --- Criteria -------------------------------------------------------------------------

export function addCriterion(
  datasetId: string,
  criterion: ModelCriterion,
  index?: number,
): ModelCommand {
  return command('criterion.add', (model) =>
    withDataset(model, datasetId, (dataset) => {
      assertNewId(dataset.criteria, criterion.id, 'criterion');
      return { ...dataset, criteria: insertAt(dataset.criteria, criterion, index) };
    }),
  );
}

export function updateCriterion(
  datasetId: string,
  criterionId: string,
  patch: Partial<Omit<ModelCriterion, 'id'>>,
): ModelCommand {
  return command(
    'criterion.update',
    (model) =>
      withDataset(model, datasetId, (dataset) => {
        const criteria = patchItem(dataset.criteria, criterionId, patch, 'criterion');
        return criteria === dataset.criteria ? dataset : { ...dataset, criteria };
      }),
    `criterion.update:${criterionId}:${Object.keys(patch).sort().join(',')}`,
  );
}

export function removeCriteria(datasetId: string, criterionIds: readonly string[]): ModelCommand {
  return command('criterion.remove', (model) =>
    withDataset(model, datasetId, (dataset) => {
      const ids = new Set(criterionIds);
      const criteria = dataset.criteria.filter((criterion) => !ids.has(criterion.id));
      if (criteria.length === dataset.criteria.length) return dataset;
      return { ...dataset, criteria, matrices: dropCells(dataset.matrices, new Set(), ids) };
    }),
  );
}

export function moveCriterion(
  datasetId: string,
  criterionId: string,
  toIndex: number,
): ModelCommand {
  return command('criterion.move', (model) =>
    withDataset(model, datasetId, (dataset) => {
      const criteria = moveTo(dataset.criteria, criterionId, toIndex, 'criterion');
      return criteria === dataset.criteria ? dataset : { ...dataset, criteria };
    }),
  );
}

// --- Alternatives ---------------------------------------------------------------------

export function addAlternative(
  datasetId: string,
  alternative: ModelAlternative,
  index?: number,
): ModelCommand {
  return command('alternative.add', (model) =>
    withDataset(model, datasetId, (dataset) => {
      assertNewId(dataset.alternatives, alternative.id, 'alternative');
      return { ...dataset, alternatives: insertAt(dataset.alternatives, alternative, index) };
    }),
  );
}

export function updateAlternative(
  datasetId: string,
  alternativeId: string,
  patch: Partial<Omit<ModelAlternative, 'id'>>,
): ModelCommand {
  return command(
    'alternative.update',
    (model) =>
      withDataset(model, datasetId, (dataset) => {
        const alternatives = patchItem(dataset.alternatives, alternativeId, patch, 'alternative');
        return alternatives === dataset.alternatives ? dataset : { ...dataset, alternatives };
      }),
    `alternative.update:${alternativeId}:${Object.keys(patch).sort().join(',')}`,
  );
}

export function removeAlternatives(
  datasetId: string,
  alternativeIds: readonly string[],
): ModelCommand {
  return command('alternative.remove', (model) =>
    withDataset(model, datasetId, (dataset) => {
      const ids = new Set(alternativeIds);
      const alternatives = dataset.alternatives.filter((alternative) => !ids.has(alternative.id));
      if (alternatives.length === dataset.alternatives.length) return dataset;
      return { ...dataset, alternatives, matrices: dropCells(dataset.matrices, ids, new Set()) };
    }),
  );
}

export function moveAlternative(
  datasetId: string,
  alternativeId: string,
  toIndex: number,
): ModelCommand {
  return command('alternative.move', (model) =>
    withDataset(model, datasetId, (dataset) => {
      const alternatives = moveTo(dataset.alternatives, alternativeId, toIndex, 'alternative');
      return alternatives === dataset.alternatives ? dataset : { ...dataset, alternatives };
    }),
  );
}

// --- Matrices and cells ---------------------------------------------------------------

export function addMatrix(datasetId: string, matrix: ModelMatrix, index?: number): ModelCommand {
  return command('matrix.add', (model) =>
    withDataset(model, datasetId, (dataset) => {
      assertNewId(dataset.matrices, matrix.id, 'matrix');
      return { ...dataset, matrices: insertAt(dataset.matrices, matrix, index) };
    }),
  );
}

export function renameMatrix(datasetId: string, matrixId: string, name: string): ModelCommand {
  return command(
    'matrix.rename',
    (model) =>
      withDataset(model, datasetId, (dataset) => {
        const matrices = patchItem(dataset.matrices, matrixId, { name }, 'matrix');
        return matrices === dataset.matrices ? dataset : { ...dataset, matrices };
      }),
    `matrix.rename:${matrixId}`,
  );
}

export function removeMatrix(datasetId: string, matrixId: string): ModelCommand {
  return command('matrix.remove', (model) =>
    withDataset(model, datasetId, (dataset) => {
      if (!dataset.matrices.some((matrix) => matrix.id === matrixId)) {
        return invalid(`There is no matrix "${matrixId}".`);
      }
      return { ...dataset, matrices: dataset.matrices.filter((matrix) => matrix.id !== matrixId) };
    }),
  );
}

export interface CellEdit {
  readonly alternativeId: string;
  readonly criterionId: string;
  /** The new content, or `null` to empty the cell. */
  readonly value: CellValue | null;
}

/**
 * Sets or clears any number of cells of one matrix as a single undo step (typing, paste,
 * bulk edit, delete). Edits of one cell in a row merge into one step until
 * `History.sealMerge` is called.
 */
export function setCells(
  datasetId: string,
  matrixId: string,
  edits: readonly CellEdit[],
): ModelCommand {
  const first = edits[0];
  const mergeKey =
    edits.length === 1 && first
      ? `cells.set:${matrixId}:${first.alternativeId}:${first.criterionId}`
      : undefined;
  return command(
    'cells.set',
    (model) =>
      withDataset(model, datasetId, (dataset) => {
        const index = dataset.matrices.findIndex((matrix) => matrix.id === matrixId);
        const matrix = dataset.matrices[index];
        if (!matrix) return invalid(`There is no matrix "${matrixId}".`);
        const alternatives = new Set(dataset.alternatives.map((item) => item.id));
        const criteria = new Set(dataset.criteria.map((item) => item.id));

        const rows = new Map<string, Record<string, CellValue>>();
        for (const edit of edits) {
          if (!alternatives.has(edit.alternativeId)) {
            return invalid(`There is no alternative "${edit.alternativeId}".`);
          }
          if (!criteria.has(edit.criterionId)) {
            return invalid(`There is no criterion "${edit.criterionId}".`);
          }
          const pending = rows.get(edit.alternativeId);
          const current = pending
            ? Object.hasOwn(pending, edit.criterionId)
              ? pending[edit.criterionId]
              : undefined
            : cellOf(matrix.cells, edit.alternativeId, edit.criterionId);
          if (cellsEqual(current, edit.value ?? undefined)) continue;
          let row = pending;
          if (!row) {
            row = Object.hasOwn(matrix.cells, edit.alternativeId)
              ? { ...matrix.cells[edit.alternativeId] }
              : {};
            rows.set(edit.alternativeId, row);
          }
          if (edit.value === null) delete row[edit.criterionId];
          else row[edit.criterionId] = edit.value;
        }
        if (rows.size === 0) return dataset;

        const cells: Record<string, Readonly<Record<string, CellValue>>> = { ...matrix.cells };
        for (const [alternativeId, row] of rows) {
          if (Object.keys(row).length === 0) delete cells[alternativeId];
          else cells[alternativeId] = row;
        }
        return { ...dataset, matrices: dataset.matrices.with(index, { ...matrix, cells }) };
      }),
    mergeKey,
  );
}

// --- Linguistic scales ----------------------------------------------------------------

/** Adds a scale, or replaces the scale with the same id. */
export function putScale(scale: LinguisticScale): ModelCommand {
  return command(
    'scale.put',
    (model) => {
      const index = model.scales.findIndex((item) => item.id === scale.id);
      if (index >= 0 && model.scales[index] === scale) return model;
      const scales = index < 0 ? [...model.scales, scale] : model.scales.with(index, scale);
      return { ...model, scales };
    },
    `scale.put:${scale.id}`,
  );
}

/**
 * Removes a scale. Criteria that used it keep their cells but no longer have a scale;
 * validation then reports their linguistic cells.
 */
export function removeScale(scaleId: string): ModelCommand {
  return command('scale.remove', (model) => {
    if (!model.scales.some((scale) => scale.id === scaleId)) {
      return invalid(`There is no scale "${scaleId}".`);
    }
    const datasets = model.datasets.map((dataset) => {
      if (!dataset.criteria.some((criterion) => criterion.scaleId === scaleId)) return dataset;
      return {
        ...dataset,
        criteria: dataset.criteria.map((criterion) =>
          criterion.scaleId === scaleId ? { ...criterion, scaleId: null } : criterion,
        ),
      };
    });
    return {
      scales: model.scales.filter((scale) => scale.id !== scaleId),
      datasets: datasets.every((dataset, index) => dataset === model.datasets[index])
        ? model.datasets
        : datasets,
    };
  });
}

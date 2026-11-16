import { isCriterionDirection, type TextRef } from '@mateo/engine';
import { ProjectError, type ProjectErrorCode } from '../errors';
import { isValidId } from './ids';
import type { CellValue, Dataset, LinguisticScale, ProjectModel, TfnValue } from './types';

export const NUMBER_TYPES = ['crisp', 'tfn'] as const;
export const MATRIX_ROLES = ['decision'] as const;

/**
 * Checks that a model can be stored and read back unchanged: ids are well-formed and
 * unique, references point at things that exist, enumerations hold known values and every
 * number is finite.
 *
 * It does not judge the decision problem (duplicate codes, empty cells, a TFN with
 * `l > m`...): that is validation in the engine and the editor, and a model that is still
 * being edited must be storable.
 *
 * `code` is the error raised: `INVALID_ARGUMENT` before saving, `CORRUPT_FILE` after
 * loading.
 */
export function assertValidModel(model: ProjectModel, code: ProjectErrorCode): void {
  const fail = (message: string): never => {
    throw new ProjectError(code, `Invalid project model: ${message}`);
  };
  const ids = new Set<string>();
  const claim = (id: unknown, what: string): void => {
    if (!isValidId(id)) fail(`${what} has the invalid id ${JSON.stringify(id)}.`);
    if (ids.has(id as string)) fail(`the id "${id as string}" is used more than once (${what}).`);
    ids.add(id as string);
  };

  if (!Array.isArray(model.scales) || !Array.isArray(model.datasets)) fail('malformed structure.');

  const scales = new Map<string, LinguisticScale>();
  for (const scale of model.scales) {
    claim(scale.id, 'scale');
    checkText(scale.name, `name of scale "${scale.id}"`, fail);
    if (scale.sourceId !== null && typeof scale.sourceId !== 'string') {
      fail(`scale "${scale.id}" has an invalid source id.`);
    }
    if (scale.numberType !== 'tfn') fail(`scale "${scale.id}" has an unknown number type.`);
    const termIds = new Set<string>();
    for (const term of scale.terms) {
      if (!isValidId(term.id)) fail(`a term of scale "${scale.id}" has an invalid id.`);
      if (termIds.has(term.id)) fail(`term "${term.id}" is repeated in scale "${scale.id}".`);
      termIds.add(term.id);
      checkText(term.label, `label of term "${term.id}"`, fail);
      if (typeof term.abbreviation !== 'string') fail(`term "${term.id}" has no abbreviation.`);
      checkTfn(term.value, `term "${term.id}" of scale "${scale.id}"`, fail);
    }
    scales.set(scale.id, scale);
  }

  for (const dataset of model.datasets) {
    claim(dataset.id, 'dataset');
    checkStrings(dataset, ['name', 'description', 'createdAt'], `dataset "${dataset.id}"`, fail);
    checkDataset(dataset, scales, claim, fail);
  }
}

function checkDataset(
  dataset: Dataset,
  scales: ReadonlyMap<string, LinguisticScale>,
  claim: (id: unknown, what: string) => void,
  fail: (message: string) => never,
): void {
  const criteria = new Set<string>();
  for (const criterion of dataset.criteria) {
    claim(criterion.id, 'criterion');
    const what = `criterion "${criterion.id}"`;
    checkStrings(criterion, ['code', 'name', 'description', 'unit'], what, fail);
    if (!isCriterionDirection(criterion.direction)) fail(`${what} has an unknown direction.`);
    if (!(NUMBER_TYPES as readonly string[]).includes(criterion.numberType)) {
      fail(`${what} has the unknown number type ${JSON.stringify(criterion.numberType)}.`);
    }
    if (criterion.scaleId !== null && !scales.has(criterion.scaleId)) {
      fail(`${what} refers to the missing scale ${JSON.stringify(criterion.scaleId)}.`);
    }
    criteria.add(criterion.id);
  }
  const alternatives = new Set<string>();
  for (const alternative of dataset.alternatives) {
    claim(alternative.id, 'alternative');
    const what = `alternative "${alternative.id}"`;
    checkStrings(alternative, ['code', 'name', 'description', 'group'], what, fail);
    alternatives.add(alternative.id);
  }
  for (const matrix of dataset.matrices) {
    claim(matrix.id, 'matrix');
    const what = `matrix "${matrix.id}"`;
    checkStrings(matrix, ['name'], what, fail);
    if (!(MATRIX_ROLES as readonly string[]).includes(matrix.role)) {
      fail(`${what} has the unknown role ${JSON.stringify(matrix.role)}.`);
    }
    for (const alternativeId of Object.keys(matrix.cells)) {
      if (!alternatives.has(alternativeId)) {
        fail(`${what} has cells for the unknown alternative "${alternativeId}".`);
      }
      const row = matrix.cells[alternativeId] as Readonly<Record<string, CellValue>>;
      for (const criterionId of Object.keys(row)) {
        if (!criteria.has(criterionId)) {
          fail(`${what} has a cell for the unknown criterion "${criterionId}".`);
        }
        checkCell(row[criterionId], `${what}, cell (${alternativeId}, ${criterionId})`, fail);
      }
    }
  }
}

function checkCell(cell: CellValue | undefined, what: string, fail: (m: string) => never): void {
  if (typeof cell !== 'object' || cell === null) return fail(`${what} is not a cell value.`);
  switch (cell.kind) {
    case 'crisp':
      if (typeof cell.value !== 'number' || !Number.isFinite(cell.value)) {
        fail(`${what} is not a finite number.`);
      }
      return;
    case 'tfn':
      return checkTfn(cell.value, what, fail);
    case 'term':
      if (!isValidId(cell.termId)) fail(`${what} has an invalid term id.`);
      return;
    default:
      return fail(
        `${what} has the unknown kind ${JSON.stringify((cell as { kind?: unknown }).kind)}.`,
      );
  }
}

function checkTfn(value: TfnValue, what: string, fail: (m: string) => never): void {
  const ok =
    typeof value === 'object' &&
    value !== null &&
    [value.l, value.m, value.u].every((part) => typeof part === 'number' && Number.isFinite(part));
  if (!ok) fail(`${what} is not a triangular fuzzy number of three finite numbers.`);
}

function checkStrings<T extends object>(
  entity: T,
  fields: readonly (keyof T & string)[],
  what: string,
  fail: (m: string) => never,
): void {
  for (const field of fields) {
    if (typeof entity[field] !== 'string') fail(`${what} has no text in "${field}".`);
  }
}

function checkText(ref: TextRef, what: string, fail: (m: string) => never): void {
  const value = ref as { key?: unknown; text?: unknown } | null;
  const ok =
    typeof value === 'object' &&
    value !== null &&
    (typeof value.key === 'string') !== (typeof value.text === 'string');
  if (!ok) fail(`the ${what} is neither a translation key nor a literal text.`);
}

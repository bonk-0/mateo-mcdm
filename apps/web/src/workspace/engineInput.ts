import { textLiteral, type Criterion, type DecisionMatrix } from '@mateo/engine';
import type { TFN } from '@mateo/fuzzy';
import type { CellValue, Dataset, LinguisticScale, ModelCriterion } from '@mateo/project';

/**
 * `classical`: plain numbers only.
 * `tfn`: triangular fuzzy numbers; plain numbers become degenerate TFNs.
 */
export type FuzzyModel = 'classical' | 'tfn';

export type DatasetProblem =
  | { readonly code: 'no-matrix' }
  | { readonly code: 'too-small' }
  | {
      readonly code: 'missing' | 'fuzzy-in-classical' | 'no-scale' | 'unknown-term';
      readonly alternativeId: string;
      readonly criterionId: string;
      readonly term?: string;
    };

export type MatrixBuild<T> =
  | { readonly ok: true; readonly matrix: DecisionMatrix<T> }
  | { readonly ok: false; readonly problems: readonly DatasetProblem[] };

type Converted<T> =
  | { readonly value: T }
  | {
      readonly problem: 'missing' | 'fuzzy-in-classical' | 'no-scale' | 'unknown-term';
      term?: string;
    };

function criterionOf(criterion: ModelCriterion, numberType: 'crisp' | 'tfn'): Criterion {
  return {
    id: criterion.id,
    name: textLiteral(criterion.name || criterion.code),
    direction: criterion.direction,
    ...(criterion.unit ? { unit: criterion.unit } : {}),
    numberType,
  };
}

function build<T>(
  dataset: Dataset,
  matrixId: string | undefined,
  numberType: 'crisp' | 'tfn',
  convert: (cell: CellValue | undefined, criterion: ModelCriterion) => Converted<T>,
): MatrixBuild<T> {
  const source = dataset.matrices.find((matrix) => matrix.id === matrixId) ?? dataset.matrices[0];
  if (!source) return { ok: false, problems: [{ code: 'no-matrix' }] };
  if (dataset.alternatives.length < 2 || dataset.criteria.length < 2) {
    return { ok: false, problems: [{ code: 'too-small' }] };
  }
  const problems: DatasetProblem[] = [];
  const values: T[][] = [];
  for (const alternative of dataset.alternatives) {
    const row: T[] = [];
    for (const criterion of dataset.criteria) {
      const converted = convert(source.cells[alternative.id]?.[criterion.id], criterion);
      if ('value' in converted) {
        row.push(converted.value);
      } else {
        problems.push({
          code: converted.problem,
          alternativeId: alternative.id,
          criterionId: criterion.id,
          ...(converted.term === undefined ? {} : { term: converted.term }),
        });
      }
    }
    values.push(row);
  }
  if (problems.length > 0) return { ok: false, problems };
  return {
    ok: true,
    matrix: {
      alternatives: dataset.alternatives.map((alternative) => ({
        id: alternative.id,
        name: textLiteral(alternative.name || alternative.code),
      })),
      criteria: dataset.criteria.map((criterion) => criterionOf(criterion, numberType)),
      values,
    },
  };
}

/** The decision matrix of plain numbers that CRITIC, MEREC and classical MARCOS take. */
export function buildCrispMatrix(dataset: Dataset, matrixId?: string): MatrixBuild<number> {
  return build<number>(dataset, matrixId, 'crisp', (cell) => {
    if (!cell) return { problem: 'missing' };
    return cell.kind === 'crisp' ? { value: cell.value } : { problem: 'fuzzy-in-classical' };
  });
}

/**
 * The decision matrix of triangular fuzzy numbers that Fuzzy MARCOS takes. Plain numbers
 * become the degenerate TFN (x, x, x); linguistic terms are looked up in the scale of
 * their criterion. Nothing is invented: a missing cell or an unknown term is a problem.
 */
export function buildTfnMatrix(
  dataset: Dataset,
  scales: readonly LinguisticScale[],
  matrixId?: string,
): MatrixBuild<TFN> {
  return build<TFN>(dataset, matrixId, 'tfn', (cell, criterion) => {
    if (!cell) return { problem: 'missing' };
    if (cell.kind === 'crisp') return { value: { l: cell.value, m: cell.value, u: cell.value } };
    if (cell.kind === 'tfn')
      return { value: { l: cell.value.l, m: cell.value.m, u: cell.value.u } };
    const scale = scales.find((item) => item.id === criterion.scaleId);
    if (!scale) return { problem: 'no-scale' };
    const term = scale.terms.find((item) => item.id === cell.termId);
    if (!term) return { problem: 'unknown-term', term: cell.termId };
    return { value: { l: term.value.l, m: term.value.m, u: term.value.u } };
  });
}

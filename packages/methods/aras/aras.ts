/**
 * ARAS: Additive Ratio ASsessment.
 *
 * Formulation: docs/methods/aras.md, from Zavadskas and Turskis (2010), Eqs. 1-10. An
 * optimal alternative x_0j joins the decision matrix as row 0. The decision maker can
 * enter it; without one it is the best value of every column (Eq. 2). Every alternative is
 * measured by its utility degree K_i = S_i / S_0 against it.
 *
 * Steps: initial matrix → weights → optimal alternative → extended matrix → column sums →
 * normalized matrix → weighted matrix → optimality function S_i → utility degree K_i →
 * ranking.
 */
import type {
  Criterion,
  DecisionMatrix,
  RankingResult,
  Reference,
  ValidationCollector,
  WeightVector,
} from '@mateo/engine';
import {
  alignWeights,
  alternativeAxis,
  checkCrispMatrix,
  checkCrispWeights,
  createTraceBuilder,
  createValidation,
  crisp,
  criterionAxis,
  defineMethod,
  ISSUE_CODES,
  NO_PARAMETERS,
  term,
} from '@mateo/engine';
import { FOR_BENEFIT, FOR_COST, formula, quantity, referenceRow } from '../src/common';

export const ARAS_ID = 'aras';
export const ARAS_VERSION = '1.0.0';

/** Row id of the optimal alternative in the trace. Alternatives may not use it. */
export const ARAS_OPTIMAL = 'A0';

export const ARAS_ISSUE_CODES = {
  /** An alternative id equals the id of the optimal alternative's row. */
  reservedAlternativeId: 'aras.reserved-alternative-id',
  /** The optimal alternative has no value, an unknown criterion or a repeated criterion. */
  optimalMismatch: 'aras.optimal-mismatch',
  /** A value of the optimal alternative is not a finite non-negative number. */
  invalidOptimalValue: 'aras.invalid-optimal-value',
  /** A cost criterion has a zero value: x_ij is inverted before normalisation. */
  zeroCostValue: 'aras.zero-cost-value',
  /** Every value of a benefit criterion, the optimal one included, is zero. */
  zeroBenefitSum: 'aras.zero-benefit-sum',
  /** S_0 of the optimal alternative is 0, so K_i = S_i / S_0 is undefined. */
  zeroOptimalSum: 'aras.zero-optimal-sum',
  /** The entered optimal value is worse than the best alternative on a criterion (warning). */
  optimalWorseThanAlternative: 'aras.optimal-worse-than-alternative',
} as const;

/** The values of the optimal alternative, one per criterion, keyed by criterion id. */
export type OptimalAlternative<T = number> = WeightVector<T>;

export interface ArasInput {
  readonly matrix: DecisionMatrix<number>;
  readonly weights: WeightVector;
  /** The optimal alternative of the decision maker. Default: the best value of each column. */
  readonly optimal?: OptimalAlternative;
}

export interface ArasResult extends RankingResult {
  /** Utility degree K_i of every alternative, in input order. */
  readonly utilityDegree: readonly number[];
  /** The utility degrees, as for every ranking method. */
  readonly scores: readonly number[];
}

export const ARAS_REFERENCES: readonly Reference[] = [
  {
    id: 'zavadskas2010',
    authors: ['Zavadskas, E. K.', 'Turskis, Z.'],
    year: 2010,
    title: 'A new additive ratio assessment (ARAS) method in multicriteria decision-making',
    source: 'Technological and Economic Development of Economy',
    volume: '16',
    issue: '2',
    pages: '159-172',
    doi: '10.3846/tede.2010.10',
    note: 'Section 3, Eqs. 1-10, and the worked example of Tables 1-3, used as the golden test (with the input correction listed in the fixture).',
  },
];

const key = (path: string): string => `methods.aras.${path}`;
const step = (id: string) => ({
  id,
  nameKey: key(`steps.${id}.name`),
  explanationKey: key(`steps.${id}.explanation`),
});

// ---------------------------------------------------------------- validation

/**
 * Checks that the optimal alternative has exactly one valid value per criterion. `isValid`
 * decides for one value of the number type (finite and non-negative for crisp numbers, a
 * valid non-negative TFN for TFNs). Shared with ARAS-F.
 */
export function checkOptimalAlternative(
  optimal: unknown,
  criteria: readonly Criterion[],
  numberType: string,
  isValid: (value: unknown) => boolean,
  v: ValidationCollector,
): void {
  const location = { input: 'optimal' };
  const entries = (optimal as { entries?: unknown } | null)?.entries;
  if (
    typeof optimal !== 'object' ||
    optimal === null ||
    (optimal as { numberType?: unknown }).numberType !== numberType ||
    !Array.isArray(entries)
  ) {
    v.error(ISSUE_CODES.inputMalformed, { params: { input: 'optimal' }, location });
    return;
  }
  const known = new Map(criteria.map((criterion, index) => [criterion.id, index]));
  const seen = new Set<string>();
  for (const entry of entries as { criterionId?: unknown; value?: unknown }[]) {
    const id = typeof entry?.criterionId === 'string' ? entry.criterionId : undefined;
    const index = id === undefined ? undefined : known.get(id);
    if (id === undefined || index === undefined || seen.has(id)) {
      v.error(ARAS_ISSUE_CODES.optimalMismatch, { params: { id: String(id) }, location });
      continue;
    }
    seen.add(id);
    if (!isValid(entry.value)) {
      v.error(ARAS_ISSUE_CODES.invalidOptimalValue, {
        params: { id },
        location: { ...location, column: { index, id } },
      });
    }
  }
  for (const criterion of criteria) {
    if (!seen.has(criterion.id)) {
      v.error(ARAS_ISSUE_CODES.optimalMismatch, { params: { id: criterion.id }, location });
    }
  }
}

/**
 * The checks of the ARAS calculation itself, on a crisp matrix, crisp weights and a crisp
 * optimal row that passed the structural checks. `explicitOptimal` is whether the decision
 * maker entered the optimal row (the default one cannot be worse than the data). Shared
 * with ARAS-F, which runs it on the defuzzified values.
 */
export function validateArasCalculation(
  matrix: DecisionMatrix<number>,
  weights: readonly number[],
  optimal: readonly number[],
  explicitOptimal: boolean,
  v: ValidationCollector,
): void {
  const { criteria, alternatives, values } = matrix;
  criteria.forEach((criterion, j) => {
    const column = { index: j, id: criterion.id };
    if (criterion.direction === 'cost') {
      values.forEach((row, i) => {
        if (row[j] === 0) {
          v.error(ARAS_ISSUE_CODES.zeroCostValue, {
            params: { id: criterion.id },
            location: { input: 'matrix', row: { index: i, id: alternatives[i]!.id }, column },
          });
        }
      });
      // The default optimum is a value of the data, which the loop above already reported.
      if (explicitOptimal && optimal[j] === 0) {
        v.error(ARAS_ISSUE_CODES.zeroCostValue, {
          params: { id: criterion.id },
          location: { input: 'optimal', column },
        });
      }
    } else if (optimal[j] === 0 && values.every((row) => row[j] === 0)) {
      v.error(ARAS_ISSUE_CODES.zeroBenefitSum, {
        params: { id: criterion.id },
        location: { input: 'matrix', column },
      });
    }
  });
  if (v.hasErrors) return;

  // S_0 = Σ_j w_j · x̄_0j is 0 only when every criterion with a positive weight is a
  // benefit criterion whose optimal value is 0 (a cost criterion has x̄_0j > 0).
  const optimalSum = criteria.some(
    (criterion, j) =>
      (weights[j] as number) > 0 && (criterion.direction === 'cost' || (optimal[j] as number) > 0),
  );
  if (!optimalSum) v.error(ARAS_ISSUE_CODES.zeroOptimalSum, { location: { input: 'optimal' } });

  if (explicitOptimal) {
    criteria.forEach((criterion, j) => {
      const column = values.map((row) => row[j] as number);
      const best = criterion.direction === 'benefit' ? Math.max(...column) : Math.min(...column);
      const worse =
        criterion.direction === 'benefit'
          ? (optimal[j] as number) < best
          : (optimal[j] as number) > best;
      if (worse) {
        v.warning(ARAS_ISSUE_CODES.optimalWorseThanAlternative, {
          params: { id: criterion.id },
          location: { input: 'optimal', column: { index: j, id: criterion.id } },
        });
      }
    });
  }
}

/** Reserved row id, shared with ARAS-F. */
export function checkReservedAlternativeIds(
  alternatives: readonly { readonly id: string }[],
  v: ValidationCollector,
): void {
  alternatives.forEach((alternative, index) => {
    if (alternative.id === ARAS_OPTIMAL) {
      v.error(ARAS_ISSUE_CODES.reservedAlternativeId, {
        params: { id: alternative.id },
        location: { input: 'matrix', row: { index, id: alternative.id } },
      });
    }
  });
}

const isNonNegativeNumber = (value: unknown): boolean =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0;

function validateAras(input: ArasInput, v: ValidationCollector): void {
  v.add(checkCrispMatrix(input?.matrix, { sign: 'non-negative', supportedNumberTypes: ['crisp'] }));
  if (v.hasErrors) return;
  const { matrix } = input;
  checkReservedAlternativeIds(matrix.alternatives, v);
  const criterionIds = matrix.criteria.map((criterion) => criterion.id);
  // Scaling every weight by the same factor scales every S_i and leaves K_i unchanged.
  v.add(checkCrispWeights(input.weights, criterionIds, { notNormalized: 'ignore' }));
  if (input.optimal !== undefined) {
    checkOptimalAlternative(input.optimal, matrix.criteria, 'crisp', isNonNegativeNumber, v);
  }
  if (v.hasErrors) return;

  const weights = alignWeights(input.weights, criterionIds) as number[];
  const optimal =
    input.optimal === undefined
      ? matrix.criteria.map((criterion, j) => {
          const column = matrix.values.map((row) => row[j] as number);
          return criterion.direction === 'benefit' ? Math.max(...column) : Math.min(...column);
        })
      : (alignWeights(input.optimal, criterionIds) as number[]);
  validateArasCalculation(matrix, weights, optimal, input.optimal !== undefined, v);
}

// ---------------------------------------------------------------- method

const OPTIMAL_TERMS = [
  ['x_0', 'x_{0j}'],
  ['x', 'x_{ij}'],
] as const;

const NORM_TERMS = [
  ['n', String.raw`\bar{x}_{ij}`],
  ['x', 'x_{ij}'],
  ['x_sum', String.raw`\sum_{i=0}^{m} x_{ij}`],
] as const;

export const arasMethod = defineMethod({
  id: ARAS_ID,
  version: ARAS_VERSION,
  category: 'ranking',
  nameKey: key('name'),
  supportedNumberTypes: ['crisp'],
  inputSchema: [
    { name: 'matrix', kind: 'decision-matrix', required: true, numberTypes: ['crisp'] },
    { name: 'weights', kind: 'weights', required: true, numberTypes: ['crisp'] },
    { name: 'optimal', kind: 'optimal-alternative', required: false, numberTypes: ['crisp'] },
  ],
  outputSchema: [
    { name: 'scores', kind: 'scores', numberTypes: ['crisp'] },
    { name: 'ranking', kind: 'ranking', numberTypes: ['crisp'] },
  ],
  parameters: NO_PARAMETERS,
  references: ARAS_REFERENCES,

  validate(input: ArasInput) {
    const v = createValidation();
    validateAras(input, v);
    return v.result();
  },

  run(input: ArasInput) {
    const { matrix } = input;
    const tb = createTraceBuilder({ methodId: ARAS_ID, methodVersion: ARAS_VERSION });
    const alternatives = alternativeAxis(matrix.alternatives);
    const criteria = criterionAxis(matrix.criteria);
    const optimalRow = referenceRow(ARAS_OPTIMAL, key('rows.optimal'));

    const x = tb.inputMatrix({ ...step('initial-matrix'), matrix });
    const w = tb.inputWeights({
      ...step('weights'),
      weights: input.weights,
      criteria: matrix.criteria,
    });

    // Eq. 2, unless the decision maker entered the optimal alternative.
    const optimal =
      input.optimal === undefined
        ? tb.rowVector<number>({
            ...step('optimal-alternative'),
            formulas: [
              formula(
                'optimal-benefit',
                String.raw`{{x_0}} = \max_i {{x}}`,
                OPTIMAL_TERMS,
                FOR_BENEFIT,
              ),
              formula('optimal-cost', String.raw`{{x_0}} = \min_i {{x}}`, OPTIMAL_TERMS, FOR_COST),
            ],
            items: x.columns,
            row: optimalRow,
            cell: (column) => {
              const direction = matrix.criteria[column.index]!.direction;
              const values = term(x.column(column.index), 'x');
              return {
                tracked: direction === 'benefit' ? crisp.max(values) : crisp.min(values),
                formula: `optimal-${direction}`,
              };
            },
          })
        : tb.inputWeights<number>({
            ...step('optimal-alternative'),
            input: 'optimal',
            weights: input.optimal,
            criteria: matrix.criteria,
            row: optimalRow,
          });

    const extended = tb.table<number>({
      ...step('extended-matrix'),
      visualization: { view: 'matrix', basedOn: x.id, highlightRows: [ARAS_OPTIMAL] },
      rows: [optimalRow, ...alternatives],
      columns: criteria,
      cell: (row, column) =>
        row.index === 0 ? optimal.at(column.index) : x.cell(row.index - 1, column.index),
    });

    // Eq. 5: a benefit column is divided by its sum, a cost column is first inverted.
    const columnSums = tb.rowVector<number>({
      ...step('column-sums'),
      formulas: [
        formula(
          'sum-benefit',
          String.raw`{{x_sum}} = \sum_{i=0}^{m} {{x}}`,
          [
            ['x_sum', String.raw`\sum_{i=0}^{m} x_{ij}`],
            ['x', 'x_{ij}'],
          ],
          FOR_BENEFIT,
        ),
        formula(
          'sum-cost',
          String.raw`{{x_sum}} = \sum_{i=0}^{m} \frac{1}{ {{x}} }`,
          [
            ['x_sum', String.raw`\sum_{i=0}^{m} \frac{1}{x_{ij}}`],
            ['x', 'x_{ij}'],
          ],
          FOR_COST,
        ),
      ],
      items: criteria,
      row: quantity('x-sum', key('rows.columnSum')),
      cell: (column) => {
        const direction = matrix.criteria[column.index]!.direction;
        const values = term(extended.column(column.index), 'x');
        return {
          tracked: direction === 'benefit' ? crisp.sum(values) : crisp.sumOfReciprocals(values),
          formula: `sum-${direction}`,
        };
      },
    });
    const normalized = tb.table<number>({
      ...step('normalized-matrix'),
      formulas: [
        formula(
          'benefit',
          String.raw`{{n}} = \frac{ {{x}} }{ {{x_sum}} }`,
          NORM_TERMS,
          FOR_BENEFIT,
        ),
        formula(
          'cost',
          String.raw`{{n}} = \frac{ 1 / {{x}} }{ {{x_sum}} }`,
          [
            ['n', String.raw`\bar{x}_{ij}`],
            ['x', 'x_{ij}'],
            ['x_sum', String.raw`\sum_{i=0}^{m} \frac{1}{x_{ij}}`],
          ],
          FOR_COST,
        ),
      ],
      rows: extended.rows,
      columns: criteria,
      visualization: { view: 'matrix', basedOn: extended.id },
      cell: (row, column) => {
        const direction = matrix.criteria[column.index]!.direction;
        const value = term(extended.cell(row.index, column.index), 'x');
        const sum = term(columnSums.at(column.index), 'x_sum');
        return {
          tracked:
            direction === 'benefit'
              ? crisp.divide(value, sum)
              : crisp.divide(crisp.divide(1, value), sum),
          formula: direction,
        };
      },
    });

    // Eq. 8: weighted value v_ij = w_j · x̄_ij, Eq. 9: S_i = Σ_j v_ij.
    const weighted = tb.table<number>({
      ...step('weighted-matrix'),
      formulas: [
        formula('weighted', String.raw`{{v}} = {{w}} \cdot {{n}}`, [
          ['v', 'v_{ij}'],
          ['w', 'w_j'],
          ['n', String.raw`\bar{x}_{ij}`],
        ]),
      ],
      rows: extended.rows,
      columns: criteria,
      visualization: { view: 'matrix', basedOn: normalized.id },
      cell: (row, column) =>
        crisp.multiply(
          term(w.at(column.index), 'w'),
          term(normalized.cell(row.index, column.index), 'n'),
        ),
    });
    const s = tb.columnVector<number>({
      ...step('sums'),
      formulas: [
        formula('sum', String.raw`{{S}} = \sum_{j=1}^{n} {{v}}`, [
          ['S', 'S_i'],
          ['v', 'v_{ij}'],
        ]),
      ],
      items: extended.rows,
      column: quantity('s', key('columns.S')),
      cell: (item) => crisp.sum(term(weighted.row(item.index), 'v')),
    });

    // Eq. 10: K_i = S_i / S_0. K_0 is 1 by definition.
    const s0 = term(s.at(ARAS_OPTIMAL), 'S_0');
    const k = tb.columnVector<number>({
      ...step('utility-degree'),
      role: 'result',
      formulas: [
        formula('utility-degree', String.raw`{{K}} = \frac{ {{S}} }{ {{S_0}} }`, [
          ['K', 'K_i'],
          ['S', 'S_i'],
          ['S_0', 'S_0'],
        ]),
      ],
      items: extended.rows,
      column: quantity('k', key('columns.K')),
      visualization: { view: 'bars', basedOn: s.id },
      cell: (item) => crisp.divide(term(s.at(item.index), 'S'), s0),
    });

    const ranks = crisp.rank(k.range({ rows: matrix.alternatives.map((a) => a.id) }));
    const ranking = tb.columnVector<number>({
      ...step('ranking'),
      role: 'result',
      items: alternatives,
      column: quantity('rank', key('columns.rank')),
      visualization: { view: 'ranking', basedOn: k.id },
      cell: (item) => ranks[item.index]!,
    });

    const utilityDegree = k
      .values()
      .slice(1)
      .map((cells) => cells[0] as number);
    const rankValues = ranking.values().map((cells) => cells[0] as number);
    const result: ArasResult = {
      utilityDegree,
      scores: utilityDegree,
      ranking: matrix.alternatives.map((alternative, i) => ({
        alternativeId: alternative.id,
        score: utilityDegree[i]!,
        rank: rankValues[i]!,
      })),
    };
    return { result, trace: tb.build() };
  },
});

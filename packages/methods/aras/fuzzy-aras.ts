/**
 * ARAS-F: ARAS with triangular fuzzy numbers, after Turskis and Zavadskas (2010).
 *
 * NOT YET VERIFIED against a published example (docs/methods/aras.md): the optimal row of
 * the paper's example is not legible in the available copy, so this method is tested with
 * property tests only (crisp input gives crisp ARAS, every TFN stays valid) until a golden
 * test exists. The formulas follow the fuzzy arithmetic of the method:
 *
 * - the optimal alternative x̃_0j is entered by the decision maker or, by default, the
 *   component-wise best TFN of the column;
 * - a cost criterion is inverted first, x̃' = 1 ⊘ x̃, and every column is divided by the sum
 *   of its TFNs (row 0 included): x̄_ij = x̃'_ij ⊘ Σ_{i=0}^{m} x̃'_ij;
 * - S̃_i = Σ_j w̃_j ⊗ x̄_ij is defuzzified (centroid, the default) before K_i = S_i / S_0.
 *
 * Steps: initial matrix → weights → optimal alternative → extended matrix → [inverted
 * matrix] → column sums → normalized matrix → weighted matrix → fuzzy sums S̃_i →
 * defuzzified sums S_i → utility degree K_i → ranking.
 */
import type {
  Criterion,
  DecisionMatrix,
  Reference,
  StepHandle,
  Tracked,
  ValidationCollector,
  WeightVector,
} from '@mateo/engine';
import {
  alignWeights,
  alternativeAxis,
  createTraceBuilder,
  createValidation,
  crisp,
  criterionAxis,
  defineMethod,
  defineParameters,
  term,
} from '@mateo/engine';
import type { DefuzzificationId, TFN } from '@mateo/fuzzy';
import { checkTfnMatrix, centroid, encodeTfn, tfnOps, tfnProblem } from '@mateo/fuzzy';
import {
  checkTfnOrCrispWeights,
  FOR_BENEFIT,
  FOR_COST,
  formula,
  quantity,
  referenceRow,
} from '../src/common';
import type { ArasResult, OptimalAlternative } from './aras';
import {
  ARAS_ISSUE_CODES,
  ARAS_OPTIMAL,
  ARAS_REFERENCES,
  checkOptimalAlternative,
  checkReservedAlternativeIds,
} from './aras';

export const FUZZY_ARAS_ID = 'fuzzy-aras';
export const FUZZY_ARAS_VERSION = '1.0.0';

export const FUZZY_ARAS_ISSUE_CODES = {
  /** The weights are neither crisp nor TFN. */
  unsupportedWeights: 'fuzzy-aras.unsupported-weights',
  /** A cost criterion has a TFN with l = 0: 1 ⊘ x̃ divides by it. */
  zeroCostValue: 'fuzzy-aras.zero-cost-value',
  /** Every lower value l of a benefit criterion, the optimal one included, is 0. */
  zeroBenefitLowerSum: 'fuzzy-aras.zero-benefit-lower-sum',
  /** S̃_0 of the optimal alternative is 0, so K_i = S_i / S_0 is undefined. */
  zeroOptimalSum: 'fuzzy-aras.zero-optimal-sum',
} as const;

/** TFN weights or crisp weights, which enter the weighted matrix as the TFN (w, w, w). */
export type FuzzyArasWeights = WeightVector<TFN> | WeightVector<number>;

export interface FuzzyArasInput {
  readonly matrix: DecisionMatrix<TFN>;
  readonly weights: FuzzyArasWeights;
  /** The optimal alternative of the decision maker. Default: the best TFN of each column. */
  readonly optimal?: OptimalAlternative<TFN>;
}

export type FuzzyArasResult = ArasResult;

const parameters = defineParameters({
  defuzzification: {
    type: 'enum',
    labelKey: 'methods.fuzzyAras.parameters.defuzzification.label',
    descriptionKey: 'methods.fuzzyAras.parameters.defuzzification.description',
    default: 'centroid',
    options: [
      { value: 'centroid', labelKey: 'methods.fuzzyAras.parameters.defuzzification.centroid' },
      {
        value: 'graded-mean',
        labelKey: 'methods.fuzzyAras.parameters.defuzzification.gradedMean',
      },
    ],
  },
});

export const FUZZY_ARAS_REFERENCES: readonly Reference[] = [
  {
    id: 'turskis2010',
    authors: ['Turskis, Z.', 'Zavadskas, E. K.'],
    year: 2010,
    title:
      'A new fuzzy additive ratio assessment method (ARAS-F). Case study: The analysis of fuzzy multiple criteria in order to select the logistic centers location',
    source: 'Transport',
    volume: '25',
    issue: '4',
    pages: '423-432',
    doi: '10.3846/transport.2010.52',
    note: 'TFN ratings, sum normalisation of TFNs, defuzzification of S̃_i before K_i = S_i / S_0. Implemented from the formulas of the method and tested with property tests; the worked example is not reproduced, so the variant is not yet verified against a published example.',
  },
  ...ARAS_REFERENCES,
];

const key = (path: string): string => `methods.fuzzyAras.${path}`;
const step = (id: string) => ({
  id,
  nameKey: key(`steps.${id}.name`),
  explanationKey: key(`steps.${id}.explanation`),
});

const isTfnWeights = (weights: FuzzyArasWeights): weights is WeightVector<TFN> =>
  weights.numberType === 'tfn';

// ---------------------------------------------------------------- validation

const isNonNegativeTfn = (value: unknown): boolean =>
  tfnProblem(value) === undefined && (value as TFN).l >= 0;

function validateFuzzyAras(
  input: FuzzyArasInput,
  defuzzification: DefuzzificationId,
  v: ValidationCollector,
): void {
  v.add(checkTfnMatrix(input?.matrix, { sign: 'non-negative', supportedNumberTypes: ['tfn'] }));
  if (v.hasErrors) return;
  const { matrix } = input;
  checkReservedAlternativeIds(matrix.alternatives, v);
  const criterionIds = matrix.criteria.map((criterion) => criterion.id);
  checkTfnOrCrispWeights(input.weights, criterionIds, FUZZY_ARAS_ISSUE_CODES.unsupportedWeights, v);
  if (input.optimal !== undefined) {
    checkOptimalAlternative(input.optimal, matrix.criteria, 'tfn', isNonNegativeTfn, v);
  }
  if (v.hasErrors) return;

  const optimal: readonly TFN[] =
    input.optimal === undefined
      ? matrix.criteria.map((criterion, j) => {
          const column = matrix.values.map((row) => row[j] as TFN);
          const pick = criterion.direction === 'benefit' ? Math.max : Math.min;
          return {
            l: pick(...column.map((x) => x.l)),
            m: pick(...column.map((x) => x.m)),
            u: pick(...column.map((x) => x.u)),
          };
        })
      : (alignWeights(input.optimal, criterionIds) as TFN[]);
  const weightUpper = alignWeights<TFN | number>(input.weights, criterionIds).map((w) =>
    typeof w === 'number' ? w : (w as TFN).u,
  );

  matrix.criteria.forEach((criterion, j) => {
    const column = { index: j, id: criterion.id };
    if (criterion.direction === 'cost') {
      matrix.values.forEach((row, i) => {
        if ((row[j] as TFN).l === 0) {
          v.error(FUZZY_ARAS_ISSUE_CODES.zeroCostValue, {
            params: { id: criterion.id },
            location: {
              input: 'matrix',
              row: { index: i, id: matrix.alternatives[i]!.id },
              column,
            },
          });
        }
      });
      // The default optimum is a value of the data, which the loop above already reported.
      if (input.optimal !== undefined && (optimal[j] as TFN).l === 0) {
        v.error(FUZZY_ARAS_ISSUE_CODES.zeroCostValue, {
          params: { id: criterion.id },
          location: { input: 'optimal', column },
        });
      }
    } else if (
      (optimal[j] as TFN).l === 0 &&
      matrix.values.every((row) => (row[j] as TFN).l === 0)
    ) {
      v.error(FUZZY_ARAS_ISSUE_CODES.zeroBenefitLowerSum, {
        params: { id: criterion.id },
        location: { input: 'matrix', column },
      });
    }
  });
  if (v.hasErrors) return;

  // S̃_0 is (0, 0, 0) only when every criterion with a positive weight is a benefit
  // criterion whose optimal value is (0, 0, 0): a cost criterion has x̄_0j > 0.
  const hasOptimalSum = matrix.criteria.some(
    (criterion, j) =>
      (weightUpper[j] as number) > 0 &&
      (criterion.direction === 'cost' || (optimal[j] as TFN).u > 0),
  );
  if (!hasOptimalSum) {
    v.error(FUZZY_ARAS_ISSUE_CODES.zeroOptimalSum, { location: { input: 'optimal' } });
  }

  if (input.optimal !== undefined) warnOptimalWorse(matrix, optimal, defuzzification, v);
}

/** Warns where the entered optimal TFN is worse, by its defuzzified value, than the best alternative. */
function warnOptimalWorse(
  matrix: DecisionMatrix<TFN>,
  optimal: readonly TFN[],
  defuzzification: DefuzzificationId,
  v: ValidationCollector,
): void {
  const crispValue = (x: TFN) =>
    defuzzification === 'centroid' ? centroid(x) : (x.l + 4 * x.m + x.u) / 6;
  matrix.criteria.forEach((criterion: Criterion, j) => {
    const column = matrix.values.map((row) => crispValue(row[j] as TFN));
    const best = criterion.direction === 'benefit' ? Math.max(...column) : Math.min(...column);
    const own = crispValue(optimal[j] as TFN);
    if (criterion.direction === 'benefit' ? own < best : own > best) {
      v.warning(ARAS_ISSUE_CODES.optimalWorseThanAlternative, {
        params: { id: criterion.id },
        location: { input: 'optimal', column: { index: j, id: criterion.id } },
      });
    }
  });
}

// ---------------------------------------------------------------- method

export const fuzzyArasMethod = defineMethod({
  id: FUZZY_ARAS_ID,
  version: FUZZY_ARAS_VERSION,
  category: 'ranking',
  nameKey: key('name'),
  supportedNumberTypes: ['tfn'],
  inputSchema: [
    { name: 'matrix', kind: 'decision-matrix', required: true, numberTypes: ['tfn'] },
    { name: 'weights', kind: 'weights', required: true, numberTypes: ['tfn', 'crisp'] },
    { name: 'optimal', kind: 'optimal-alternative', required: false, numberTypes: ['tfn'] },
  ],
  outputSchema: [
    { name: 'scores', kind: 'scores', numberTypes: ['crisp'] },
    { name: 'ranking', kind: 'ranking', numberTypes: ['crisp'] },
  ],
  parameters,
  references: FUZZY_ARAS_REFERENCES,

  validate(input: FuzzyArasInput, params) {
    const v = createValidation();
    validateFuzzyAras(input, params.defuzzification, v);
    return v.result();
  },

  run(input: FuzzyArasInput, params) {
    const { matrix } = input;
    const defuzzification: DefuzzificationId = params.defuzzification;
    const tb = createTraceBuilder({ methodId: FUZZY_ARAS_ID, methodVersion: FUZZY_ARAS_VERSION });
    const alternatives = alternativeAxis(matrix.alternatives);
    const criteria = criterionAxis(matrix.criteria);
    const optimalRow = referenceRow(ARAS_OPTIMAL, key('rows.optimal'));

    const x = tb.inputMatrix<TFN>({ ...step('initial-matrix'), matrix, encode: encodeTfn });

    // Weights: TFNs are multiplied as TFNs, crisp weights as scalars (the TFN (w, w, w)).
    const weights = input.weights;
    let weightOf: (column: number) => Tracked<TFN> | Tracked<number>;
    let fuzzyWeights = false;
    if (isTfnWeights(weights)) {
      fuzzyWeights = true;
      const w = tb.inputWeights<TFN>({
        ...step('weights'),
        weights,
        criteria: matrix.criteria,
        encode: encodeTfn,
      });
      weightOf = (j) => w.at(j);
    } else {
      const w = tb.inputWeights<number>({ ...step('weights'), weights, criteria: matrix.criteria });
      weightOf = (j) => w.at(j);
    }

    const optimal =
      input.optimal === undefined
        ? tb.rowVector<TFN>({
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
                tracked: direction === 'benefit' ? tfnOps.max(values) : tfnOps.min(values),
                formula: `optimal-${direction}`,
              };
            },
          })
        : tb.inputWeights<TFN>({
            ...step('optimal-alternative'),
            input: 'optimal',
            weights: input.optimal,
            criteria: matrix.criteria,
            row: optimalRow,
            encode: encodeTfn,
          });

    const extended = tb.table<TFN>({
      ...step('extended-matrix'),
      visualization: { view: 'matrix', basedOn: x.id, highlightRows: [ARAS_OPTIMAL] },
      rows: [optimalRow, ...alternatives],
      columns: criteria,
      cell: (row, column) =>
        row.index === 0 ? optimal.at(column.index) : x.cell(row.index - 1, column.index),
    });

    // A cost criterion is inverted first: x̃' = 1 ⊘ x̃. Benefit columns stay as they are.
    const inverted = tb.table<TFN>({
      ...step('inverted-matrix'),
      formulas: [
        formula('benefit', String.raw`{{x_inv}} = {{x}}`, INVERT_TERMS, FOR_BENEFIT),
        formula('cost', String.raw`{{x_inv}} = 1 \oslash {{x}}`, INVERT_TERMS, FOR_COST),
      ],
      rows: extended.rows,
      columns: criteria,
      visualization: { view: 'matrix', basedOn: extended.id },
      cell: (row, column) => {
        const direction = matrix.criteria[column.index]!.direction;
        const value = term(extended.cell(row.index, column.index), 'x');
        return {
          tracked: direction === 'benefit' ? value : tfnOps.scalarDividedBy(1, value),
          formula: direction,
        };
      },
    });
    const columnSums = tb.rowVector<TFN>({
      ...step('column-sums'),
      formulas: [
        formula('column-sum', String.raw`{{x_sum}} = \sum_{i=0}^{m} {{x_inv}}`, [
          ['x_sum', String.raw`\sum_{i=0}^{m} \tilde{x}'_{ij}`],
          ['x_inv', String.raw`\tilde{x}'_{ij}`],
        ]),
      ],
      items: criteria,
      row: quantity('x-sum', key('rows.columnSum')),
      cell: (column) => tfnOps.sum(term(inverted.column(column.index), 'x_inv')),
    });
    const normalized = tb.table<TFN>({
      ...step('normalized-matrix'),
      formulas: [
        formula('normalized', String.raw`{{n}} = {{x_inv}} \oslash {{x_sum}}`, [
          ['n', String.raw`\bar{x}_{ij}`],
          ['x_inv', String.raw`\tilde{x}'_{ij}`],
          ['x_sum', String.raw`\sum_{i=0}^{m} \tilde{x}'_{ij}`],
        ]),
      ],
      rows: extended.rows,
      columns: criteria,
      visualization: { view: 'matrix', basedOn: inverted.id },
      cell: (row, column) =>
        tfnOps.divide(
          term(inverted.cell(row.index, column.index), 'x_inv'),
          term(columnSums.at(column.index), 'x_sum'),
        ),
    });

    const weighted = tb.table<TFN>({
      ...step('weighted-matrix'),
      formulas: [
        formula('weighted', String.raw`{{v}} = {{n}} \otimes {{w}}`, [
          ['v', String.raw`\tilde{v}_{ij}`],
          ['n', String.raw`\bar{x}_{ij}`],
          ['w', fuzzyWeights ? String.raw`\tilde{w}_j` : 'w_j'],
        ]),
      ],
      rows: extended.rows,
      columns: criteria,
      visualization: { view: 'matrix', basedOn: normalized.id },
      cell: (row, column) => {
        const value = term(normalized.cell(row.index, column.index), 'n');
        const weight = weightOf(column.index);
        return fuzzyWeights
          ? tfnOps.multiply(value, term(weight as Tracked<TFN>, 'w'))
          : tfnOps.multiplyByScalar(value, term(weight as Tracked<number>, 'w'));
      },
    });
    const sums = tb.columnVector<TFN>({
      ...step('fuzzy-sums'),
      formulas: [
        formula('sum', String.raw`{{S}} = \sum_{j=1}^{n} {{v}}`, [
          ['S', String.raw`\tilde{S}_i`],
          ['v', String.raw`\tilde{v}_{ij}`],
        ]),
      ],
      items: extended.rows,
      column: quantity('s-fuzzy', key('columns.SFuzzy')),
      cell: (item) => tfnOps.sum(term(weighted.row(item.index), 'v')),
    });
    const s = tb.columnVector<number>({
      ...step('sums'),
      formulas: [
        formula(`defuzzify-${defuzzification}`, defuzzifyTemplate(defuzzification), [
          ['S', 'S_i'],
          ['a', String.raw`\tilde{S}_i`],
        ]),
      ],
      items: extended.rows,
      column: quantity('s', key('columns.S')),
      cell: (item) => tfnOps.defuzzify(defuzzification, term(sums.at(item.index), 'a')),
    });

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

    const column = (handle: StepHandle<number>) =>
      handle.values().map((cells) => cells[0] as number);
    const utilityDegree = column(k).slice(1);
    const rankValues = column(ranking);
    const result: FuzzyArasResult = {
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

const OPTIMAL_TERMS = [
  ['x_0', String.raw`\tilde{x}_{0j}`],
  ['x', String.raw`\tilde{x}_{ij}`],
] as const;

const INVERT_TERMS = [
  ['x_inv', String.raw`\tilde{x}'_{ij}`],
  ['x', String.raw`\tilde{x}_{ij}`],
] as const;

function defuzzifyTemplate(id: DefuzzificationId): string {
  return id === 'centroid'
    ? String.raw`{{S}} = \frac{ a^l + a^m + a^u }{3}, \; {{a}} = (a^l, a^m, a^u)`
    : String.raw`{{S}} = \frac{ a^l + 4 a^m + a^u }{6}, \; {{a}} = (a^l, a^m, a^u)`;
}

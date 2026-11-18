/**
 * COPRAS: COmplex PRoportional ASsessment.
 *
 * Formulation: docs/methods/copras.md, as restated in Podvezko (2011), Eqs. 6-11, after
 * Zavadskas, Kaklauskas and Šarka (1994).
 *
 * Steps: initial matrix → weights → column sums → weighted normalized matrix d_ij →
 * sums S⁺ and S⁻ → relative significance Q_i → utility degree N_i → ranking.
 *
 * `addCoprasSteps` records everything after the weights, so that Fuzzy COPRAS can run the
 * same steps on its defuzzified matrix.
 */
import type {
  Alternative,
  Criterion,
  DecisionMatrix,
  RankingResult,
  Reference,
  StepHandle,
  TraceBuilder,
  ValidationCollector,
  WeightVector,
} from '@mateo/engine';
import {
  alignWeights,
  alternativeAxis,
  checkCrispMatrix,
  checkCrispWeights,
  constant,
  createTraceBuilder,
  createValidation,
  crisp,
  criterionAxis,
  defineMethod,
  NO_PARAMETERS,
  term,
} from '@mateo/engine';
import { formula, quantity } from '../src/common';

export const COPRAS_ID = 'copras';
export const COPRAS_VERSION = '1.0.0';

export const COPRAS_ISSUE_CODES = {
  /** Every value of a criterion is 0: d_ij = w_j x_ij / Σ x_ij divides by the column sum. */
  zeroColumnSum: 'copras.zero-column-sum',
  /** S⁻ of an alternative is 0, so Q_i divides by it. */
  zeroCostSum: 'copras.zero-cost-sum',
} as const;

export interface CoprasInput {
  readonly matrix: DecisionMatrix<number>;
  readonly weights: WeightVector;
}

export interface CoprasResult extends RankingResult {
  /** Relative significance Q_i of every alternative, in input order. */
  readonly relativeSignificance: readonly number[];
  /** Utility degree N_i = 100 · Q_i / max Q, the score the ranking is based on. */
  readonly utilityDegree: readonly number[];
  /** The utility degrees, as for every ranking method. */
  readonly scores: readonly number[];
}

export const COPRAS_REFERENCES: readonly Reference[] = [
  {
    id: 'zavadskas1994',
    authors: ['Zavadskas, E. K.', 'Kaklauskas, A.', 'Šarka, V.'],
    year: 1994,
    title: 'The new method of multicriteria complex proportional assessment of projects',
    source: 'Technological and Economic Development of Economy',
    volume: '1',
    issue: '3',
    pages: '131-139',
    note: 'Original paper of the method (no DOI; not available online, not read). The formulation is taken from the open-access restatement listed with this method.',
  },
  {
    id: 'podvezko2011',
    authors: ['Podvezko, V.'],
    year: 2011,
    title: 'The comparative analysis of MCDA methods SAW and COPRAS',
    source: 'Inžinerinė ekonomika – Engineering Economics',
    volume: '22',
    issue: '2',
    pages: '134-146',
    doi: '10.5755/j01.ee.22.2.310',
    note: 'Eqs. 6-11, and the worked example of Table 8 (variant II), used as the golden test.',
  },
];

const key = (path: string): string => `methods.copras.${path}`;
const step = (id: string) => ({
  id,
  nameKey: key(`steps.${id}.name`),
  explanationKey: key(`steps.${id}.explanation`),
});

/** Column ids of the S⁺ / S⁻ step. */
const S_PLUS = 's-plus';
const S_MINUS = 's-minus';

// ---------------------------------------------------------------- validation

interface PlainSums {
  readonly columnSums: readonly number[];
  readonly sMinus: readonly number[];
}

/** Untraced column sums and S⁻, for validation only. */
function plainSums(
  values: readonly (readonly number[])[],
  criteria: readonly Criterion[],
  weights: readonly number[],
): PlainSums {
  const columnSums = criteria.map((_, j) =>
    values.reduce((acc, row) => acc + (row[j] as number), 0),
  );
  const sMinus = values.map((row) =>
    criteria.reduce(
      (acc, criterion, j) =>
        criterion.direction === 'cost' && columnSums[j] !== 0
          ? acc + ((weights[j] as number) * (row[j] as number)) / (columnSums[j] as number)
          : acc,
      0,
    ),
  );
  return { columnSums, sMinus };
}

/**
 * The checks of the COPRAS calculation itself, on a crisp matrix and crisp weights that
 * already passed the structural checks. Shared with Fuzzy COPRAS, which runs it on the
 * defuzzified values.
 */
export /**
 * The checks of the COPRAS calculation itself, on a crisp matrix and crisp weights that
 * already passed the structural checks. Shared with Fuzzy COPRAS, which runs it on the
 * defuzzified values.
 */
function validateCoprasCalculation(
  matrix: DecisionMatrix<number>,
  weights: readonly number[],
  v: ValidationCollector,
): void {
  const sums = plainSums(matrix.values, matrix.criteria, weights);
  sums.columnSums.forEach((sum, j) => {
    if (sum === 0) {
      const criterion = matrix.criteria[j]!;
      v.error(COPRAS_ISSUE_CODES.zeroColumnSum, {
        params: { id: criterion.id },
        location: { input: 'matrix', column: { index: j, id: criterion.id } },
      });
    }
  });
  if (v.hasErrors) return;

  // Without cost criteria Q_i = S⁺_i, which is positive for some alternative: a criterion
  // with a positive weight has a positive column sum, hence a positive value.
  if (matrix.criteria.some((criterion) => criterion.direction === 'cost')) {
    sums.sMinus.forEach((sum, i) => {
      if (sum === 0) {
        const alternative = matrix.alternatives[i]!;
        v.error(COPRAS_ISSUE_CODES.zeroCostSum, {
          location: { input: 'matrix', row: { index: i, id: alternative.id } },
        });
      }
    });
  }
}

function validateCopras(input: CoprasInput, v: ValidationCollector): void {
  v.add(checkCrispMatrix(input?.matrix, { sign: 'non-negative', supportedNumberTypes: ['crisp'] }));
  if (v.hasErrors) return;
  const { matrix } = input;
  const criterionIds = matrix.criteria.map((criterion) => criterion.id);
  // Scaling every weight by the same factor scales every Q_i and leaves N_i and the ranking
  // unchanged, so weights that do not sum to 1 are not a problem.
  v.add(checkCrispWeights(input.weights, criterionIds, { notNormalized: 'ignore' }));
  if (v.hasErrors) return;
  validateCoprasCalculation(matrix, alignWeights(input.weights, criterionIds) as number[], v);
}

// ---------------------------------------------------------------- steps

const D_TERMS = [
  ['d', 'd_{ij}'],
  ['w', 'w_j'],
  ['x', 'x_{ij}'],
  ['x_sum', String.raw`\sum_{i=1}^{m} x_{ij}`],
] as const;

/**
 * Records the steps of COPRAS from the (crisp) decision matrix and weights on: column sums,
 * weighted normalized matrix, S⁺ and S⁻, relative significance, utility degree, ranking.
 * `x` and `w` are the handles of the steps that hold the matrix and the weights.
 */
export function addCoprasSteps(
  tb: TraceBuilder,
  x: StepHandle<number>,
  w: StepHandle<number>,
  criteria: readonly Criterion[],
  alternatives: readonly Alternative[],
): CoprasResult {
  const rows = alternativeAxis(alternatives);

  const columnSums = tb.rowVector<number>({
    ...step('column-sums'),
    formulas: [
      formula('column-sum', String.raw`{{x_sum}} = \sum_{i=1}^{m} {{x}}`, [
        ['x_sum', String.raw`\sum_{i=1}^{m} x_{ij}`],
        ['x', 'x_{ij}'],
      ]),
    ],
    items: x.columns,
    row: { id: 'x-sum', label: { key: key('rows.columnSum') }, kind: 'quantity' },
    cell: (column) => crisp.sum(term(x.column(column.index), 'x')),
  });

  const d = tb.table<number>({
    ...step('weighted-normalized-matrix'),
    formulas: [
      formula(
        'weighted-normalized',
        String.raw`{{d}} = \frac{ {{w}} \cdot {{x}} }{ {{x_sum}} }`,
        D_TERMS,
      ),
    ],
    rows,
    columns: criterionAxis(criteria),
    visualization: { view: 'matrix', basedOn: x.id },
    cell: (row, column) =>
      crisp.divide(
        crisp.multiply(term(w.at(column.index), 'w'), term(x.cell(row.index, column.index), 'x')),
        term(columnSums.at(column.index), 'x_sum'),
      ),
  });

  // S⁺ sums the benefit columns, S⁻ the cost columns. A group without criteria sums to 0.
  const benefit = criteria.flatMap((criterion, j) =>
    criterion.direction === 'benefit' ? [j] : [],
  );
  const cost = criteria.flatMap((criterion, j) => (criterion.direction === 'cost' ? [j] : []));
  const sumOver = (columns: readonly number[], row: number) =>
    columns.length === 0 ? constant(0) : crisp.sum(columns.map((j) => term(d.cell(row, j), 'd')));
  const s = tb.table<number>({
    ...step('sums'),
    formulas: [
      formula('s-plus', String.raw`{{S_plus}} = \sum_{j \in \text{benefit}} {{d}}`, [
        ['S_plus', 'S_i^+'],
        ['d', 'd_{ij}'],
      ]),
      formula('s-minus', String.raw`{{S_minus}} = \sum_{j \in \text{cost}} {{d}}`, [
        ['S_minus', 'S_i^-'],
        ['d', 'd_{ij}'],
      ]),
    ],
    rows,
    columns: [quantity(S_PLUS, key('columns.sPlus')), quantity(S_MINUS, key('columns.sMinus'))],
    visualization: { view: 'matrix', basedOn: d.id },
    cell: (row, column) =>
      column.index === 0
        ? { tracked: sumOver(benefit, row.index), formula: 's-plus' }
        : { tracked: sumOver(cost, row.index), formula: 's-minus' },
  });

  // Q_i = S⁺_i + Σ S⁻ / (S⁻_i · Σ 1/S⁻). Without cost criteria S⁻ is 0 everywhere and Q_i = S⁺_i.
  const hasCost = cost.length > 0;
  const totalMinus = hasCost ? term(crisp.sum(s.column(S_MINUS)), 'S_minus_total') : undefined;
  const totalReciprocals = hasCost
    ? term(crisp.sumOfReciprocals(s.column(S_MINUS)), 'S_minus_reciprocals')
    : undefined;
  const q = tb.columnVector<number>({
    ...step('relative-significance'),
    role: 'result',
    formulas: [
      hasCost
        ? formula(
            'relative-significance',
            String.raw`{{Q}} = {{S_plus}} + \frac{ {{S_minus_total}} }{ {{S_minus}} \cdot {{S_minus_reciprocals}} }`,
            [
              ['Q', 'Q_i'],
              ['S_plus', 'S_i^+'],
              ['S_minus', 'S_i^-'],
              ['S_minus_total', String.raw`\sum_{k=1}^{m} S_k^-`],
              ['S_minus_reciprocals', String.raw`\sum_{k=1}^{m} \frac{1}{S_k^-}`],
            ],
          )
        : formula('relative-significance-no-cost', String.raw`{{Q}} = {{S_plus}}`, [
            ['Q', 'Q_i'],
            ['S_plus', 'S_i^+'],
          ]),
    ],
    items: rows,
    column: quantity('q', key('columns.Q')),
    cell: (item) => {
      const plus = term(s.cell(item.index, S_PLUS), 'S_plus');
      if (totalMinus === undefined || totalReciprocals === undefined) return plus;
      const minus = term(s.cell(item.index, S_MINUS), 'S_minus');
      return crisp.add(plus, crisp.divide(totalMinus, crisp.multiply(minus, totalReciprocals)));
    },
  });

  const qMax = term(crisp.max(q.all()), 'Q_max');
  const n = tb.columnVector<number>({
    ...step('utility-degree'),
    role: 'result',
    formulas: [
      formula('utility-degree', String.raw`{{N}} = 100 \cdot \frac{ {{Q}} }{ {{Q_max}} }`, [
        ['N', 'N_i'],
        ['Q', 'Q_i'],
        ['Q_max', String.raw`Q_{\max}`],
      ]),
    ],
    items: rows,
    column: quantity('n', key('columns.N')),
    visualization: { view: 'bars', basedOn: q.id },
    cell: (item) => crisp.divide(crisp.multiply(100, term(q.at(item.index), 'Q')), qMax),
  });

  const ranks = crisp.rank(n.all());
  const ranking = tb.columnVector<number>({
    ...step('ranking'),
    role: 'result',
    items: rows,
    column: quantity('rank', key('columns.rank')),
    visualization: { view: 'ranking', basedOn: n.id },
    cell: (item) => ranks[item.index]!,
  });

  const relativeSignificance = q.values().map((cells) => cells[0] as number);
  const utilityDegree = n.values().map((cells) => cells[0] as number);
  const rankValues = ranking.values().map((cells) => cells[0] as number);
  return {
    relativeSignificance,
    utilityDegree,
    scores: utilityDegree,
    ranking: alternatives.map((alternative, i) => ({
      alternativeId: alternative.id,
      score: utilityDegree[i]!,
      rank: rankValues[i]!,
    })),
  };
}

export const coprasMethod = defineMethod({
  id: COPRAS_ID,
  version: COPRAS_VERSION,
  category: 'ranking',
  nameKey: key('name'),
  supportedNumberTypes: ['crisp'],
  inputSchema: [
    { name: 'matrix', kind: 'decision-matrix', required: true, numberTypes: ['crisp'] },
    { name: 'weights', kind: 'weights', required: true, numberTypes: ['crisp'] },
  ],
  outputSchema: [
    { name: 'scores', kind: 'scores', numberTypes: ['crisp'] },
    { name: 'ranking', kind: 'ranking', numberTypes: ['crisp'] },
  ],
  parameters: NO_PARAMETERS,
  references: COPRAS_REFERENCES,

  validate(input: CoprasInput) {
    const v = createValidation();
    validateCopras(input, v);
    return v.result();
  },

  run(input: CoprasInput) {
    const { matrix } = input;
    const tb = createTraceBuilder({ methodId: COPRAS_ID, methodVersion: COPRAS_VERSION });
    const x = tb.inputMatrix({ ...step('initial-matrix'), matrix });
    const w = tb.inputWeights({
      ...step('weights'),
      weights: input.weights,
      criteria: matrix.criteria,
    });
    const result = addCoprasSteps(tb, x, w, matrix.criteria, matrix.alternatives);
    return { result, trace: tb.build() };
  },
});

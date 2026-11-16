/**
 * MARCOS: Measurement of Alternatives and Ranking according to COmpromise Solution.
 *
 * Formulation: docs/methods/marcos.md, as restated by the method's authors in
 * Stanković et al. (2020), Eqs. 7-18, and Damjanović et al. (2022), Eqs. 5-16.
 *
 * Steps (docs/plan.md §8.3): initial matrix → weights → [normalized weights] → extended
 * matrix with the anti-ideal (AAI) and ideal (AI) rows → normalized matrix → weighted
 * matrix → sums S_i → utility degrees K_i⁻, K_i⁺ → utility functions f(K_i⁻), f(K_i⁺) →
 * final utility f(K_i) → ranking.
 */
import type {
  DecisionMatrix,
  RankingResult,
  Reference,
  StepHandle,
  TraceAxisItem,
  Tracked,
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
  defineMethod,
  defineParameters,
  term,
} from '@mateo/engine';
import { FOR_BENEFIT, FOR_COST, formula, quantity, referenceRow } from '../src/common';

export const MARCOS_ID = 'marcos';
export const MARCOS_VERSION = '1.0.0';

/** Row ids of the reference solutions in the trace. Alternatives may not use them. */
export const MARCOS_ANTI_IDEAL = 'AAI';
export const MARCOS_IDEAL = 'AI';

export const MARCOS_ISSUE_CODES = {
  /** An alternative id equals the id of the anti-ideal or ideal row. */
  reservedAlternativeId: 'marcos.reserved-alternative-id',
  /** A cost criterion has a zero value: x_ai / x_ij divides by it. */
  zeroCostValue: 'marcos.zero-cost-value',
  /** Every value of a benefit criterion is zero: x_ij / x_ai divides by the ideal, 0. */
  zeroIdealValue: 'marcos.zero-ideal-value',
  /** S of the anti-ideal is 0, so K_i⁻ = S_i / S_aai is undefined. */
  zeroAntiIdealSum: 'marcos.zero-anti-ideal-sum',
  /** S_i of an alternative is 0, so its utility functions are 0 / 0. */
  zeroSum: 'marcos.zero-sum',
} as const;

export interface MarcosInput {
  readonly matrix: DecisionMatrix<number>;
  readonly weights: WeightVector;
}

export interface MarcosResult extends RankingResult {
  /** Final utility f(K_i) of every alternative, in input order. */
  readonly scores: readonly number[];
}

const parameters = defineParameters({
  normalizeWeights: {
    type: 'boolean',
    labelKey: 'methods.marcos.parameters.normalizeWeights.label',
    descriptionKey: 'methods.marcos.parameters.normalizeWeights.description',
    default: false,
  },
});

export const MARCOS_REFERENCES: readonly Reference[] = [
  {
    id: 'stevic2020',
    authors: ['Stević, Ž.', 'Pamučar, D.', 'Puška, A.', 'Chatterjee, P.'],
    year: 2020,
    title:
      'Sustainable supplier selection in healthcare industries using a new MCDM method: Measurement of alternatives and ranking according to COmpromise solution (MARCOS)',
    source: 'Computers & Industrial Engineering',
    volume: '140',
    pages: '106231',
    doi: '10.1016/j.cie.2019.106231',
    note: 'Original paper of the method (paywalled, not read). The formulation is taken from the open-access restatements by the same authors listed with this method.',
  },
  {
    id: 'stankovic2020',
    authors: ['Stanković, M.', 'Stević, Ž.', 'Das, D. K.', 'Subotić, M.', 'Pamučar, D.'],
    year: 2020,
    title: 'A new fuzzy MARCOS method for road traffic risk analysis',
    source: 'Mathematics',
    volume: '8',
    issue: '3',
    pages: '457',
    doi: '10.3390/math8030457',
    note: 'Section 2, Eqs. 7-18: restatement of crisp MARCOS.',
  },
  {
    id: 'damjanovic2022',
    authors: ['Damjanović, M.', 'Stević, Ž.', 'Stanimirović, D.', 'Tanackov, I.', 'Marinković, D.'],
    year: 2022,
    title: 'Impact of the number of vehicles on traffic safety: multiphase modeling',
    source: 'Facta Universitatis, Series: Mechanical Engineering',
    volume: '20',
    issue: '1',
    pages: '177-197',
    doi: '10.22190/FUME220215012D',
    note: 'Section 3.4, Eqs. 5-16, and the worked example of Section 4 (scenario S1), used as the golden test.',
  },
];

const key = (path: string): string => `methods.marcos.${path}`;
const step = (id: string) => ({
  id,
  nameKey: key(`steps.${id}.name`),
  explanationKey: key(`steps.${id}.explanation`),
});

/** Untraced S_i of the anti-ideal and of every alternative, for validation only. */
function plainSums(matrix: DecisionMatrix<number>, weights: readonly number[]) {
  const columns = matrix.criteria.map((criterion, j) => {
    const values = matrix.values.map((row) => row[j] as number);
    const best = criterion.direction === 'benefit' ? Math.max(...values) : Math.min(...values);
    const worst = criterion.direction === 'benefit' ? Math.min(...values) : Math.max(...values);
    const normalize = (x: number) => (criterion.direction === 'benefit' ? x / best : best / x);
    return { worst, normalize };
  });
  const sumOf = (row: readonly number[]) =>
    row.reduce((acc, x, j) => acc + columns[j]!.normalize(x) * (weights[j] as number), 0);
  return {
    antiIdeal: sumOf(columns.map((column) => column.worst)),
    alternatives: matrix.values.map(sumOf),
  };
}

function validateMarcos(input: MarcosInput, normalizeWeights: boolean, v: ValidationCollector) {
  v.add(checkCrispMatrix(input?.matrix, { sign: 'non-negative', supportedNumberTypes: ['crisp'] }));
  if (v.hasErrors) return;
  const { matrix } = input;

  matrix.alternatives.forEach((alternative, index) => {
    if (alternative.id === MARCOS_ANTI_IDEAL || alternative.id === MARCOS_IDEAL) {
      v.error(MARCOS_ISSUE_CODES.reservedAlternativeId, {
        params: { id: alternative.id },
        location: { input: 'matrix', row: { index, id: alternative.id } },
      });
    }
  });
  matrix.criteria.forEach((criterion, j) => {
    const column = { index: j, id: criterion.id };
    if (criterion.direction === 'cost') {
      matrix.values.forEach((row, i) => {
        if (row[j] === 0) {
          const alternative = matrix.alternatives[i]!;
          v.error(MARCOS_ISSUE_CODES.zeroCostValue, {
            params: { id: criterion.id },
            location: { input: 'matrix', row: { index: i, id: alternative.id }, column },
          });
        }
      });
    } else if (matrix.values.every((row) => row[j] === 0)) {
      v.error(MARCOS_ISSUE_CODES.zeroIdealValue, {
        params: { id: criterion.id },
        location: { input: 'matrix', column },
      });
    }
  });

  const criterionIds = matrix.criteria.map((criterion) => criterion.id);
  v.add(
    checkCrispWeights(input.weights, criterionIds, {
      // With the option on, the method normalizes the weights itself.
      notNormalized: normalizeWeights ? 'ignore' : 'warning',
    }),
  );
  if (v.hasErrors) return;

  const weights = alignWeights(input.weights, criterionIds) as number[];
  const sums = plainSums(matrix, weights);
  if (sums.antiIdeal === 0) {
    v.error(MARCOS_ISSUE_CODES.zeroAntiIdealSum, { location: { input: 'matrix' } });
  }
  sums.alternatives.forEach((sum, i) => {
    if (sum === 0) {
      const alternative = matrix.alternatives[i]!;
      v.error(MARCOS_ISSUE_CODES.zeroSum, {
        location: { input: 'matrix', row: { index: i, id: alternative.id } },
      });
    }
  });
}

export const marcosMethod = defineMethod({
  id: MARCOS_ID,
  version: MARCOS_VERSION,
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
  parameters,
  references: MARCOS_REFERENCES,

  validate(input: MarcosInput, params) {
    const v = createValidation();
    validateMarcos(input, params.normalizeWeights, v);
    return v.result();
  },

  run(input: MarcosInput, params) {
    const { matrix } = input;
    const tb = createTraceBuilder({ methodId: MARCOS_ID, methodVersion: MARCOS_VERSION });

    const x = tb.inputMatrix({ ...step('initial-matrix'), matrix });
    const inputWeights = tb.inputWeights({
      ...step('weights'),
      weights: input.weights,
      criteria: matrix.criteria,
    });

    let w: StepHandle<number> = inputWeights;
    if (params.normalizeWeights) {
      const total = term(crisp.sum(inputWeights.row(0)), 'w_sum');
      w = tb.rowVector({
        ...step('normalized-weights'),
        formulas: [
          formula('normalized-weight', String.raw`{{w_n}} = \frac{ {{w}} }{ {{w_sum}} }`, [
            ['w_n', String.raw`w_j`],
            ['w', String.raw`w_j`],
            ['w_sum', String.raw`\sum_{j=1}^{n} w_j`],
          ]),
        ],
        items: inputWeights.columns,
        row: inputWeights.rows[0],
        cell: (column) => crisp.divide(term(inputWeights.at(column.index), 'w'), total),
      });
    }

    // Extended matrix: AAI first, the alternatives, AI last (Eqs. 6-7 of Damjanović et al.).
    const antiIdeal = matrix.criteria.map((criterion, j) => {
      const column = term(x.column(j), 'x');
      return criterion.direction === 'benefit' ? crisp.min(column) : crisp.max(column);
    });
    const ideal = matrix.criteria.map((criterion, j) => {
      const column = term(x.column(j), 'x');
      return criterion.direction === 'benefit' ? crisp.max(column) : crisp.min(column);
    });
    const alternatives = alternativeAxis(matrix.alternatives);
    const extendedRows: TraceAxisItem[] = [
      referenceRow(MARCOS_ANTI_IDEAL, key('rows.antiIdeal')),
      ...alternatives,
      referenceRow(MARCOS_IDEAL, key('rows.ideal')),
    ];
    const last = extendedRows.length - 1;
    const ext = tb.table<number>({
      ...step('extended-matrix'),
      formulas: [
        formula('anti-ideal-benefit', String.raw`{{x_aai}} = \min_i {{x}}`, EXT_TERMS, FOR_BENEFIT),
        formula('anti-ideal-cost', String.raw`{{x_aai}} = \max_i {{x}}`, EXT_TERMS, FOR_COST),
        formula('ideal-benefit', String.raw`{{x_ai}} = \max_i {{x}}`, EXT_TERMS, FOR_BENEFIT),
        formula('ideal-cost', String.raw`{{x_ai}} = \min_i {{x}}`, EXT_TERMS, FOR_COST),
      ],
      rows: extendedRows,
      columns: x.columns,
      visualization: {
        view: 'matrix',
        basedOn: x.id,
        highlightRows: [MARCOS_ANTI_IDEAL, MARCOS_IDEAL],
      },
      cell: (row, column) => {
        const direction = matrix.criteria[column.index]!.direction;
        if (row.index === 0) {
          return { tracked: antiIdeal[column.index]!, formula: `anti-ideal-${direction}` };
        }
        if (row.index === last) {
          return { tracked: ideal[column.index]!, formula: `ideal-${direction}` };
        }
        return x.cell(row.index - 1, column.index);
      },
    });

    // Eqs. 8-9: n_ij = x_ij / x_ai (benefit), n_ij = x_ai / x_ij (cost).
    const n = tb.table<number>({
      ...step('normalized-matrix'),
      formulas: [
        formula('benefit', String.raw`{{n}} = \frac{ {{x}} }{ {{x_ai}} }`, NORM_TERMS, FOR_BENEFIT),
        formula('cost', String.raw`{{n}} = \frac{ {{x_ai}} }{ {{x}} }`, NORM_TERMS, FOR_COST),
      ],
      rows: ext.rows,
      columns: ext.columns,
      visualization: { view: 'matrix', basedOn: ext.id },
      cell: (row, column) => {
        const direction = matrix.criteria[column.index]!.direction;
        const value = term(ext.cell(row.index, column.index), 'x');
        const best = term(ext.cell(MARCOS_IDEAL, column.index), 'x_ai');
        return {
          tracked: direction === 'benefit' ? crisp.divide(value, best) : crisp.divide(best, value),
          formula: direction,
        };
      },
    });

    // Eq. 10: v_ij = n_ij · w_j.
    const v = tb.table<number>({
      ...step('weighted-matrix'),
      formulas: [
        formula('weighted', String.raw`{{v}} = {{n}} \cdot {{w}}`, [
          ['v', 'v_{ij}'],
          ['n', 'n_{ij}'],
          ['w', 'w_j'],
        ]),
      ],
      rows: n.rows,
      columns: n.columns,
      visualization: { view: 'matrix', basedOn: n.id },
      cell: (row, column) =>
        crisp.multiply(term(n.cell(row.index, column.index), 'n'), term(w.at(column.index), 'w')),
    });

    // Eq. 13: S_i = Σ_j v_ij, for every row including AAI and AI.
    const s = tb.columnVector<number>({
      ...step('sums'),
      formulas: [
        formula('sum', String.raw`{{S}} = \sum_{j=1}^{n} {{v}}`, [
          ['S', 'S_i'],
          ['v', 'v_{ij}'],
        ]),
      ],
      items: v.rows,
      column: quantity('S', key('columns.S')),
      cell: (item) => crisp.sum(term(v.row(item.index), 'v')),
    });

    // Eqs. 11-12: K_i⁻ = S_i / S_aai, K_i⁺ = S_i / S_ai.
    const k = tb.table<number>({
      ...step('utility-degrees'),
      formulas: [
        formula('k-minus', String.raw`{{K_minus}} = \frac{ {{S}} }{ {{S_aai}} }`, [
          ['K_minus', 'K_i^-'],
          ['S', 'S_i'],
          ['S_aai', 'S_{aai}'],
        ]),
        formula('k-plus', String.raw`{{K_plus}} = \frac{ {{S}} }{ {{S_ai}} }`, [
          ['K_plus', 'K_i^+'],
          ['S', 'S_i'],
          ['S_ai', 'S_{ai}'],
        ]),
      ],
      rows: alternatives,
      columns: [
        quantity('k-minus', key('columns.kMinus')),
        quantity('k-plus', key('columns.kPlus')),
      ],
      visualization: { view: 'matrix', basedOn: s.id },
      cell: (row, column) => {
        const own = term(s.at(row.index + 1), 'S');
        return column.index === 0
          ? {
              tracked: crisp.divide(own, term(s.at(MARCOS_ANTI_IDEAL), 'S_aai')),
              formula: 'k-minus',
            }
          : { tracked: crisp.divide(own, term(s.at(MARCOS_IDEAL), 'S_ai')), formula: 'k-plus' };
      },
    });

    // Eqs. 15-16: f(K_i⁻) = K_i⁺ / (K_i⁺ + K_i⁻), f(K_i⁺) = K_i⁻ / (K_i⁺ + K_i⁻).
    const f = tb.table<number>({
      ...step('utility-functions'),
      formulas: [
        formula(
          'f-k-minus',
          String.raw`{{f_minus}} = \frac{ {{K_plus}} }{ {{K_plus}} + {{K_minus}} }`,
          UTILITY_TERMS,
        ),
        formula(
          'f-k-plus',
          String.raw`{{f_plus}} = \frac{ {{K_minus}} }{ {{K_plus}} + {{K_minus}} }`,
          UTILITY_TERMS,
        ),
      ],
      rows: alternatives,
      columns: [
        quantity('f-k-minus', key('columns.fKMinus')),
        quantity('f-k-plus', key('columns.fKPlus')),
      ],
      visualization: { view: 'matrix', basedOn: k.id },
      cell: (row, column) => {
        const kMinus = term(k.cell(row.index, 'k-minus'), 'K_minus');
        const kPlus = term(k.cell(row.index, 'k-plus'), 'K_plus');
        const denominator = crisp.add(kPlus, kMinus);
        return column.index === 0
          ? { tracked: crisp.divide(kPlus, denominator), formula: 'f-k-minus' }
          : { tracked: crisp.divide(kMinus, denominator), formula: 'f-k-plus' };
      },
    });

    // Eq. 14: f(K_i) = (K_i⁺ + K_i⁻) / (1 + (1 − f(K_i⁺)) / f(K_i⁺) + (1 − f(K_i⁻)) / f(K_i⁻)).
    const utility = tb.columnVector<number>({
      ...step('final-utility'),
      role: 'result',
      formulas: [FINAL_UTILITY_FORMULA],
      items: alternatives,
      column: quantity('f-k', key('columns.fK')),
      cell: (item) =>
        finalUtility(
          term(k.cell(item.index, 'k-minus'), 'K_minus'),
          term(k.cell(item.index, 'k-plus'), 'K_plus'),
          term(f.cell(item.index, 'f-k-minus'), 'f_minus'),
          term(f.cell(item.index, 'f-k-plus'), 'f_plus'),
        ),
    });

    const ranks = crisp.rank(utility.all());
    const ranking = tb.columnVector<number>({
      ...step('ranking'),
      role: 'result',
      items: alternatives,
      column: quantity('rank', key('columns.rank')),
      visualization: { view: 'ranking', basedOn: utility.id },
      cell: (item) => ranks[item.index]!,
    });

    const scores = utility.values().map((cells) => cells[0] as number);
    const rankValues = ranking.values().map((cells) => cells[0] as number);
    const result: MarcosResult = {
      scores,
      ranking: matrix.alternatives.map((alternative, i) => ({
        alternativeId: alternative.id,
        score: scores[i]!,
        rank: rankValues[i]!,
      })),
    };
    return { result, trace: tb.build() };
  },
});

const EXT_TERMS = [
  ['x', 'x_{ij}'],
  ['x_aai', 'x_{aai,j}'],
  ['x_ai', 'x_{ai,j}'],
] as const;

const NORM_TERMS = [
  ['n', 'n_{ij}'],
  ['x', 'x_{ij}'],
  ['x_ai', 'x_{ai}'],
] as const;

const UTILITY_TERMS = [
  ['f_minus', 'f(K_i^-)'],
  ['f_plus', 'f(K_i^+)'],
  ['K_minus', 'K_i^-'],
  ['K_plus', 'K_i^+'],
] as const;

/** Final utility function, shared by MARCOS and Fuzzy MARCOS (Eq. 14 / Eq. 32). */
export const FINAL_UTILITY_FORMULA = formula(
  'final-utility',
  String.raw`{{f}} = \frac{ {{K_plus}} + {{K_minus}} }{ 1 + \frac{1 - {{f_plus}} }{ {{f_plus}} } + \frac{1 - {{f_minus}} }{ {{f_minus}} } }`,
  [['f', 'f(K_i)'], ...UTILITY_TERMS],
);

/** f(K_i) from tracked K_i⁻, K_i⁺, f(K_i⁻), f(K_i⁺). */
export function finalUtility(
  kMinus: Tracked<number>,
  kPlus: Tracked<number>,
  fMinus: Tracked<number>,
  fPlus: Tracked<number>,
): Tracked<number> {
  const denominator = crisp.sum([
    1,
    crisp.divide(crisp.subtract(1, fPlus), fPlus),
    crisp.divide(crisp.subtract(1, fMinus), fMinus),
  ]);
  return crisp.divide(crisp.add(kPlus, kMinus), denominator);
}

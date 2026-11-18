/**
 * CODAS: COmbinative Distance-based ASsessment.
 *
 * Formulation: docs/methods/codas.md, Keshavarz Ghorabaee, Zavadskas, Turskis, Antucheviciene
 * (2016), Section 2, Eqs. 1-11.
 *
 * Steps: initial matrix → weights → [normalized weights] → linear max normalization n_ij →
 * weighted matrix r_ij → negative-ideal solution ns_j → deviations |r_ij − ns_j| →
 * Euclidean distances E_i and taxicab distances T_i → threshold τ → relative assessment
 * matrix h_ik → assessment score H_i = Σ_k h_ik → ranking (largest H first).
 *
 * The threshold τ is an absolute number compared with differences of E_i, so it depends on
 * the scale of the weights; the weights are normalized to sum to 1 by default so that the
 * paper's τ = 0.02 means what it meant there.
 */
import type {
  DecisionMatrix,
  RankingResult,
  Reference,
  StepHandle,
  ValidationCollector,
  WeightVector,
} from '@mateo/engine';
import {
  alternativeAxis,
  checkCrispMatrix,
  checkCrispWeights,
  createTraceBuilder,
  createValidation,
  crisp,
  criterionAxis,
  defineMethod,
  defineParameters,
  parameter,
  term,
  textKey,
} from '@mateo/engine';
import {
  FOR_BENEFIT,
  FOR_COST,
  checkLinearMaxNormalizable,
  formula,
  quantity,
  referenceRow,
} from '../src/common';

export const CODAS_ID = 'codas';
export const CODAS_VERSION = '1.0.0';

/** Row id of the negative-ideal solution in the trace. Alternatives may be named anything. */
export const CODAS_NEGATIVE_IDEAL = 'ns';

export const CODAS_ISSUE_CODES = {
  /** A cost criterion has a zero value: min_i x_ij / x_ij divides by it. */
  zeroCostValue: 'codas.zero-cost-value',
  /** Every value of a benefit criterion is zero: x_ij / max_i x_ij divides by 0. */
  zeroIdealValue: 'codas.zero-ideal-value',
} as const;

export interface CodasInput {
  readonly matrix: DecisionMatrix<number>;
  readonly weights: WeightVector;
}

export interface CodasResult extends RankingResult {
  /** Assessment score H_i of every alternative, in input order. Higher is better. */
  readonly scores: readonly number[];
}

const parameters = defineParameters({
  tau: {
    type: 'number',
    labelKey: 'methods.codas.parameters.tau.label',
    descriptionKey: 'methods.codas.parameters.tau.description',
    default: 0.02,
    min: 0,
    max: 1,
    step: 0.01,
  },
  normalizeWeights: {
    type: 'boolean',
    labelKey: 'methods.codas.parameters.normalizeWeights.label',
    descriptionKey: 'methods.codas.parameters.normalizeWeights.description',
    default: true,
  },
});

export const CODAS_REFERENCES: readonly Reference[] = [
  {
    id: 'keshavarz2016',
    authors: ['Keshavarz Ghorabaee, M.', 'Zavadskas, E. K.', 'Turskis, Z.', 'Antucheviciene, J.'],
    year: 2016,
    title:
      'A new combinative distance-based assessment (CODAS) method for multi-criteria decision-making',
    source: 'Economic Computation and Economic Cybernetics Studies and Research',
    volume: '50',
    issue: '3',
    pages: '25-44',
    note: 'Original paper of the method: Section 2, Eqs. 1-11, and the robot selection example of Section 3.1, Tables 2 and 3, used as the golden test. The journal issued no DOI; the RePEc handle RePEc:cys:ecocyb:v:50:y:2016:i:3:p:25-44 identifies it.',
  },
];

const key = (path: string): string => `methods.codas.${path}`;
const step = (id: string) => ({
  id,
  nameKey: key(`steps.${id}.name`),
  explanationKey: key(`steps.${id}.explanation`),
});

function validateCodas(input: CodasInput, normalizeWeights: boolean, v: ValidationCollector) {
  v.add(checkCrispMatrix(input?.matrix, { sign: 'non-negative', supportedNumberTypes: ['crisp'] }));
  if (v.hasErrors) return;
  checkLinearMaxNormalizable(input.matrix, v, CODAS_ISSUE_CODES);
  v.add(
    checkCrispWeights(
      input.weights,
      input.matrix.criteria.map((criterion) => criterion.id),
      {
        // With the option on, the method normalizes the weights itself.
        notNormalized: normalizeWeights ? 'ignore' : 'warning',
      },
    ),
  );
}

export const codasMethod = defineMethod({
  id: CODAS_ID,
  version: CODAS_VERSION,
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
  references: CODAS_REFERENCES,

  validate(input: CodasInput, params) {
    const v = createValidation();
    validateCodas(input, params.normalizeWeights, v);
    return v.result();
  },

  run(input: CodasInput, params) {
    const { matrix } = input;
    const tb = createTraceBuilder({ methodId: CODAS_ID, methodVersion: CODAS_VERSION });
    const criteria = criterionAxis(matrix.criteria);
    const alternatives = alternativeAxis(matrix.alternatives);

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
            ['w_n', 'w_j'],
            ['w', 'w_j'],
            ['w_sum', String.raw`\sum_{j=1}^{n} w_j`],
          ]),
        ],
        items: inputWeights.columns,
        row: inputWeights.rows[0],
        cell: (column) => crisp.divide(term(inputWeights.at(column.index), 'w'), total),
      });
    }

    // Eq. 3: n_ij = x_ij / max_i x_ij (benefit), n_ij = min_i x_ij / x_ij (cost).
    const bounds = matrix.criteria.map((criterion, j) =>
      criterion.direction === 'benefit'
        ? term(crisp.max(x.column(j)), 'x_best')
        : term(crisp.min(x.column(j)), 'x_best'),
    );
    const n = tb.table<number>({
      ...step('normalized-matrix'),
      formulas: [
        formula(
          'benefit',
          String.raw`{{n}} = \frac{ {{x}} }{ {{x_best}} }`,
          NORM_TERMS,
          FOR_BENEFIT,
        ),
        formula('cost', String.raw`{{n}} = \frac{ {{x_best}} }{ {{x}} }`, NORM_TERMS, FOR_COST),
      ],
      rows: alternatives,
      columns: criteria,
      visualization: { view: 'matrix', basedOn: x.id },
      cell: (row, column) => {
        const direction = matrix.criteria[column.index]!.direction;
        const value = term(x.cell(row.index, column.index), 'x');
        const best = bounds[column.index]!;
        return {
          tracked: direction === 'benefit' ? crisp.divide(value, best) : crisp.divide(best, value),
          formula: direction,
        };
      },
    });

    // Eq. 4: r_ij = w_j n_ij.
    const r = tb.table<number>({
      ...step('weighted-matrix'),
      formulas: [
        formula('weighted', String.raw`{{r}} = {{w}} \cdot {{n}}`, [
          ['r', 'r_{ij}'],
          ['w', 'w_j'],
          ['n', 'n_{ij}'],
        ]),
      ],
      rows: alternatives,
      columns: criteria,
      visualization: { view: 'matrix', basedOn: n.id },
      cell: (row, column) =>
        crisp.multiply(term(w.at(column.index), 'w'), term(n.cell(row.index, column.index), 'n')),
    });

    // Eqs. 5-6: ns_j = min_i r_ij.
    const negativeIdeal = tb.rowVector<number>({
      ...step('negative-ideal'),
      formulas: [
        formula('negative-ideal', String.raw`{{ns}} = \min_i {{r}}`, [
          ['ns', 'ns_j'],
          ['r', 'r_{ij}'],
        ]),
      ],
      items: criteria,
      row: referenceRow(CODAS_NEGATIVE_IDEAL, key('rows.negativeIdeal')),
      cell: (column) => crisp.min(term(r.column(column.index), 'r')),
    });

    // |r_ij − ns_j|, the terms of both distances (never negative: ns_j is the column minimum).
    const deviations = tb.table<number>({
      ...step('deviations'),
      formulas: [
        formula('deviation', String.raw`{{d}} = \left| {{r}} - {{ns}} \right|`, [
          ['d', String.raw`d_{ij}`],
          ['r', 'r_{ij}'],
          ['ns', 'ns_j'],
        ]),
      ],
      rows: alternatives,
      columns: criteria,
      visualization: { view: 'matrix', basedOn: r.id },
      cell: (row, column) =>
        crisp.abs(
          crisp.subtract(
            term(r.cell(row.index, column.index), 'r'),
            term(negativeIdeal.at(column.index), 'ns'),
          ),
        ),
    });

    // Eq. 7: E_i = √(Σ_j d_ij²). Eq. 8: T_i = Σ_j d_ij.
    const distances = tb.table<number>({
      ...step('distances'),
      formulas: [
        formula('euclidean', String.raw`{{E}} = \sqrt{ \sum_{j=1}^{n} {{d}}^2 }`, [
          ['E', 'E_i'],
          ['d', 'd_{ij}'],
        ]),
        formula('taxicab', String.raw`{{T}} = \sum_{j=1}^{n} {{d}}`, [
          ['T', 'T_i'],
          ['d', 'd_{ij}'],
        ]),
      ],
      rows: alternatives,
      columns: [quantity('euclidean', key('columns.E')), quantity('taxicab', key('columns.T'))],
      visualization: { view: 'matrix', basedOn: deviations.id },
      cell: (row, column) => {
        const own = term(deviations.row(row.index), 'd');
        return column.id === 'euclidean'
          ? { tracked: crisp.sqrt(crisp.sumOfSquares(own)), formula: 'euclidean' }
          : { tracked: crisp.sum(own), formula: 'taxicab' };
      },
    });

    // Eq. 10: ψ(x) = 1 when |x| ≥ τ, 0 otherwise.
    const tau = tb.scalar<number>({
      ...step('threshold'),
      value: parameter('tau', params.tau),
    });
    const threshold = tau.at().value;

    // Eq. 9: h_ik = (E_i − E_k) + ψ(E_i − E_k) (T_i − T_k).
    const h = tb.table<number>({
      ...step('relative-assessment'),
      formulas: [
        formula(
          'above-threshold',
          String.raw`{{h}} = ({{E_i}} - {{E_k}}) + ({{T_i}} - {{T_k}})`,
          H_TERMS,
          textKey(key('conditions.aboveThreshold')),
        ),
        formula(
          'below-threshold',
          String.raw`{{h}} = {{E_i}} - {{E_k}}`,
          H_TERMS,
          textKey(key('conditions.belowThreshold')),
        ),
      ],
      rows: alternatives,
      columns: alternatives,
      visualization: { view: 'matrix', basedOn: distances.id },
      cell: (row, column) => {
        const eDifference = crisp.subtract(
          term(distances.cell(row.index, 'euclidean'), 'E_i'),
          term(distances.cell(column.index, 'euclidean'), 'E_k'),
        );
        if (Math.abs(eDifference.value) < threshold) {
          return { tracked: eDifference, formula: 'below-threshold' };
        }
        const tDifference = crisp.subtract(
          term(distances.cell(row.index, 'taxicab'), 'T_i'),
          term(distances.cell(column.index, 'taxicab'), 'T_k'),
        );
        return { tracked: crisp.add(eDifference, tDifference), formula: 'above-threshold' };
      },
    });

    // Eq. 11: H_i = Σ_k h_ik.
    const assessment = tb.columnVector<number>({
      ...step('assessment-scores'),
      role: 'result',
      formulas: [
        formula('assessment', String.raw`{{H}} = \sum_{k=1}^{m} {{h}}`, [
          ['H', 'H_i'],
          ['h', 'h_{ik}'],
        ]),
      ],
      items: alternatives,
      column: quantity('h', key('columns.H')),
      cell: (item) => crisp.sum(term(h.row(item.index), 'h')),
    });

    const ranks = crisp.rank(assessment.all());
    const ranking = tb.columnVector<number>({
      ...step('ranking'),
      role: 'result',
      items: alternatives,
      column: quantity('rank', key('columns.rank')),
      visualization: { view: 'ranking', basedOn: assessment.id },
      cell: (item) => ranks[item.index]!,
    });

    const scores = assessment.values().map((cells) => cells[0] as number);
    const rankValues = ranking.values().map((cells) => cells[0] as number);
    const result: CodasResult = {
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

const NORM_TERMS = [
  ['n', 'n_{ij}'],
  ['x', 'x_{ij}'],
  ['x_best', String.raw`x^{*}_j`],
] as const;

const H_TERMS = [
  ['h', 'h_{ik}'],
  ['E_i', 'E_i'],
  ['E_k', 'E_k'],
  ['T_i', 'T_i'],
  ['T_k', 'T_k'],
] as const;

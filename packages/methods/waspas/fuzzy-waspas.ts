/**
 * Fuzzy WASPAS (WASPAS-F) with triangular fuzzy numbers.
 *
 * Formulation: docs/methods/waspas.md, Turskis, Zavadskas, Antucheviciene, Kosareva (2015),
 * Section 3, Eqs. 13-24. The paper leaves nothing open except the defuzzification of the
 * fuzzy sums and products (Eqs. 19-22), a parameter whose default, the centroid, reproduces
 * every printed value, and λ, whose paper rule is the pooled one (Eq. 24).
 *
 * Steps: initial matrix → weights → [normalized weights → fuzzy weights] → normalization
 * (benefit x̃ / max u, cost min l / x̃) → WSM matrix x̃ ⊗ w̃ → WPM matrix x̃^w̃ (power rule
 * (l^w_u, m^w_m, u^w_l)) → fuzzy sums Q̃_i and products P̃_i → defuzzified Q_i and P_i → λ →
 * joint criterion K_i = λ Q_i + (1 − λ) P_i → ranking.
 *
 * Weights may be TFNs (the paper's case) or crisp numbers, which enter as the degenerate
 * TFN (w, w, w); then they can also be normalized. The optimal λ of the crisp method needs
 * variances of crisp values and is not defined here.
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
  checkCrispWeights,
  createTraceBuilder,
  createValidation,
  crisp,
  criterionAxis,
  defineMethod,
  defineParameters,
  ISSUE_CODES,
  parameter,
  term,
} from '@mateo/engine';
import type { DefuzzificationId, TFN } from '@mateo/fuzzy';
import { checkTfnMatrix, checkTfnWeights, encodeTfn, tfnOps } from '@mateo/fuzzy';
import { FOR_BENEFIT, FOR_COST, formula, quantity } from '../src/common';
import { WASPAS_REFERENCES } from './waspas';

export const FUZZY_WASPAS_ID = 'fuzzy-waspas';
export const FUZZY_WASPAS_VERSION = '1.0.0';

export const FUZZY_WASPAS_ISSUE_CODES = {
  /** The weights are neither crisp nor TFN. */
  unsupportedWeights: 'fuzzy-waspas.unsupported-weights',
  /** A cost criterion has a TFN with l = 0: min_i l_ij / x̃_ij divides by it. */
  zeroCostValue: 'fuzzy-waspas.zero-cost-value',
  /** The upper values of a benefit criterion are all 0: x̃_ij / max_i u_ij divides by 0. */
  zeroIdealValue: 'fuzzy-waspas.zero-ideal-value',
  /** `normalizeWeights` is set but the weights are TFNs, which have no unique normalization. */
  normalizeFuzzyWeights: 'fuzzy-waspas.normalize-fuzzy-weights',
} as const;

export type FuzzyWaspasWeights = WeightVector<TFN> | WeightVector<number>;

export interface FuzzyWaspasInput {
  readonly matrix: DecisionMatrix<TFN>;
  readonly weights: FuzzyWaspasWeights;
}

export interface FuzzyWaspasResult extends RankingResult {
  /** Joint criterion K_i of every alternative, in input order. Higher is better. */
  readonly scores: readonly number[];
  /** Defuzzified WSM scores Q_i, in input order. */
  readonly wsm: readonly number[];
  /** Defuzzified WPM scores P_i, in input order. */
  readonly wpm: readonly number[];
  /** The λ that was used. */
  readonly lambda: number;
}

const parameters = defineParameters({
  lambdaRule: {
    type: 'enum',
    labelKey: 'methods.fuzzyWaspas.parameters.lambdaRule.label',
    descriptionKey: 'methods.fuzzyWaspas.parameters.lambdaRule.description',
    default: 'pooled',
    options: [
      { value: 'pooled', labelKey: 'methods.waspas.parameters.lambdaRule.pooled' },
      { value: 'fixed', labelKey: 'methods.waspas.parameters.lambdaRule.fixed' },
    ],
  },
  lambda: {
    type: 'number',
    labelKey: 'methods.waspas.parameters.lambda.label',
    descriptionKey: 'methods.waspas.parameters.lambda.description',
    default: 0.5,
    min: 0,
    max: 1,
    step: 0.05,
  },
  defuzzification: {
    type: 'enum',
    labelKey: 'methods.fuzzyWaspas.parameters.defuzzification.label',
    descriptionKey: 'methods.fuzzyWaspas.parameters.defuzzification.description',
    default: 'centroid',
    options: [
      { value: 'centroid', labelKey: 'methods.fuzzyWaspas.parameters.defuzzification.centroid' },
      {
        value: 'graded-mean',
        labelKey: 'methods.fuzzyWaspas.parameters.defuzzification.gradedMean',
      },
    ],
  },
  normalizeWeights: {
    type: 'boolean',
    labelKey: 'methods.waspas.parameters.normalizeWeights.label',
    descriptionKey: 'methods.fuzzyWaspas.parameters.normalizeWeights.description',
    default: false,
  },
});

export const FUZZY_WASPAS_REFERENCES: readonly Reference[] = [
  {
    id: 'turskis2015',
    authors: ['Turskis, Z.', 'Zavadskas, E. K.', 'Antucheviciene, J.', 'Kosareva, N.'],
    year: 2015,
    title: 'A hybrid model based on fuzzy AHP and fuzzy WASPAS for construction site selection',
    source: 'International Journal of Computers Communications & Control',
    volume: '10',
    issue: '6',
    pages: '873-888',
    doi: '10.15837/ijccc.2015.6.2078',
    note: 'Section 3, Eqs. 13-24, and the construction site example of Section 4 (Tables 3-8), used as the golden test.',
  },
  ...WASPAS_REFERENCES,
];

const key = (path: string): string => `methods.fuzzyWaspas.${path}`;
const step = (id: string) => ({
  id,
  nameKey: key(`steps.${id}.name`),
  explanationKey: key(`steps.${id}.explanation`),
});

const isTfnWeights = (weights: FuzzyWaspasWeights): weights is WeightVector<TFN> =>
  weights.numberType === 'tfn';

function validateFuzzyWaspas(
  input: FuzzyWaspasInput,
  normalizeWeights: boolean,
  v: ValidationCollector,
): void {
  v.add(checkTfnMatrix(input?.matrix, { sign: 'non-negative', supportedNumberTypes: ['tfn'] }));
  if (v.hasErrors) return;
  const { matrix } = input;

  matrix.criteria.forEach((criterion, j) => {
    const column = { index: j, id: criterion.id };
    if (criterion.direction === 'cost') {
      matrix.values.forEach((row, i) => {
        if ((row[j] as TFN).l === 0) {
          v.error(FUZZY_WASPAS_ISSUE_CODES.zeroCostValue, {
            params: { id: criterion.id },
            location: {
              input: 'matrix',
              row: { index: i, id: matrix.alternatives[i]!.id },
              column,
            },
          });
        }
      });
    } else if (matrix.values.every((row) => (row[j] as TFN).u === 0)) {
      v.error(FUZZY_WASPAS_ISSUE_CODES.zeroIdealValue, {
        params: { id: criterion.id },
        location: { input: 'matrix', column },
      });
    }
  });

  const criterionIds = matrix.criteria.map((criterion) => criterion.id);
  const weights: unknown = input.weights;
  const numberType =
    typeof weights === 'object' && weights !== null
      ? (weights as { numberType?: unknown }).numberType
      : undefined;
  if (numberType === 'tfn') {
    v.add(checkTfnWeights(weights, criterionIds));
    if (normalizeWeights) {
      v.error(FUZZY_WASPAS_ISSUE_CODES.normalizeFuzzyWeights, {
        location: { parameter: 'normalizeWeights' },
      });
    }
  } else if (numberType === 'crisp') {
    v.add(
      checkCrispWeights(weights, criterionIds, {
        notNormalized: normalizeWeights ? 'ignore' : 'warning',
      }),
    );
  } else if (typeof weights === 'object' && weights !== null) {
    v.error(FUZZY_WASPAS_ISSUE_CODES.unsupportedWeights, {
      params: { numberType: String(numberType) },
      location: { input: 'weights' },
    });
  } else {
    v.error(ISSUE_CODES.inputMalformed, {
      params: { input: 'weights' },
      location: { input: 'weights' },
    });
  }
}

export const fuzzyWaspasMethod = defineMethod({
  id: FUZZY_WASPAS_ID,
  version: FUZZY_WASPAS_VERSION,
  category: 'ranking',
  nameKey: key('name'),
  supportedNumberTypes: ['tfn'],
  inputSchema: [
    { name: 'matrix', kind: 'decision-matrix', required: true, numberTypes: ['tfn'] },
    { name: 'weights', kind: 'weights', required: true, numberTypes: ['tfn', 'crisp'] },
  ],
  outputSchema: [
    { name: 'scores', kind: 'scores', numberTypes: ['crisp'] },
    { name: 'ranking', kind: 'ranking', numberTypes: ['crisp'] },
  ],
  parameters,
  references: FUZZY_WASPAS_REFERENCES,

  validate(input: FuzzyWaspasInput, params) {
    const v = createValidation();
    validateFuzzyWaspas(input, params.normalizeWeights, v);
    return v.result();
  },

  run(input: FuzzyWaspasInput, params) {
    const { matrix } = input;
    const defuzzification: DefuzzificationId = params.defuzzification;
    const tb = createTraceBuilder({
      methodId: FUZZY_WASPAS_ID,
      methodVersion: FUZZY_WASPAS_VERSION,
    });
    const criteria = criterionAxis(matrix.criteria);
    const alternatives = alternativeAxis(matrix.alternatives);

    const x = tb.inputMatrix<TFN>({ ...step('initial-matrix'), matrix, encode: encodeTfn });

    // The weights as TFNs. Crisp weights become the degenerate TFN (w, w, w) in a step of
    // their own, after the optional normalization.
    let w: StepHandle<TFN>;
    const weights = input.weights;
    if (isTfnWeights(weights)) {
      w = tb.inputWeights<TFN>({
        ...step('weights'),
        weights,
        criteria: matrix.criteria,
        encode: encodeTfn,
      });
    } else {
      const inputWeights = tb.inputWeights<number>({
        ...step('weights'),
        weights,
        criteria: matrix.criteria,
      });
      let crispWeights: StepHandle<number> = inputWeights;
      if (params.normalizeWeights) {
        const total = term(crisp.sum(inputWeights.row(0)), 'w_sum');
        crispWeights = tb.rowVector({
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
      const source = crispWeights;
      w = tb.rowVector<TFN>({
        ...step('fuzzy-weights'),
        formulas: [
          formula('fuzzy-weight', String.raw`{{w_f}} = ({{w}}, {{w}}, {{w}})`, [
            ['w_f', String.raw`\tilde{w}_j`],
            ['w', 'w_j'],
          ]),
        ],
        items: source.columns,
        row: source.rows[0],
        cell: (column) => tfnOps.fromCrisp(term(source.at(column.index), 'w')),
      });
    }

    // Eq. 16: benefit criteria are divided by the largest upper value, cost criteria are
    // divided into the smallest lower value: (min l / u, min l / m, min l / l).
    const bounds = matrix.criteria.map((criterion, j) =>
      criterion.direction === 'benefit'
        ? term(tfnOps.upper(tfnOps.max(x.column(j))), 'x_best')
        : term(tfnOps.lower(tfnOps.min(x.column(j))), 'x_best'),
    );
    const n = tb.table<TFN>({
      ...step('normalized-matrix'),
      formulas: [
        formula(
          'benefit',
          String.raw`{{n}} = \left( \frac{x^l_{ij}}{ {{x_best}} }, \frac{x^m_{ij}}{ {{x_best}} }, \frac{x^u_{ij}}{ {{x_best}} } \right), \; {{x}} = (x^l_{ij}, x^m_{ij}, x^u_{ij})`,
          NORM_TERMS_BENEFIT,
          FOR_BENEFIT,
        ),
        formula(
          'cost',
          String.raw`{{n}} = \left( \frac{ {{x_best}} }{x^u_{ij}}, \frac{ {{x_best}} }{x^m_{ij}}, \frac{ {{x_best}} }{x^l_{ij}} \right), \; {{x}} = (x^l_{ij}, x^m_{ij}, x^u_{ij})`,
          NORM_TERMS_COST,
          FOR_COST,
        ),
      ],
      rows: alternatives,
      columns: criteria,
      visualization: { view: 'matrix', basedOn: x.id },
      cell: (row, column) => {
        const value = term(x.cell(row.index, column.index), 'x');
        const best = bounds[column.index]!;
        return matrix.criteria[column.index]!.direction === 'benefit'
          ? { tracked: tfnOps.divideByScalar(value, best), formula: 'benefit' }
          : { tracked: tfnOps.scalarDividedBy(best, value), formula: 'cost' };
      },
    });

    // Eq. 17: x̃_ij ⊗ w̃_j. Eq. 13: x̃_ij^w̃_j = (l^w_u, m^w_m, u^w_l).
    const wsmMatrix = tb.table<TFN>({
      ...step('wsm-matrix'),
      formulas: [
        formula('wsm-term', String.raw`{{t}} = {{n}} \otimes {{w}}`, [
          ['t', String.raw`\tilde{x}_{ij} \otimes \tilde{w}_j`],
          ['n', String.raw`\tilde{x}_{ij}`],
          ['w', String.raw`\tilde{w}_j`],
        ]),
      ],
      rows: alternatives,
      columns: criteria,
      visualization: { view: 'matrix', basedOn: n.id },
      cell: (row, column) =>
        tfnOps.multiply(term(n.cell(row.index, column.index), 'n'), term(w.at(column.index), 'w')),
    });
    const wpmMatrix = tb.table<TFN>({
      ...step('wpm-matrix'),
      formulas: [
        formula(
          'wpm-term',
          String.raw`{{t}} = \left( l^{w_u}, m^{w_m}, u^{w_l} \right), \; {{n}} = (l, m, u), \; {{w}} = (w_l, w_m, w_u)`,
          [
            ['t', String.raw`\tilde{x}_{ij}^{\tilde{w}_j}`],
            ['n', String.raw`\tilde{x}_{ij}`],
            ['w', String.raw`\tilde{w}_j`],
          ],
        ),
      ],
      rows: alternatives,
      columns: criteria,
      visualization: { view: 'matrix', basedOn: n.id },
      cell: (row, column) =>
        tfnOps.power(term(n.cell(row.index, column.index), 'n'), term(w.at(column.index), 'w')),
    });

    // Eqs. 19-20: the fuzzy sum Q̃_i and the fuzzy product P̃_i of a row.
    const wsmSums = tb.columnVector<TFN>({
      ...step('wsm-sums'),
      formulas: [
        formula('wsm-sum', String.raw`{{Q}} = \sum_{j=1}^{n} {{t}}`, [
          ['Q', String.raw`\tilde{Q}_i`],
          ['t', String.raw`\tilde{x}_{ij} \otimes \tilde{w}_j`],
        ]),
      ],
      items: alternatives,
      column: quantity('wsm-sum', key('columns.wsmSum')),
      cell: (item) => tfnOps.sum(term(wsmMatrix.row(item.index), 't')),
    });
    const wpmProducts = tb.columnVector<TFN>({
      ...step('wpm-products'),
      formulas: [
        formula('wpm-product', String.raw`{{P}} = \prod_{j=1}^{n} {{t}}`, [
          ['P', String.raw`\tilde{P}_i`],
          ['t', String.raw`\tilde{x}_{ij}^{\tilde{w}_j}`],
        ]),
      ],
      items: alternatives,
      column: quantity('wpm-product', key('columns.wpmProduct')),
      cell: (item) => tfnOps.product(term(wpmMatrix.row(item.index), 't')),
    });

    // Eqs. 21-22: Q_i and P_i are the defuzzified sum and product.
    const crispScores = tb.table<number>({
      ...step('defuzzified-scores'),
      explanationParams: { defuzzification },
      formulas: [
        defuzzification === 'centroid'
          ? formula(
              'defuzzify',
              String.raw`{{a}} = \frac{l + m + u}{3}, \; {{A}} = (l, m, u)`,
              DEFUZZ_TERMS,
            )
          : formula(
              'defuzzify',
              String.raw`{{a}} = \frac{l + 4m + u}{6}, \; {{A}} = (l, m, u)`,
              DEFUZZ_TERMS,
            ),
      ],
      rows: alternatives,
      columns: [quantity('q', key('columns.Q')), quantity('p', key('columns.P'))],
      visualization: { view: 'matrix', basedOn: wsmSums.id },
      cell: (row, column) =>
        tfnOps.defuzzify(
          defuzzification,
          term(column.id === 'q' ? wsmSums.at(row.index) : wpmProducts.at(row.index), 'A'),
        ),
    });
    const q = (i: number) => term(crispScores.cell(i, 'q'), 'Q');
    const p = (i: number) => term(crispScores.cell(i, 'p'), 'P');

    // Eq. 24: λ = Σ P / (Σ Q + Σ P), or a fixed number.
    const lambda = tb.scalar<number>({
      ...step('lambda'),
      explanationParams: { lambdaRule: params.lambdaRule },
      formulas: [
        params.lambdaRule === 'fixed'
          ? formula('lambda', String.raw`{{lambda}} = {{lambda_given}}`, [
              ['lambda', String.raw`\lambda`],
              ['lambda_given', String.raw`\lambda`],
            ])
          : formula('lambda', String.raw`{{lambda}} = \frac{ {{SP}} }{ {{SQ}} + {{SP}} }`, [
              ['lambda', String.raw`\lambda`],
              ['SQ', String.raw`\sum_i Q_i`],
              ['SP', String.raw`\sum_i P_i`],
            ]),
      ],
      value:
        params.lambdaRule === 'fixed'
          ? parameter('lambda', params.lambda, 'lambda_given')
          : crisp.divide(
              term(crisp.sum(crispScores.column('p')), 'SP'),
              crisp.add(
                term(crisp.sum(crispScores.column('q')), 'SQ'),
                term(crisp.sum(crispScores.column('p')), 'SP'),
              ),
            ),
    });

    // Eq. 23: K_i = λ Q_i + (1 − λ) P_i.
    const joint = tb.columnVector<number>({
      ...step('joint-criterion'),
      role: 'result',
      formulas: [
        formula(
          'joint',
          String.raw`{{K}} = {{lambda}} \cdot {{Q}} + (1 - {{lambda}}) \cdot {{P}}`,
          [
            ['K', 'K_i'],
            ['lambda', String.raw`\lambda`],
            ['Q', 'Q_i'],
            ['P', 'P_i'],
          ],
        ),
      ],
      items: alternatives,
      column: quantity('k', key('columns.K')),
      cell: (item) => {
        const l = term(lambda.at(), 'lambda');
        return crisp.add(
          crisp.multiply(l, q(item.index)),
          crisp.multiply(crisp.subtract(1, l), p(item.index)),
        );
      },
    });

    const ranks = crisp.rank(joint.all());
    const ranking = tb.columnVector<number>({
      ...step('ranking'),
      role: 'result',
      items: alternatives,
      column: quantity('rank', key('columns.rank')),
      visualization: { view: 'ranking', basedOn: joint.id },
      cell: (item) => ranks[item.index]!,
    });

    const column = (handle: StepHandle<number>, index = 0) =>
      handle.values().map((cells) => cells[index] as number);
    const scores = column(joint);
    const rankValues = column(ranking);
    const result: FuzzyWaspasResult = {
      scores,
      wsm: column(crispScores, 0),
      wpm: column(crispScores, 1),
      lambda: lambda.at().value,
      ranking: matrix.alternatives.map((alternative, i) => ({
        alternativeId: alternative.id,
        score: scores[i]!,
        rank: rankValues[i]!,
      })),
    };
    return { result, trace: tb.build() };
  },
});

const NORM_TERMS_BENEFIT = [
  ['n', String.raw`\tilde{x}_{ij}`],
  ['x', String.raw`\tilde{x}_{ij}`],
  ['x_best', String.raw`\max_i x^u_{ij}`],
] as const;

const NORM_TERMS_COST = [
  ['n', String.raw`\tilde{x}_{ij}`],
  ['x', String.raw`\tilde{x}_{ij}`],
  ['x_best', String.raw`\min_i x^l_{ij}`],
] as const;

const DEFUZZ_TERMS = [
  ['a', 'a'],
  ['A', String.raw`\tilde{A}`],
] as const;

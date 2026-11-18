/**
 * WASPAS: Weighted Aggregated Sum Product ASsessment.
 *
 * Formulation: docs/methods/waspas.md. Method by Zavadskas, Turskis, Antucheviciene and
 * Zakarevicius (2012), Eqs. 1-19, which also derive the optimal λ.
 *
 * Steps: initial matrix → weights → [normalized weights] → linear max normalization →
 * weighted sum terms w_j x̄_ij and weighted product terms x̄_ij^w_j → WSM scores Q1_i and
 * WPM scores Q2_i → λ → joint criterion Q_i = λ Q1_i + (1 − λ) Q2_i → ranking.
 *
 * λ has three rules (docs/methods/waspas.md): a fixed number, the optimal λ_i of every
 * alternative (Zavadskas et al. 2012, Eqs. 11-19; extra steps for the variances) or the
 * pooled λ of WASPAS-F (Turskis et al. 2015), one value for all alternatives.
 */
import type {
  DecisionMatrix,
  RankingResult,
  Reference,
  StepHandle,
  Tracked,
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
} from '@mateo/engine';
import {
  FOR_BENEFIT,
  FOR_COST,
  checkLinearMaxNormalizable,
  formula,
  quantity,
} from '../src/common';

export const WASPAS_ID = 'waspas';
export const WASPAS_VERSION = '1.0.0';

export const WASPAS_ISSUE_CODES = {
  /** A cost criterion has a zero value: min_i x_ij / x_ij divides by it. */
  zeroCostValue: 'waspas.zero-cost-value',
  /** Every value of a benefit criterion is zero: x_ij / max_i x_ij divides by 0. */
  zeroIdealValue: 'waspas.zero-ideal-value',
} as const;

export interface WaspasInput {
  readonly matrix: DecisionMatrix<number>;
  readonly weights: WeightVector;
}

export interface WaspasResult extends RankingResult {
  /** Joint criterion Q_i of every alternative, in input order. Higher is better. */
  readonly scores: readonly number[];
  /** WSM scores Q1_i, in input order. */
  readonly wsm: readonly number[];
  /** WPM scores Q2_i, in input order. */
  readonly wpm: readonly number[];
  /** The λ of every alternative: the same value for each unless the rule is `optimal`. */
  readonly lambda: readonly number[];
}

const parameters = defineParameters({
  lambdaRule: {
    type: 'enum',
    labelKey: 'methods.waspas.parameters.lambdaRule.label',
    descriptionKey: 'methods.waspas.parameters.lambdaRule.description',
    default: 'fixed',
    options: [
      { value: 'fixed', labelKey: 'methods.waspas.parameters.lambdaRule.fixed' },
      { value: 'optimal', labelKey: 'methods.waspas.parameters.lambdaRule.optimal' },
      { value: 'pooled', labelKey: 'methods.waspas.parameters.lambdaRule.pooled' },
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
  relativeError: {
    type: 'number',
    labelKey: 'methods.waspas.parameters.relativeError.label',
    descriptionKey: 'methods.waspas.parameters.relativeError.description',
    default: 0.05,
    min: 0,
    max: 1,
    exclusiveMin: true,
    step: 0.01,
  },
  normalizeWeights: {
    type: 'boolean',
    labelKey: 'methods.waspas.parameters.normalizeWeights.label',
    descriptionKey: 'methods.waspas.parameters.normalizeWeights.description',
    default: false,
  },
});

export const WASPAS_REFERENCES: readonly Reference[] = [
  {
    id: 'zavadskas2012',
    authors: ['Zavadskas, E. K.', 'Turskis, Z.', 'Antucheviciene, J.', 'Zakarevicius, A.'],
    year: 2012,
    title: 'Optimization of weighted aggregated sum product assessment',
    source: 'Elektronika ir Elektrotechnika',
    volume: '122',
    issue: '6',
    pages: '3-6',
    doi: '10.5755/j01.eee.122.6.1810',
    note: 'Original paper of the method: Eqs. 1-19 and the facade example of Tables 1-4, used as the golden test. The raw matrix, criterion types and weights come from Zavadskas et al. (2013), Economic Computation and Economic Cybernetics Studies and Research 47(2), Table 2; docs/methods/waspas.md lists the errata.',
  },
];

const key = (path: string): string => `methods.waspas.${path}`;
const step = (id: string) => ({
  id,
  nameKey: key(`steps.${id}.name`),
  explanationKey: key(`steps.${id}.explanation`),
});

function validateWaspas(
  input: WaspasInput,
  params: { readonly lambdaRule: string; readonly normalizeWeights: boolean },
  v: ValidationCollector,
) {
  v.add(
    checkCrispMatrix(input?.matrix, {
      // The optimal λ divides by the normalized values (Eq. 17), which must not be zero.
      sign: params.lambdaRule === 'optimal' ? 'positive' : 'non-negative',
      supportedNumberTypes: ['crisp'],
    }),
  );
  if (v.hasErrors) return;
  checkLinearMaxNormalizable(input.matrix, v, WASPAS_ISSUE_CODES);
  v.add(
    checkCrispWeights(
      input.weights,
      input.matrix.criteria.map((criterion) => criterion.id),
      {
        // With the option on, the method normalizes the weights itself.
        notNormalized: params.normalizeWeights ? 'ignore' : 'warning',
      },
    ),
  );
}

export const waspasMethod = defineMethod({
  id: WASPAS_ID,
  version: WASPAS_VERSION,
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
  references: WASPAS_REFERENCES,

  validate(input: WaspasInput, params) {
    const v = createValidation();
    validateWaspas(input, params, v);
    return v.result();
  },

  run(input: WaspasInput, params) {
    const { matrix } = input;
    const tb = createTraceBuilder({ methodId: WASPAS_ID, methodVersion: WASPAS_VERSION });
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

    // Eq. 1: x̄_ij = x_ij / max_i x_ij (benefit), x̄_ij = min_i x_ij / x_ij (cost).
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

    // WSM terms w_j x̄_ij and WPM terms x̄_ij^w_j.
    const wsmTerms = tb.table<number>({
      ...step('wsm-terms'),
      formulas: [
        formula('wsm-term', String.raw`{{t}} = {{w}} \cdot {{n}}`, [
          ['t', String.raw`w_j \bar{x}_{ij}`],
          ['w', 'w_j'],
          ['n', String.raw`\bar{x}_{ij}`],
        ]),
      ],
      rows: alternatives,
      columns: criteria,
      visualization: { view: 'matrix', basedOn: n.id },
      cell: (row, column) =>
        crisp.multiply(term(w.at(column.index), 'w'), term(n.cell(row.index, column.index), 'n')),
    });
    const wpmTerms = tb.table<number>({
      ...step('wpm-terms'),
      formulas: [
        formula('wpm-term', String.raw`{{t}} = {{n}}^{ {{w}} }`, [
          ['t', String.raw`\bar{x}_{ij}^{w_j}`],
          ['w', 'w_j'],
          ['n', String.raw`\bar{x}_{ij}`],
        ]),
      ],
      rows: alternatives,
      columns: criteria,
      visualization: { view: 'matrix', basedOn: n.id },
      cell: (row, column) =>
        crisp.power(term(n.cell(row.index, column.index), 'n'), term(w.at(column.index), 'w')),
    });

    // Eq. 2: Q1_i = Σ_j w_j x̄_ij. Eq. 3: Q2_i = Π_j x̄_ij^w_j.
    const wsm = tb.columnVector<number>({
      ...step('wsm'),
      formulas: [
        formula('wsm', String.raw`{{Q1}} = \sum_{j=1}^{n} {{t}}`, [
          ['Q1', 'Q^{(1)}_i'],
          ['t', String.raw`w_j \bar{x}_{ij}`],
        ]),
      ],
      items: alternatives,
      column: quantity('wsm', key('columns.wsm')),
      cell: (item) => crisp.sum(term(wsmTerms.row(item.index), 't')),
    });
    const wpm = tb.columnVector<number>({
      ...step('wpm'),
      formulas: [
        formula('wpm', String.raw`{{Q2}} = \prod_{j=1}^{n} {{t}}`, [
          ['Q2', 'Q^{(2)}_i'],
          ['t', String.raw`\bar{x}_{ij}^{w_j}`],
        ]),
      ],
      items: alternatives,
      column: quantity('wpm', key('columns.wpm')),
      cell: (item) => crisp.product(term(wpmTerms.row(item.index), 't')),
    });

    // λ.
    let lambdaAt: (alternative: number) => Tracked<number>;
    let lambdaStep: StepHandle<number>;
    if (params.lambdaRule === 'optimal') {
      // Eqs. 11-19: σ²(x̄_ij) = (ε x̄_ij)², σ²(Q1_i) = Σ_j w_j² σ²(x̄_ij),
      // σ²(Q2_i) = Σ_j (Q2_i w_j / x̄_ij)² σ²(x̄_ij), λ_i = σ²(Q2_i) / (σ²(Q1_i) + σ²(Q2_i)).
      const variances = tb.table<number>({
        ...step('normalized-variances'),
        formulas: [
          formula('variance', String.raw`{{v}} = \left( {{eps}} \cdot {{n}} \right)^2`, [
            ['v', String.raw`\sigma^2(\bar{x}_{ij})`],
            ['eps', String.raw`\varepsilon`],
            ['n', String.raw`\bar{x}_{ij}`],
          ]),
        ],
        rows: alternatives,
        columns: criteria,
        visualization: { view: 'matrix', basedOn: n.id },
        cell: (row, column) =>
          crisp.power(
            crisp.multiply(
              parameter('relativeError', params.relativeError, 'eps'),
              term(n.cell(row.index, column.index), 'n'),
            ),
            2,
          ),
      });
      const wsmVariance = tb.columnVector<number>({
        ...step('wsm-variance'),
        formulas: [
          formula('wsm-variance', String.raw`{{V1}} = \sum_{j=1}^{n} {{w}}^2 \cdot {{v}}`, [
            ['V1', String.raw`\sigma^2(Q^{(1)}_i)`],
            ['w', 'w_j'],
            ['v', String.raw`\sigma^2(\bar{x}_{ij})`],
          ]),
        ],
        items: alternatives,
        column: quantity('wsm-variance', key('columns.wsmVariance')),
        cell: (item) =>
          crisp.sum(
            matrix.criteria.map((_, j) =>
              crisp.multiply(
                crisp.power(term(w.at(j), 'w'), 2),
                term(variances.cell(item.index, j), 'v'),
              ),
            ),
          ),
      });
      const wpmVariance = tb.columnVector<number>({
        ...step('wpm-variance'),
        formulas: [
          formula(
            'wpm-variance',
            String.raw`{{V2}} = \sum_{j=1}^{n} \left( \frac{ {{Q2}} \cdot {{w}} }{ {{n}} } \right)^2 \cdot {{v}}`,
            [
              ['V2', String.raw`\sigma^2(Q^{(2)}_i)`],
              ['Q2', 'Q^{(2)}_i'],
              ['w', 'w_j'],
              ['n', String.raw`\bar{x}_{ij}`],
              ['v', String.raw`\sigma^2(\bar{x}_{ij})`],
            ],
          ),
        ],
        items: alternatives,
        column: quantity('wpm-variance', key('columns.wpmVariance')),
        cell: (item) =>
          crisp.sum(
            matrix.criteria.map((_, j) =>
              crisp.multiply(
                crisp.power(
                  crisp.divide(
                    crisp.multiply(term(wpm.at(item.index), 'Q2'), term(w.at(j), 'w')),
                    term(n.cell(item.index, j), 'n'),
                  ),
                  2,
                ),
                term(variances.cell(item.index, j), 'v'),
              ),
            ),
          ),
      });
      lambdaStep = tb.columnVector<number>({
        ...step('lambda'),
        explanationParams: { lambdaRule: params.lambdaRule },
        formulas: [
          formula('lambda', String.raw`{{lambda}} = \frac{ {{V2}} }{ {{V1}} + {{V2}} }`, [
            ['lambda', String.raw`\lambda_i`],
            ['V1', String.raw`\sigma^2(Q^{(1)}_i)`],
            ['V2', String.raw`\sigma^2(Q^{(2)}_i)`],
          ]),
        ],
        items: alternatives,
        column: quantity('lambda', key('columns.lambda')),
        cell: (item) => {
          const v1 = term(wsmVariance.at(item.index), 'V1');
          const v2 = term(wpmVariance.at(item.index), 'V2');
          return crisp.divide(v2, crisp.add(v1, v2));
        },
      });
      lambdaAt = (i) => lambdaStep.at(i);
    } else {
      const value =
        params.lambdaRule === 'fixed'
          ? parameter('lambda', params.lambda, 'lambda')
          : // WASPAS-F, Eq. 24: λ = Σ Q2 / (Σ Q1 + Σ Q2).
            crisp.divide(
              term(crisp.sum(wpm.all()), 'S2'),
              crisp.add(term(crisp.sum(wsm.all()), 'S1'), term(crisp.sum(wpm.all()), 'S2')),
            );
      lambdaStep = tb.scalar<number>({
        ...step('lambda'),
        explanationParams: { lambdaRule: params.lambdaRule },
        formulas: [
          params.lambdaRule === 'fixed'
            ? formula('lambda', String.raw`{{lambda}} = {{lambda_given}}`, [
                ['lambda', String.raw`\lambda`],
                ['lambda_given', String.raw`\lambda`],
              ])
            : formula('lambda', String.raw`{{lambda}} = \frac{ {{S2}} }{ {{S1}} + {{S2}} }`, [
                ['lambda', String.raw`\lambda`],
                ['S1', String.raw`\sum_i Q^{(1)}_i`],
                ['S2', String.raw`\sum_i Q^{(2)}_i`],
              ]),
        ],
        value,
      });
      lambdaAt = () => lambdaStep.at();
    }

    // Eq. 4: Q_i = λ Q1_i + (1 − λ) Q2_i.
    const joint = tb.columnVector<number>({
      ...step('joint-criterion'),
      role: 'result',
      formulas: [
        formula(
          'joint',
          String.raw`{{Q}} = {{lambda}} \cdot {{Q1}} + (1 - {{lambda}}) \cdot {{Q2}}`,
          [
            ['Q', 'Q_i'],
            ['lambda', String.raw`\lambda`],
            ['Q1', 'Q^{(1)}_i'],
            ['Q2', 'Q^{(2)}_i'],
          ],
        ),
      ],
      items: alternatives,
      column: quantity('q', key('columns.Q')),
      cell: (item) => {
        const lambda = term(lambdaAt(item.index), 'lambda');
        return crisp.add(
          crisp.multiply(lambda, term(wsm.at(item.index), 'Q1')),
          crisp.multiply(crisp.subtract(1, lambda), term(wpm.at(item.index), 'Q2')),
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

    const column = (handle: StepHandle<number>) =>
      handle.values().map((cells) => cells[0] as number);
    const scores = column(joint);
    const rankValues = column(ranking);
    const result: WaspasResult = {
      scores,
      wsm: column(wsm),
      wpm: column(wpm),
      lambda: matrix.alternatives.map((_, i) => lambdaAt(i).value),
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
  ['n', String.raw`\bar{x}_{ij}`],
  ['x', 'x_{ij}'],
  ['x_best', String.raw`x^{*}_j`],
] as const;

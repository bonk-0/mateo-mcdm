/**
 * MOORA: Multi-Objective Optimization on the basis of Ratio Analysis.
 *
 * Formulation: docs/methods/moora.md, from Brauers and Zavadskas (2006), Eqs. 1-4: vector
 * normalisation, the ratio system and the reference point approach. Both rankings are
 * recorded in the trace; the `rankBy` parameter selects the one the result reports.
 * The original has no weights; they are optional here (docs/methods/moora.md).
 *
 * Steps: initial matrix → [weights] → column norms → normalized matrix →
 * [weighted matrix] → ratio system y_i → its ranking → reference point r_j →
 * deviations |r_j − v_ij| → maximal deviation → its ranking.
 */
import type {
  DecisionMatrix,
  RankingResult,
  Reference,
  ValidationCollector,
  WeightVector,
} from '@mateo/engine';
import {
  alternativeAxis,
  checkCrispMatrix,
  checkCrispWeights,
  constant,
  createTraceBuilder,
  createValidation,
  crisp,
  criterionAxis,
  defineMethod,
  defineParameters,
  term,
} from '@mateo/engine';
import { FOR_BENEFIT, FOR_COST, formula, quantity, referenceRow } from '../src/common';

export const MOORA_ID = 'moora';
export const MOORA_VERSION = '1.0.0';

export const MOORA_ISSUE_CODES = {
  /** Every value of a criterion is 0: x_ij / √Σ x_ij² divides by the column norm. */
  zeroColumnNorm: 'moora.zero-column-norm',
} as const;

export interface MooraInput {
  readonly matrix: DecisionMatrix<number>;
  /** Optional. Without weights every criterion counts equally (the original method). */
  readonly weights?: WeightVector;
}

/** Which of the two rankings is the result. */
export type MooraRankBy = 'ratio-system' | 'reference-point';

export interface MooraResult extends RankingResult {
  /** Ratio system y_i, in input order. Higher is better. */
  readonly ratioSystem: readonly number[];
  readonly ratioSystemRanking: readonly number[];
  /** Maximal deviation from the reference point, in input order. Lower is better. */
  readonly maxDeviation: readonly number[];
  readonly referencePointRanking: readonly number[];
  /** The values of the ranking selected by `rankBy`. */
  readonly scores: readonly number[];
}

/** The `rankBy` parameter, shared with Fuzzy MOORA. */
export const MOORA_RANK_BY = {
  type: 'enum',
  labelKey: 'methods.moora.parameters.rankBy.label',
  descriptionKey: 'methods.moora.parameters.rankBy.description',
  default: 'ratio-system',
  options: [
    { value: 'ratio-system', labelKey: 'methods.moora.parameters.rankBy.ratioSystem' },
    { value: 'reference-point', labelKey: 'methods.moora.parameters.rankBy.referencePoint' },
  ],
} as const;

const parameters = defineParameters({ rankBy: MOORA_RANK_BY });

export const MOORA_REFERENCES: readonly Reference[] = [
  {
    id: 'brauers2006',
    authors: ['Brauers, W. K. M.', 'Zavadskas, E. K.'],
    year: 2006,
    title: 'The MOORA method and its application to privatization in a transition economy',
    source: 'Control and Cybernetics',
    volume: '35',
    issue: '2',
    pages: '445-469',
    url: 'https://eudml.org/doc/209425',
    note: 'Section 2, Eqs. 1-4, and the worked example of Table 1, used as the golden test. The journal issued no DOI.',
  },
];

const key = (path: string): string => `methods.moora.${path}`;
const step = (id: string) => ({
  id,
  nameKey: key(`steps.${id}.name`),
  explanationKey: key(`steps.${id}.explanation`),
});

/** Column ids of the sums step. */
const Y_PLUS = 'y-plus';
const Y_MINUS = 'y-minus';

function validateMoora(input: MooraInput, v: ValidationCollector): void {
  v.add(checkCrispMatrix(input?.matrix, { supportedNumberTypes: ['crisp'] }));
  if (v.hasErrors) return;
  const { matrix } = input;
  const criterionIds = matrix.criteria.map((criterion) => criterion.id);
  if (input.weights !== undefined) {
    // Scaling every weight by the same factor leaves both rankings unchanged.
    v.add(checkCrispWeights(input.weights, criterionIds, { notNormalized: 'ignore' }));
    if (v.hasErrors) return;
  }
  matrix.criteria.forEach((criterion, j) => {
    if (matrix.values.every((row) => row[j] === 0)) {
      v.error(MOORA_ISSUE_CODES.zeroColumnNorm, {
        params: { id: criterion.id },
        location: { input: 'matrix', column: { index: j, id: criterion.id } },
      });
    }
  });
}

export const mooraMethod = defineMethod({
  id: MOORA_ID,
  version: MOORA_VERSION,
  category: 'ranking',
  nameKey: key('name'),
  supportedNumberTypes: ['crisp'],
  inputSchema: [
    { name: 'matrix', kind: 'decision-matrix', required: true, numberTypes: ['crisp'] },
    { name: 'weights', kind: 'weights', required: false, numberTypes: ['crisp'] },
  ],
  outputSchema: [
    { name: 'scores', kind: 'scores', numberTypes: ['crisp'] },
    { name: 'ranking', kind: 'ranking', numberTypes: ['crisp'] },
  ],
  parameters,
  references: MOORA_REFERENCES,

  validate(input: MooraInput) {
    const v = createValidation();
    validateMoora(input, v);
    return v.result();
  },

  run(input: MooraInput, params) {
    const { matrix } = input;
    const tb = createTraceBuilder({ methodId: MOORA_ID, methodVersion: MOORA_VERSION });
    const rows = alternativeAxis(matrix.alternatives);
    const criteria = criterionAxis(matrix.criteria);

    const x = tb.inputMatrix({ ...step('initial-matrix'), matrix });
    const w =
      input.weights === undefined
        ? undefined
        : tb.inputWeights({
            ...step('weights'),
            weights: input.weights,
            criteria: matrix.criteria,
          });

    // Eq. 2: x*_ij = x_ij / √(Σ_i x_ij²).
    const norms = tb.rowVector<number>({
      ...step('norms'),
      formulas: [
        formula('norm', String.raw`{{norm}} = \sqrt{ \sum_{i=1}^{m} {{x}}^2 }`, [
          ['norm', String.raw`\sqrt{\sum_{i=1}^{m} x_{ij}^2}`],
          ['x', 'x_{ij}'],
        ]),
      ],
      items: x.columns,
      row: quantity('norm', key('rows.norm')),
      cell: (column) => crisp.sqrt(crisp.sumOfSquares(term(x.column(column.index), 'x'))),
    });
    const n = tb.table<number>({
      ...step('normalized-matrix'),
      formulas: [
        formula('normalized', String.raw`{{n}} = \frac{ {{x}} }{ {{norm}} }`, [
          ['n', String.raw`x^*_{ij}`],
          ['x', 'x_{ij}'],
          ['norm', String.raw`\sqrt{\sum_{i=1}^{m} x_{ij}^2}`],
        ]),
      ],
      rows,
      columns: criteria,
      visualization: { view: 'matrix', basedOn: x.id },
      cell: (row, column) =>
        crisp.divide(
          term(x.cell(row.index, column.index), 'x'),
          term(norms.at(column.index), 'norm'),
        ),
    });

    // The weighted variant multiplies every x*_ij by w_j. Without weights v = x*.
    const v =
      w === undefined
        ? n
        : tb.table<number>({
            ...step('weighted-matrix'),
            formulas: [
              formula('weighted', String.raw`{{v}} = {{w}} \cdot {{n}}`, [
                ['v', 'v_{ij}'],
                ['w', 'w_j'],
                ['n', String.raw`x^*_{ij}`],
              ]),
            ],
            rows,
            columns: criteria,
            visualization: { view: 'matrix', basedOn: n.id },
            cell: (row, column) =>
              crisp.multiply(
                term(w.at(column.index), 'w'),
                term(n.cell(row.index, column.index), 'n'),
              ),
          });
    const valueTerm = w === undefined ? String.raw`x^*_{ij}` : 'v_{ij}';

    // Eq. 3: y_i = Σ_{j ∈ max} x*_ij − Σ_{j ∈ min} x*_ij, in two steps: the two sums, then
    // their difference.
    const benefit = matrix.criteria.flatMap((c, j) => (c.direction === 'benefit' ? [j] : []));
    const cost = matrix.criteria.flatMap((c, j) => (c.direction === 'cost' ? [j] : []));
    const sumOver = (columns: readonly number[], row: number) =>
      columns.length === 0 ? constant(0) : crisp.sum(columns.map((j) => term(v.cell(row, j), 'v')));
    const sums = tb.table<number>({
      ...step('ratio-sums'),
      formulas: [
        formula('y-plus', String.raw`{{y_plus}} = \sum_{j \in \text{max}} {{v}}`, [
          ['y_plus', String.raw`y_i^{+}`],
          ['v', valueTerm],
        ]),
        formula('y-minus', String.raw`{{y_minus}} = \sum_{j \in \text{min}} {{v}}`, [
          ['y_minus', String.raw`y_i^{-}`],
          ['v', valueTerm],
        ]),
      ],
      rows,
      columns: [quantity(Y_PLUS, key('columns.yPlus')), quantity(Y_MINUS, key('columns.yMinus'))],
      visualization: { view: 'matrix', basedOn: v.id },
      cell: (row, column) =>
        column.index === 0
          ? { tracked: sumOver(benefit, row.index), formula: 'y-plus' }
          : { tracked: sumOver(cost, row.index), formula: 'y-minus' },
    });
    const y = tb.columnVector<number>({
      ...step('ratio-system'),
      role: 'result',
      formulas: [
        formula('y', String.raw`{{y}} = {{y_plus}} - {{y_minus}}`, [
          ['y', 'y_i'],
          ['y_plus', String.raw`y_i^{+}`],
          ['y_minus', String.raw`y_i^{-}`],
        ]),
      ],
      items: rows,
      column: quantity('y', key('columns.y')),
      visualization: { view: 'bars', basedOn: sums.id },
      cell: (item) =>
        crisp.subtract(
          term(sums.cell(item.index, Y_PLUS), 'y_plus'),
          term(sums.cell(item.index, Y_MINUS), 'y_minus'),
        ),
    });
    const yRanks = crisp.rank(y.all());
    const yRanking = tb.columnVector<number>({
      ...step('ratio-system-ranking'),
      role: 'result',
      items: rows,
      column: quantity('rank', key('columns.rank')),
      visualization: { view: 'ranking', basedOn: y.id },
      cell: (item) => yRanks[item.index]!,
    });

    // Eq. 4: r_j is the best value of objective j; alternatives are ranked by the smallest
    // maximal (Tchebycheff) deviation max_j |r_j − v_ij|.
    const reference = tb.rowVector<number>({
      ...step('reference-point'),
      formulas: [
        formula(
          'reference-benefit',
          String.raw`{{r}} = \max_i {{v}}`,
          REFERENCE_TERMS(valueTerm),
          FOR_BENEFIT,
        ),
        formula(
          'reference-cost',
          String.raw`{{r}} = \min_i {{v}}`,
          REFERENCE_TERMS(valueTerm),
          FOR_COST,
        ),
      ],
      items: criteria,
      row: referenceRow('r', key('rows.referencePoint')),
      cell: (column) => {
        const direction = matrix.criteria[column.index]!.direction;
        const values = term(v.column(column.index), 'v');
        return {
          tracked: direction === 'benefit' ? crisp.max(values) : crisp.min(values),
          formula: `reference-${direction}`,
        };
      },
    });
    const deviations = tb.table<number>({
      ...step('deviations'),
      formulas: [
        formula('deviation', String.raw`{{d}} = \left| {{r}} - {{v}} \right|`, [
          ['d', String.raw`\left| r_j - ${valueTerm} \right|`],
          ['r', 'r_j'],
          ['v', valueTerm],
        ]),
      ],
      rows,
      columns: criteria,
      visualization: { view: 'matrix', basedOn: v.id },
      cell: (row, column) =>
        crisp.abs(
          crisp.subtract(
            term(reference.at(column.index), 'r'),
            term(v.cell(row.index, column.index), 'v'),
          ),
        ),
    });
    const maxDeviation = tb.columnVector<number>({
      ...step('max-deviation'),
      role: 'result',
      formulas: [
        formula('max-deviation', String.raw`{{m}} = \max_j {{d}}`, [
          ['m', String.raw`\max_j \left| r_j - ${valueTerm} \right|`],
          ['d', String.raw`\left| r_j - ${valueTerm} \right|`],
        ]),
      ],
      items: rows,
      column: quantity('max-deviation', key('columns.maxDeviation')),
      visualization: { view: 'bars', basedOn: deviations.id },
      cell: (item) => crisp.max(term(deviations.row(item.index), 'd')),
    });
    const dRanks = crisp.rank(maxDeviation.all(), { order: 'ascending' });
    const dRanking = tb.columnVector<number>({
      ...step('reference-point-ranking'),
      role: 'result',
      items: rows,
      column: quantity('rank', key('columns.rank')),
      visualization: { view: 'ranking', basedOn: maxDeviation.id },
      cell: (item) => dRanks[item.index]!,
    });

    const column = (handle: typeof y) => handle.values().map((cells) => cells[0] as number);
    const ratioSystem = column(y);
    const maxDeviations = column(maxDeviation);
    const ratioSystemRanking = column(yRanking);
    const referencePointRanking = column(dRanking);
    const byRatioSystem = params.rankBy === 'ratio-system';
    const scores = byRatioSystem ? ratioSystem : maxDeviations;
    const ranks = byRatioSystem ? ratioSystemRanking : referencePointRanking;
    const result: MooraResult = {
      ratioSystem,
      ratioSystemRanking,
      maxDeviation: maxDeviations,
      referencePointRanking,
      scores,
      ranking: matrix.alternatives.map((alternative, i) => ({
        alternativeId: alternative.id,
        score: scores[i]!,
        rank: ranks[i]!,
      })),
    };
    return { result, trace: tb.build() };
  },
});

const REFERENCE_TERMS = (valueTerm: string) =>
  [
    ['r', 'r_j'],
    ['v', valueTerm],
  ] as const;

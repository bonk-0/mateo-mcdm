/**
 * Fuzzy MOORA with triangular fuzzy numbers: the ratio system and the reference point
 * approach of Brauers, Baležentis and Baležentis (2011).
 *
 * NOT YET VERIFIED against a published example (docs/methods/moora.md): the paper's
 * worked example is too large to transcribe, so this method is tested with property tests
 * only (crisp input gives crisp MOORA, every TFN stays valid), until a golden test exists.
 * The formulas follow the fuzzy arithmetic of the method:
 *
 * - vector normalisation by the TFN norm: x̃*_ij = x̃_ij ⊘ (√Σ l², √Σ m², √Σ u²), which
 *   keeps l ≤ m ≤ u;
 * - ratio system ỹ_i = Σ_{max} ṽ_ij ⊖ Σ_{min} ṽ_ij, defuzzified (centroid, the BNP of the
 *   paper) to rank;
 * - reference point r̃_j: the component-wise best TFN of the column; the deviation is the
 *   vertex distance, and alternatives are ranked by the smallest maximal deviation.
 *
 * Weights are optional, as in MOORA.
 */
import type {
  DecisionMatrix,
  Reference,
  StepHandle,
  Tracked,
  ValidationCollector,
  WeightVector,
} from '@mateo/engine';
import {
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
import { checkTfnMatrix, encodeTfn, tfnOps } from '@mateo/fuzzy';
import {
  checkTfnOrCrispWeights,
  FOR_BENEFIT,
  FOR_COST,
  formula,
  quantity,
  referenceRow,
} from '../src/common';
import type { MooraResult } from './moora';
import { MOORA_RANK_BY } from './moora';

export const FUZZY_MOORA_ID = 'fuzzy-moora';
export const FUZZY_MOORA_VERSION = '1.0.0';

export const FUZZY_MOORA_ISSUE_CODES = {
  /** The weights are neither crisp nor TFN. */
  unsupportedWeights: 'fuzzy-moora.unsupported-weights',
  /** Every lower value l of a criterion is 0: the norm (√Σ l², …) has a zero lower bound. */
  zeroColumnNorm: 'fuzzy-moora.zero-column-norm',
} as const;

/** TFN weights or crisp weights, which enter the weighted matrix as the TFN (w, w, w). */
export type FuzzyMooraWeights = WeightVector<TFN> | WeightVector<number>;

export interface FuzzyMooraInput {
  readonly matrix: DecisionMatrix<TFN>;
  /** Optional. Without weights every criterion counts equally. */
  readonly weights?: FuzzyMooraWeights;
}

export type FuzzyMooraResult = MooraResult;

const parameters = defineParameters({
  rankBy: MOORA_RANK_BY,
  defuzzification: {
    type: 'enum',
    labelKey: 'methods.fuzzyMoora.parameters.defuzzification.label',
    descriptionKey: 'methods.fuzzyMoora.parameters.defuzzification.description',
    default: 'centroid',
    options: [
      { value: 'centroid', labelKey: 'methods.fuzzyMoora.parameters.defuzzification.centroid' },
      {
        value: 'graded-mean',
        labelKey: 'methods.fuzzyMoora.parameters.defuzzification.gradedMean',
      },
    ],
  },
});

export const FUZZY_MOORA_REFERENCES: readonly Reference[] = [
  {
    id: 'brauers2011',
    authors: ['Brauers, W. K. M.', 'Baležentis, A.', 'Baležentis, T.'],
    year: 2011,
    title: 'MULTIMOORA for the EU member states updated with fuzzy number theory',
    source: 'Technological and Economic Development of Economy',
    volume: '17',
    issue: '2',
    pages: '259-290',
    doi: '10.3846/20294913.2011.580566',
    note: 'Fuzzy ratio system and reference point. Implemented from the formulas of the method and tested with property tests; its worked example (27 member states, 12 TFN indicators) is not reproduced, so the variant is not yet verified against a published example.',
  },
];

const key = (path: string): string => `methods.fuzzyMoora.${path}`;
/** Steps with the same text as in MOORA reuse its keys. */
const moora = (path: string): string => `methods.moora.${path}`;
const step = (id: string) => ({
  id,
  nameKey: key(`steps.${id}.name`),
  explanationKey: key(`steps.${id}.explanation`),
});
const mooraStep = (id: string) => ({
  id,
  nameKey: moora(`steps.${id}.name`),
  explanationKey: moora(`steps.${id}.explanation`),
});

const isTfnWeights = (weights: FuzzyMooraWeights): weights is WeightVector<TFN> =>
  weights.numberType === 'tfn';

function validateFuzzyMoora(input: FuzzyMooraInput, v: ValidationCollector): void {
  v.add(checkTfnMatrix(input?.matrix, { sign: 'non-negative', supportedNumberTypes: ['tfn'] }));
  if (v.hasErrors) return;
  const { matrix } = input;
  if (input.weights !== undefined) {
    checkTfnOrCrispWeights(
      input.weights,
      matrix.criteria.map((criterion) => criterion.id),
      FUZZY_MOORA_ISSUE_CODES.unsupportedWeights,
      v,
    );
    if (v.hasErrors) return;
  }
  matrix.criteria.forEach((criterion, j) => {
    // The upper component u / √Σ l² divides by the lower bound of the norm.
    if (matrix.values.every((row) => (row[j] as TFN).l === 0)) {
      v.error(FUZZY_MOORA_ISSUE_CODES.zeroColumnNorm, {
        params: { id: criterion.id },
        location: { input: 'matrix', column: { index: j, id: criterion.id } },
      });
    }
  });
}

export const fuzzyMooraMethod = defineMethod({
  id: FUZZY_MOORA_ID,
  version: FUZZY_MOORA_VERSION,
  category: 'ranking',
  nameKey: key('name'),
  supportedNumberTypes: ['tfn'],
  inputSchema: [
    { name: 'matrix', kind: 'decision-matrix', required: true, numberTypes: ['tfn'] },
    { name: 'weights', kind: 'weights', required: false, numberTypes: ['tfn', 'crisp'] },
  ],
  outputSchema: [
    { name: 'scores', kind: 'scores', numberTypes: ['crisp'] },
    { name: 'ranking', kind: 'ranking', numberTypes: ['crisp'] },
  ],
  parameters,
  references: FUZZY_MOORA_REFERENCES,

  validate(input: FuzzyMooraInput) {
    const v = createValidation();
    validateFuzzyMoora(input, v);
    return v.result();
  },

  run(input: FuzzyMooraInput, params) {
    const { matrix } = input;
    const defuzzification: DefuzzificationId = params.defuzzification;
    const tb = createTraceBuilder({ methodId: FUZZY_MOORA_ID, methodVersion: FUZZY_MOORA_VERSION });
    const rows = alternativeAxis(matrix.alternatives);
    const criteria = criterionAxis(matrix.criteria);

    const x = tb.inputMatrix<TFN>({ ...step('initial-matrix'), matrix, encode: encodeTfn });

    // Weights: TFNs are multiplied as TFNs, crisp weights as scalars (the TFN (w, w, w)).
    const weights = input.weights;
    let weightOf: ((column: number) => Tracked<TFN> | Tracked<number>) | undefined;
    let fuzzyWeights = false;
    if (weights !== undefined) {
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
        const w = tb.inputWeights<number>({
          ...step('weights'),
          weights,
          criteria: matrix.criteria,
        });
        weightOf = (j) => w.at(j);
      }
    }

    // x̃*_ij = x̃_ij ⊘ (√Σ l², √Σ m², √Σ u²).
    const norms = tb.rowVector<TFN>({
      ...step('norms'),
      formulas: [
        formula(
          'norm',
          String.raw`{{norm}} = \left( \sqrt{\sum_{i} l_{ij}^2}, \sqrt{\sum_{i} m_{ij}^2}, \sqrt{\sum_{i} u_{ij}^2} \right), \; {{x}} = (l_{ij}, m_{ij}, u_{ij})`,
          [
            ['norm', String.raw`\tilde{N}_j`],
            ['x', String.raw`\tilde{x}_{ij}`],
          ],
        ),
      ],
      items: x.columns,
      row: quantity('norm', moora('rows.norm')),
      cell: (column) => tfnOps.norm(term(x.column(column.index), 'x')),
    });
    const n = tb.table<TFN>({
      ...step('normalized-matrix'),
      formulas: [
        formula('normalized', String.raw`{{n}} = {{x}} \oslash {{norm}}`, [
          ['n', String.raw`\tilde{x}^*_{ij}`],
          ['x', String.raw`\tilde{x}_{ij}`],
          ['norm', String.raw`\tilde{N}_j`],
        ]),
      ],
      rows,
      columns: criteria,
      visualization: { view: 'matrix', basedOn: x.id },
      cell: (row, column) =>
        tfnOps.divide(
          term(x.cell(row.index, column.index), 'x'),
          term(norms.at(column.index), 'norm'),
        ),
    });

    const v: StepHandle<TFN> =
      weightOf === undefined
        ? n
        : tb.table<TFN>({
            ...step('weighted-matrix'),
            formulas: [
              formula('weighted', String.raw`{{v}} = {{n}} \otimes {{w}}`, [
                ['v', String.raw`\tilde{v}_{ij}`],
                ['n', String.raw`\tilde{x}^*_{ij}`],
                ['w', fuzzyWeights ? String.raw`\tilde{w}_j` : 'w_j'],
              ]),
            ],
            rows,
            columns: criteria,
            visualization: { view: 'matrix', basedOn: n.id },
            cell: (row, column) => {
              const value = term(n.cell(row.index, column.index), 'n');
              const weight = weightOf(column.index);
              return fuzzyWeights
                ? tfnOps.multiply(value, term(weight as Tracked<TFN>, 'w'))
                : tfnOps.multiplyByScalar(value, term(weight as Tracked<number>, 'w'));
            },
          });
    const valueTerm =
      weightOf === undefined ? String.raw`\tilde{x}^*_{ij}` : String.raw`\tilde{v}_{ij}`;

    // Ratio system: ỹ_i = Σ_{max} ṽ_ij ⊖ Σ_{min} ṽ_ij.
    const benefit = matrix.criteria.flatMap((c, j) => (c.direction === 'benefit' ? [j] : []));
    const cost = matrix.criteria.flatMap((c, j) => (c.direction === 'cost' ? [j] : []));
    const sumOver = (columns: readonly number[], row: number) =>
      columns.length === 0
        ? tfnOps.fromCrisp(0)
        : tfnOps.sum(columns.map((j) => term(v.cell(row, j), 'v')));
    const sums = tb.table<TFN>({
      ...step('ratio-sums'),
      formulas: [
        formula('y-plus', String.raw`{{y_plus}} = \sum_{j \in \text{max}} {{v}}`, [
          ['y_plus', String.raw`\tilde{y}_i^{+}`],
          ['v', valueTerm],
        ]),
        formula('y-minus', String.raw`{{y_minus}} = \sum_{j \in \text{min}} {{v}}`, [
          ['y_minus', String.raw`\tilde{y}_i^{-}`],
          ['v', valueTerm],
        ]),
      ],
      rows,
      columns: [
        quantity('y-plus', key('columns.yPlus')),
        quantity('y-minus', key('columns.yMinus')),
      ],
      visualization: { view: 'matrix', basedOn: v.id },
      cell: (row, column) =>
        column.index === 0
          ? { tracked: sumOver(benefit, row.index), formula: 'y-plus' }
          : { tracked: sumOver(cost, row.index), formula: 'y-minus' },
    });
    const yFuzzy = tb.columnVector<TFN>({
      ...step('fuzzy-ratio-system'),
      formulas: [
        formula('y', String.raw`{{y}} = {{y_plus}} \ominus {{y_minus}}`, [
          ['y', String.raw`\tilde{y}_i`],
          ['y_plus', String.raw`\tilde{y}_i^{+}`],
          ['y_minus', String.raw`\tilde{y}_i^{-}`],
        ]),
      ],
      items: rows,
      column: quantity('y-fuzzy', key('columns.yFuzzy')),
      cell: (item) =>
        tfnOps.subtract(
          term(sums.cell(item.index, 'y-plus'), 'y_plus'),
          term(sums.cell(item.index, 'y-minus'), 'y_minus'),
        ),
    });
    const y = tb.columnVector<number>({
      ...step('ratio-system'),
      role: 'result',
      formulas: [
        formula(`defuzzify-${defuzzification}`, defuzzifyTemplate(defuzzification), [
          ['y', 'y_i'],
          ['a', String.raw`\tilde{y}_i`],
        ]),
      ],
      items: rows,
      column: quantity('y', moora('columns.y')),
      visualization: { view: 'bars', basedOn: yFuzzy.id },
      cell: (item) => tfnOps.defuzzify(defuzzification, term(yFuzzy.at(item.index), 'a')),
    });
    const yRanks = crisp.rank(y.all());
    const yRanking = tb.columnVector<number>({
      ...mooraStep('ratio-system-ranking'),
      role: 'result',
      items: rows,
      column: quantity('rank', moora('columns.rank')),
      visualization: { view: 'ranking', basedOn: y.id },
      cell: (item) => yRanks[item.index]!,
    });

    // Reference point: the best TFN of every column, component-wise.
    const reference = tb.rowVector<TFN>({
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
      row: referenceRow('r', moora('rows.referencePoint')),
      cell: (column) => {
        const direction = matrix.criteria[column.index]!.direction;
        const values = term(v.column(column.index), 'v');
        return {
          tracked: direction === 'benefit' ? tfnOps.max(values) : tfnOps.min(values),
          formula: `reference-${direction}`,
        };
      },
    });
    const deviations = tb.table<number>({
      ...step('deviations'),
      formulas: [
        formula('deviation', String.raw`{{d}} = d_v( {{r}}, {{v}} )`, [
          ['d', String.raw`d_v(\tilde{r}_j, ${valueTerm})`],
          ['r', String.raw`\tilde{r}_j`],
          ['v', valueTerm],
        ]),
      ],
      rows,
      columns: criteria,
      visualization: { view: 'matrix', basedOn: v.id },
      cell: (row, column) =>
        tfnOps.vertexDistance(
          term(reference.at(column.index), 'r'),
          term(v.cell(row.index, column.index), 'v'),
        ),
    });
    const maxDeviation = tb.columnVector<number>({
      ...mooraStep('max-deviation'),
      role: 'result',
      formulas: [
        formula('max-deviation', String.raw`{{m}} = \max_j {{d}}`, [
          ['m', String.raw`\max_j d_v(\tilde{r}_j, ${valueTerm})`],
          ['d', String.raw`d_v(\tilde{r}_j, ${valueTerm})`],
        ]),
      ],
      items: rows,
      column: quantity('max-deviation', moora('columns.maxDeviation')),
      visualization: { view: 'bars', basedOn: deviations.id },
      cell: (item) => crisp.max(term(deviations.row(item.index), 'd')),
    });
    const dRanks = crisp.rank(maxDeviation.all(), { order: 'ascending' });
    const dRanking = tb.columnVector<number>({
      ...mooraStep('reference-point-ranking'),
      role: 'result',
      items: rows,
      column: quantity('rank', moora('columns.rank')),
      visualization: { view: 'ranking', basedOn: maxDeviation.id },
      cell: (item) => dRanks[item.index]!,
    });

    const column = (handle: StepHandle<number>) =>
      handle.values().map((cells) => cells[0] as number);
    const ratioSystem = column(y);
    const maxDeviations = column(maxDeviation);
    const ratioSystemRanking = column(yRanking);
    const referencePointRanking = column(dRanking);
    const byRatioSystem = params.rankBy === 'ratio-system';
    const scores = byRatioSystem ? ratioSystem : maxDeviations;
    const ranks = byRatioSystem ? ratioSystemRanking : referencePointRanking;
    const result: FuzzyMooraResult = {
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
    ['r', String.raw`\tilde{r}_j`],
    ['v', valueTerm],
  ] as const;

function defuzzifyTemplate(id: DefuzzificationId): string {
  return id === 'centroid'
    ? String.raw`{{y}} = \frac{ a^l + a^m + a^u }{3}, \; {{a}} = (a^l, a^m, a^u)`
    : String.raw`{{y}} = \frac{ a^l + 4 a^m + a^u }{6}, \; {{a}} = (a^l, a^m, a^u)`;
}

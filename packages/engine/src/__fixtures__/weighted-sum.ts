/**
 * A toy "weighted sum" ranking method. It exists only to exercise the engine contract in
 * tests and to serve as a worked example for method authors; it is not exported from the
 * package and is not a method of the product.
 *
 * Steps: initial matrix → weights → normalized matrix → weighted matrix → scores → ranks.
 */
import type { NormalizationVariant } from '../math/normalize';
import { createColumnNormalizer } from '../math/normalize';
import type { RankingResult } from '../method/method';
import { defineMethod } from '../method/method';
import { defineParameters } from '../method/parameters';
import type { Criterion } from '../model/criterion';
import type { DecisionMatrix } from '../model/matrix';
import type { WeightVector } from '../model/weights';
import { createTraceBuilder } from '../trace/builder';
import { crisp } from '../trace/crisp-ops';
import { term } from '../trace/tracked';
import type { TraceFormula } from '../trace/types';
import { createValidation } from '../validation/collector';
import { checkCrispMatrix } from '../validation/matrix-checks';
import { checkCrispWeights } from '../validation/weight-checks';

export interface WeightedSumInput {
  readonly matrix: DecisionMatrix<number>;
  readonly weights: WeightVector;
}

export interface WeightedSumResult extends RankingResult {
  readonly scores: readonly number[];
}

const parameters = defineParameters({
  normalization: {
    type: 'enum',
    labelKey: 'methods.weightedSum.parameters.normalization',
    default: 'max',
    options: [
      { value: 'max', labelKey: 'normalization.max' },
      { value: 'sum', labelKey: 'normalization.sum' },
    ],
  },
});

const NORMALIZATION_FORMULAS: Record<'max' | 'sum', readonly TraceFormula[]> = {
  max: [
    {
      id: 'benefit',
      template: String.raw`{{n}} = \frac{ {{x}} }{ {{x_max}} }`,
      terms: [
        { name: 'n', latex: 'n_{ij}' },
        { name: 'x', latex: 'x_{ij}' },
        { name: 'x_max', latex: String.raw`\max_i x_{ij}` },
      ],
      condition: { key: 'methods.common.forBenefitCriteria' },
    },
    {
      id: 'cost',
      template: String.raw`{{n}} = \frac{ {{x_min}} }{ {{x}} }`,
      terms: [
        { name: 'n', latex: 'n_{ij}' },
        { name: 'x', latex: 'x_{ij}' },
        { name: 'x_min', latex: String.raw`\min_i x_{ij}` },
      ],
      condition: { key: 'methods.common.forCostCriteria' },
    },
  ],
  sum: [
    {
      id: 'benefit',
      template: String.raw`{{n}} = \frac{ {{x}} }{ {{x_sum}} }`,
      terms: [
        { name: 'n', latex: 'n_{ij}' },
        { name: 'x', latex: 'x_{ij}' },
        { name: 'x_sum', latex: String.raw`\sum_i x_{ij}` },
      ],
      condition: { key: 'methods.common.forBenefitCriteria' },
    },
    {
      id: 'cost',
      template: String.raw`{{n}} = \frac{ 1 / {{x}} }{ {{x_sum}} }`,
      terms: [
        { name: 'n', latex: 'n_{ij}' },
        { name: 'x', latex: 'x_{ij}' },
        { name: 'x_sum', latex: String.raw`\sum_i 1 / x_{ij}` },
      ],
      condition: { key: 'methods.common.forCostCriteria' },
    },
  ],
};

export const weightedSumMethod = defineMethod({
  id: 'weighted-sum',
  version: '1.0.0',
  category: 'ranking',
  nameKey: 'methods.weightedSum.name',
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
  references: [],

  validate(input: WeightedSumInput) {
    const v = createValidation();
    // Positive values keep both the `max` (min / x) and the `sum` (1 / x) variants defined.
    v.add(
      checkCrispMatrix(input?.matrix, {
        sign: 'positive',
        constantCriterion: 'warning',
        supportedNumberTypes: ['crisp'],
      }),
    );
    if (!v.hasErrors) {
      v.add(
        checkCrispWeights(
          input.weights,
          input.matrix.criteria.map((criterion) => criterion.id),
        ),
      );
    }
    return v.result();
  },

  run(input: WeightedSumInput, params) {
    const { matrix, weights } = input;
    const variant: NormalizationVariant = params.normalization;
    const tb = createTraceBuilder({ methodId: 'weighted-sum', methodVersion: '1.0.0' });

    const x = tb.inputMatrix({
      id: 'initial-matrix',
      nameKey: 'methods.weightedSum.steps.initialMatrix.name',
      explanationKey: 'methods.weightedSum.steps.initialMatrix.explanation',
      matrix,
    });

    const w = tb.inputWeights({
      id: 'weights',
      nameKey: 'methods.weightedSum.steps.weights.name',
      explanationKey: 'methods.weightedSum.steps.weights.explanation',
      weights,
      criteria: matrix.criteria,
    });

    const normalizers = matrix.criteria.map((criterion: Criterion, j) =>
      createColumnNormalizer(variant, criterion.direction, x.column(j), {
        value: 'x',
        max: 'x_max',
        min: 'x_min',
        sum: 'x_sum',
      }),
    );
    const n = tb.table({
      id: 'normalized-matrix',
      nameKey: 'methods.weightedSum.steps.normalizedMatrix.name',
      explanationKey: 'methods.weightedSum.steps.normalizedMatrix.explanation',
      explanationParams: { variant },
      formulas: NORMALIZATION_FORMULAS[params.normalization],
      rows: x.rows,
      columns: x.columns,
      visualization: { view: 'matrix', basedOn: x.id },
      cell: (row, column) => {
        const normalizer = normalizers[column.index] as (typeof normalizers)[number];
        return {
          tracked: normalizer.normalize(x.cell(row.index, column.index)),
          formula: normalizer.direction,
        };
      },
    });

    const v = tb.table({
      id: 'weighted-matrix',
      nameKey: 'methods.weightedSum.steps.weightedMatrix.name',
      explanationKey: 'methods.weightedSum.steps.weightedMatrix.explanation',
      formulas: [
        {
          id: 'weighted',
          template: String.raw`{{v}} = {{n}} \cdot {{w}}`,
          terms: [
            { name: 'v', latex: 'v_{ij}' },
            { name: 'n', latex: 'n_{ij}' },
            { name: 'w', latex: 'w_j' },
          ],
        },
      ],
      rows: n.rows,
      columns: n.columns,
      visualization: { view: 'matrix', basedOn: n.id },
      cell: (row, column) =>
        crisp.multiply(term(n.cell(row.index, column.index), 'n'), term(w.at(column.index), 'w')),
    });

    const s = tb.columnVector({
      id: 'scores',
      role: 'result',
      nameKey: 'methods.weightedSum.steps.scores.name',
      explanationKey: 'methods.weightedSum.steps.scores.explanation',
      formulas: [
        {
          id: 'score',
          template: String.raw`{{S}} = \sum_{j} {{v}}`,
          terms: [
            { name: 'S', latex: 'S_i' },
            { name: 'v', latex: 'v_{ij}' },
          ],
        },
      ],
      items: v.rows,
      cell: (item) => crisp.sum(term(v.row(item.index), 'v')),
    });

    const ranks = crisp.rank(s.all());
    const r = tb.columnVector({
      id: 'ranking',
      role: 'result',
      nameKey: 'methods.weightedSum.steps.ranking.name',
      explanationKey: 'methods.weightedSum.steps.ranking.explanation',
      items: s.rows,
      visualization: { view: 'ranking', basedOn: s.id },
      cell: (item) => ranks[item.index] as (typeof ranks)[number],
    });

    const scores = s.values().map((cells) => cells[0] as number);
    const rankValues = r.values().map((cells) => cells[0] as number);
    const result: WeightedSumResult = {
      scores,
      ranking: matrix.alternatives.map((alternative, i) => ({
        alternativeId: alternative.id,
        score: scores[i] as number,
        rank: rankValues[i] as number,
      })),
    };
    return { result, trace: tb.build() };
  },
});

/**
 * LOPCOW: LOgarithmic Percentage Change-driven Objective Weighting (objective weights).
 *
 * Formulation: docs/methods/lopcow.md. Method by Ecer and Pamučar (2022); the equations and
 * the golden example come from Biswas, Pamučar, Dawn, Simic (2024), Eqs. 10-13 and Tables
 * 4-6. σ_j is the sample standard deviation: it is the convention that reproduces the
 * printed example (the population one does not).
 *
 * Steps: initial matrix → min-max normalized matrix r_ij (Eqs. 10-11) → mean squares
 * (1/m) Σ r_ij² → column means and deviations → sample standard deviations σ_j →
 * percentage values PV_j = |ln(√(mean square) / σ_j) · 100| (Eq. 12) → their sum → weights
 * w_j = PV_j / Σ PV (Eq. 13).
 */
import type {
  DecisionMatrix,
  Reference,
  ValidationCollector,
  WeightingResult,
} from '@mateo/engine';
import {
  checkCrispMatrix,
  constant,
  createTraceBuilder,
  createValidation,
  crisp,
  crispWeights,
  criterionAxis,
  defineMethod,
  NO_PARAMETERS,
  term,
} from '@mateo/engine';
import { FOR_BENEFIT, FOR_COST, formula, quantity } from '../src/common';

export const LOPCOW_ID = 'lopcow';
export const LOPCOW_VERSION = '1.0.0';

export const LOPCOW_ISSUE_CODES = {
  /** Every PV_j is 0, so the weights are 0 / 0. */
  zeroPercentageValues: 'lopcow.zero-percentage-values',
} as const;

/**
 * Fewer alternatives make every PV_j zero: with two alternatives each normalized column is
 * {0, 1}, whose root mean square equals its sample standard deviation.
 */
const MIN_ALTERNATIVES = 3;

export interface LopcowInput {
  readonly matrix: DecisionMatrix<number>;
}

export type LopcowResult = WeightingResult<number>;

export const LOPCOW_REFERENCES: readonly Reference[] = [
  {
    id: 'ecer2022',
    authors: ['Ecer, F.', 'Pamučar, D.'],
    year: 2022,
    title:
      'A novel LOPCOW-DOBI multi-criteria sustainability performance assessment methodology: An application in developing country banking sector',
    source: 'Omega',
    volume: '112',
    pages: '102690',
    doi: '10.1016/j.omega.2022.102690',
    note: 'Original paper of the method (paywalled, not read). The formulation follows biswas2024.',
  },
  {
    id: 'biswas2024',
    authors: ['Biswas, S.', 'Pamučar, D.', 'Dawn, S.', 'Simic, V.'],
    year: 2024,
    title:
      'Evaluation based on Relative Utility and Nonlinear Standardization (ERUNS) method for comparing firm performance in energy sector',
    source: 'Decision Making Advances',
    volume: '2',
    issue: '1',
    pages: '1-21',
    doi: '10.31181/dma21202419',
    note: 'Open-access restatement by the method’s second author: Eqs. 10-13 and Tables 4-6, used as the golden test.',
  },
];

const key = (path: string): string => `methods.lopcow.${path}`;
const step = (id: string) => ({
  id,
  nameKey: key(`steps.${id}.name`),
  explanationKey: key(`steps.${id}.explanation`),
});

/** Untraced PV_j, for validation only. */
function plainPercentageValues(matrix: DecisionMatrix<number>): number[] {
  const m = matrix.values.length;
  return matrix.criteria.map((criterion, j) => {
    const raw = matrix.values.map((row) => row[j] as number);
    const hi = Math.max(...raw);
    const lo = Math.min(...raw);
    const r = raw.map((x) =>
      criterion.direction === 'benefit' ? (x - lo) / (hi - lo) : (hi - x) / (hi - lo),
    );
    const meanSquare = r.reduce((a, x) => a + x * x, 0) / m;
    const mean = r.reduce((a, x) => a + x, 0) / m;
    const sigma = Math.sqrt(r.reduce((a, x) => a + (x - mean) ** 2, 0) / (m - 1));
    return Math.abs(Math.log(Math.sqrt(meanSquare) / sigma) * 100);
  });
}

function validateLopcow(input: LopcowInput, v: ValidationCollector) {
  v.add(
    checkCrispMatrix(input?.matrix, {
      sign: 'any',
      minAlternatives: MIN_ALTERNATIVES,
      minCriteria: 2,
      supportedNumberTypes: ['crisp'],
      constantCriterion: 'error',
    }),
  );
  if (v.hasErrors) return;
  const total = plainPercentageValues(input.matrix).reduce((a, b) => a + b, 0);
  // Round-off leaves a residue far below 1e-9 (PV is a percentage).
  if (!(total > 1e-9)) {
    v.error(LOPCOW_ISSUE_CODES.zeroPercentageValues, { location: { input: 'matrix' } });
  }
}

const NORM_TERMS = [
  ['r', 'r_{ij}'],
  ['x', 'x_{ij}'],
  ['x_max', String.raw`\max_i x_{ij}`],
  ['x_min', String.raw`\min_i x_{ij}`],
] as const;

export const lopcowMethod = defineMethod({
  id: LOPCOW_ID,
  version: LOPCOW_VERSION,
  category: 'weighting',
  nameKey: key('name'),
  supportedNumberTypes: ['crisp'],
  inputSchema: [
    { name: 'matrix', kind: 'decision-matrix', required: true, numberTypes: ['crisp'] },
  ],
  outputSchema: [{ name: 'weights', kind: 'weights', numberTypes: ['crisp'] }],
  parameters: NO_PARAMETERS,
  references: LOPCOW_REFERENCES,

  validate(input: LopcowInput) {
    const v = createValidation();
    validateLopcow(input, v);
    return v.result();
  },

  run(input: LopcowInput) {
    const { matrix } = input;
    const m = matrix.values.length;
    const tb = createTraceBuilder({ methodId: LOPCOW_ID, methodVersion: LOPCOW_VERSION });
    const x = tb.inputMatrix({ ...step('initial-matrix'), matrix });
    const criteria = criterionAxis(matrix.criteria);
    const alternatives = x.rows;

    // Column extremes, once per column: every cell of the column shares them.
    const bounds = criteria.map((_, j) => ({
      hi: term(crisp.max(x.column(j)), 'x_max'),
      lo: term(crisp.min(x.column(j)), 'x_min'),
    }));

    // Eqs. 10-11: min-max normalization, reversed for cost criteria.
    const r = tb.table<number>({
      ...step('normalized-matrix'),
      formulas: [
        formula(
          'benefit',
          String.raw`{{r}} = \frac{ {{x}} - {{x_min}} }{ {{x_max}} - {{x_min}} }`,
          NORM_TERMS,
          FOR_BENEFIT,
        ),
        formula(
          'cost',
          String.raw`{{r}} = \frac{ {{x_max}} - {{x}} }{ {{x_max}} - {{x_min}} }`,
          NORM_TERMS,
          FOR_COST,
        ),
      ],
      rows: alternatives,
      columns: criteria,
      visualization: { view: 'matrix', basedOn: x.id },
      cell: (row, column) => {
        const direction = matrix.criteria[column.index]!.direction;
        const value = term(x.cell(row.index, column.index), 'x');
        const { hi, lo } = bounds[column.index]!;
        const tracked =
          direction === 'benefit'
            ? crisp.divide(crisp.subtract(value, lo), crisp.subtract(hi, lo))
            : crisp.divide(crisp.subtract(hi, value), crisp.subtract(hi, lo));
        return { tracked, formula: direction };
      },
    });

    const meanSquares = tb.rowVector<number>({
      ...step('mean-squares'),
      formulas: [
        formula('mean-square', String.raw`{{q}} = \frac{1}{m} \sum_{i=1}^{m} {{r}}^2`, [
          ['q', String.raw`\overline{r_j^2}`],
          ['r', 'r_{ij}'],
          ['m', 'm'],
        ]),
      ],
      items: criteria,
      row: quantity('mean-square', key('rows.meanSquare')),
      cell: (column) =>
        crisp.divide(crisp.sumOfSquares(term(r.column(column.index), 'r')), constant(m, 'm')),
    });

    const means = tb.rowVector<number>({
      ...step('means'),
      formulas: [
        formula('mean', String.raw`{{mu}} = \frac{1}{m} \sum_{i=1}^{m} {{r}}`, [
          ['mu', String.raw`\bar{r}_j`],
          ['r', 'r_{ij}'],
        ]),
      ],
      items: criteria,
      cell: (column) => crisp.mean(term(r.column(column.index), 'r')),
    });

    // Deviations from the column mean, recorded once so σ_j references a whole column.
    const dev = tb.table<number>({
      ...step('deviations'),
      formulas: [
        formula('deviation', String.raw`{{d}} = {{r}} - {{mu}}`, [
          ['d', 'd_{ij}'],
          ['r', 'r_{ij}'],
          ['mu', String.raw`\bar{r}_j`],
        ]),
      ],
      rows: alternatives,
      columns: criteria,
      visualization: { view: 'matrix', basedOn: r.id },
      cell: (row, column) =>
        crisp.subtract(
          term(r.cell(row.index, column.index), 'r'),
          term(means.at(column.index), 'mu'),
        ),
    });

    // Sample standard deviation (divisor m − 1).
    const sigma = tb.rowVector<number>({
      ...step('standard-deviations'),
      formulas: [
        formula('sigma', String.raw`{{sigma}} = \sqrt{ \frac{1}{m - 1} \sum_{i=1}^{m} {{d}}^2 }`, [
          ['sigma', String.raw`\sigma_j`],
          ['d', 'd_{ij}'],
        ]),
      ],
      items: criteria,
      row: quantity('sigma', key('rows.sigma')),
      cell: (column) =>
        crisp.sqrt(crisp.divide(crisp.sumOfSquares(term(dev.column(column.index), 'd')), m - 1)),
    });

    // Eq. 12: PV_j = |ln(√(mean square) / σ_j) · 100|.
    const pv = tb.rowVector<number>({
      ...step('percentage-values'),
      formulas: [
        formula(
          'percentage-value',
          String.raw`{{PV}} = \left| \ln\!\left( \frac{ \sqrt{ {{q}} } }{ {{sigma}} } \right) \cdot 100 \right|`,
          [
            ['PV', 'PV_j'],
            ['q', String.raw`\overline{r_j^2}`],
            ['sigma', String.raw`\sigma_j`],
          ],
        ),
      ],
      items: criteria,
      row: quantity('pv', key('rows.percentageValue')),
      cell: (column) =>
        crisp.abs(
          crisp.multiply(
            crisp.ln(
              crisp.divide(
                crisp.sqrt(term(meanSquares.at(column.index), 'q')),
                term(sigma.at(column.index), 'sigma'),
              ),
            ),
            100,
          ),
        ),
    });

    const pvSum = tb.scalar<number>({
      ...step('percentage-value-sum'),
      formulas: [
        formula('sum', String.raw`{{S}} = \sum_{j=1}^{n} {{PV}}`, [
          ['S', String.raw`\sum_j PV_j`],
          ['PV', 'PV_j'],
        ]),
      ],
      value: crisp.sum(term(pv.all(), 'PV')),
    });

    // Eq. 13: w_j = PV_j / Σ PV.
    const weights = tb.rowVector<number>({
      ...step('weights'),
      role: 'result',
      formulas: [
        formula('weight', String.raw`{{w}} = \frac{ {{PV}} }{ {{S}} }`, [
          ['w', 'w_j'],
          ['PV', 'PV_j'],
          ['S', String.raw`\sum_j PV_j`],
        ]),
      ],
      items: criteria,
      row: quantity('w', key('rows.weight')),
      visualization: { view: 'bars', basedOn: pv.id },
      cell: (column) => crisp.divide(term(pv.at(column.index), 'PV'), term(pvSum.at(), 'S')),
    });

    const result: LopcowResult = {
      weights: crispWeights(
        matrix.criteria.map((criterion) => criterion.id),
        weights.values()[0] as number[],
      ),
    };
    return { result, trace: tb.build() };
  },
});

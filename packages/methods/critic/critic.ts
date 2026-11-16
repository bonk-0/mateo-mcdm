/**
 * CRITIC: CRiteria Importance Through Intercriteria Correlation (objective weights).
 *
 * Formulation: docs/methods/critic.md, from Diakoulaki, Mavrotas, Papayannakis (1995),
 * Eqs. 2-6. The paper prints population standard deviations and Pearson correlations;
 * Mateo does the same.
 *
 * Steps: initial matrix → normalized matrix (Eq. 2) → column means → standard deviations σ_j
 * → correlation matrix r_jk → conflict Σ(1 − r_jk) → information content C_j (Eq. 5) →
 * weights w_j (Eq. 6).
 */
import type {
  DecisionMatrix,
  Reference,
  ValidationCollector,
  WeightingResult,
  WeightVector,
} from '@mateo/engine';
import {
  checkCrispMatrix,
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

export const CRITIC_ID = 'critic';
export const CRITIC_VERSION = '1.0.0';

export const CRITIC_ISSUE_CODES = {
  /** Every C_j is 0 (for example two perfectly correlated criteria), so the weights are 0 / 0. */
  zeroInformation: 'critic.zero-information',
} as const;

export interface CriticInput {
  readonly matrix: DecisionMatrix<number>;
}

export type CriticResult = WeightingResult<number>;

export const CRITIC_REFERENCES: readonly Reference[] = [
  {
    id: 'diakoulaki1995',
    authors: ['Diakoulaki, D.', 'Mavrotas, G.', 'Papayannakis, L.'],
    year: 1995,
    title: 'Determining objective weights in multiple criteria problems: The CRITIC method',
    source: 'Computers & Operations Research',
    volume: '22',
    issue: '7',
    pages: '763-770',
    doi: '10.1016/0305-0548(94)00059-H',
    note: 'Original paper of the method: Eqs. 2-6 and the worked example, used as the golden test.',
  },
];

const key = (path: string): string => `methods.critic.${path}`;
const step = (id: string) => ({
  id,
  nameKey: key(`steps.${id}.name`),
  explanationKey: key(`steps.${id}.explanation`),
});

/** Untraced C_j, for validation only. */
function plainInformation(matrix: DecisionMatrix<number>): number[] {
  const n = matrix.values.length;
  const columns = matrix.criteria.map((criterion, j) => {
    const raw = matrix.values.map((row) => row[j] as number);
    const hi = Math.max(...raw);
    const lo = Math.min(...raw);
    return raw.map((x) =>
      criterion.direction === 'benefit' ? (x - lo) / (hi - lo) : (hi - x) / (hi - lo),
    );
  });
  const mean = columns.map((c) => c.reduce((a, b) => a + b, 0) / n);
  const dev = columns.map((c, j) => c.map((x) => x - (mean[j] as number)));
  const sigma = dev.map((d) => Math.sqrt(d.reduce((a, x) => a + x * x, 0) / n));
  return columns.map((_, j) => {
    let conflict = 0;
    columns.forEach((_k, k) => {
      const cov = (dev[j] as number[]).reduce((a, x, i) => a + x * (dev[k] as number[])[i]!, 0);
      conflict += 1 - cov / (n * (sigma[j] as number) * (sigma[k] as number));
    });
    return (sigma[j] as number) * conflict;
  });
}

function validateCritic(input: CriticInput, v: ValidationCollector) {
  v.add(
    checkCrispMatrix(input?.matrix, {
      sign: 'any',
      minAlternatives: 2,
      minCriteria: 2,
      supportedNumberTypes: ['crisp'],
      constantCriterion: 'error',
    }),
  );
  if (v.hasErrors) return;
  const total = plainInformation(input.matrix).reduce((a, b) => a + b, 0);
  // Round-off of two perfectly correlated criteria leaves a residue far below 1e-9.
  if (!(Math.abs(total) > 1e-9)) {
    v.error(CRITIC_ISSUE_CODES.zeroInformation, { location: { input: 'matrix' } });
  }
}

const SIGMA_TERMS = [
  ['sigma', String.raw`\sigma_j`],
  ['x', String.raw`x_{ij}`],
  ['mu', String.raw`\bar{x}_j`],
  ['n', 'n'],
] as const;

export const criticMethod = defineMethod({
  id: CRITIC_ID,
  version: CRITIC_VERSION,
  category: 'weighting',
  nameKey: key('name'),
  supportedNumberTypes: ['crisp'],
  inputSchema: [
    { name: 'matrix', kind: 'decision-matrix', required: true, numberTypes: ['crisp'] },
  ],
  outputSchema: [{ name: 'weights', kind: 'weights', numberTypes: ['crisp'] }],
  parameters: NO_PARAMETERS,
  references: CRITIC_REFERENCES,

  validate(input: CriticInput) {
    const v = createValidation();
    validateCritic(input, v);
    return v.result();
  },

  run(input: CriticInput) {
    const { matrix } = input;
    const n = matrix.values.length;
    const tb = createTraceBuilder({ methodId: CRITIC_ID, methodVersion: CRITIC_VERSION });
    const x = tb.inputMatrix({ ...step('initial-matrix'), matrix });
    const criteria = criterionAxis(matrix.criteria);
    const alternatives = x.rows;

    // Eq. 2: x_ij = (f_j(a_i) − f_j⁻) / (f_j* − f_j⁻).
    const norm = tb.table<number>({
      ...step('normalized-matrix'),
      formulas: [
        formula(
          'benefit',
          String.raw`{{r}} = \frac{ {{f}} - {{f_min}} }{ {{f_max}} - {{f_min}} }`,
          NORM_TERMS,
          FOR_BENEFIT,
        ),
        formula(
          'cost',
          String.raw`{{r}} = \frac{ {{f_max}} - {{f}} }{ {{f_max}} - {{f_min}} }`,
          NORM_TERMS,
          FOR_COST,
        ),
      ],
      rows: alternatives,
      columns: criteria,
      visualization: { view: 'matrix', basedOn: x.id },
      cell: (row, column) => {
        const direction = matrix.criteria[column.index]!.direction;
        const value = term(x.cell(row.index, column.index), 'f');
        const hi = term(crisp.max(x.column(column.index)), 'f_max');
        const lo = term(crisp.min(x.column(column.index)), 'f_min');
        const tracked =
          direction === 'benefit'
            ? crisp.divide(crisp.subtract(value, lo), crisp.subtract(hi, lo))
            : crisp.divide(crisp.subtract(hi, value), crisp.subtract(hi, lo));
        return { tracked, formula: direction };
      },
    });

    const mean = tb.rowVector<number>({
      ...step('means'),
      formulas: [
        formula('mean', String.raw`{{mu}} = \frac{1}{n} \sum_{i=1}^{n} {{x}}`, SIGMA_TERMS),
      ],
      items: criteria,
      cell: (column) => crisp.mean(term(norm.column(column.index), 'x')),
    });

    // Contrast intensity: population standard deviation of each normalized column.
    const sigma = tb.rowVector<number>({
      ...step('standard-deviations'),
      formulas: [
        formula(
          'sigma',
          String.raw`{{sigma}} = \sqrt{ \frac{1}{n} \sum_{i=1}^{n} ( {{x}} - {{mu}} )^2 }`,
          SIGMA_TERMS,
        ),
      ],
      items: criteria,
      cell: (column) => {
        const mu = term(mean.at(column.index), 'mu');
        const deviations = alternatives.map((_, i) =>
          crisp.subtract(term(norm.cell(i, column.index), 'x'), mu),
        );
        return crisp.sqrt(crisp.divide(crisp.sumOfSquares(deviations), n));
      },
    });

    // Conflict: Pearson correlation r_jk = Σ(x_ij − x̄_j)(x_ik − x̄_k) / (n σ_j σ_k).
    const r = tb.table<number>({
      ...step('correlation-matrix'),
      formulas: [
        formula(
          'pearson',
          String.raw`{{r}} = \frac{ \sum_{i=1}^{n} ( {{x_j}} - {{mu_j}} )( {{x_k}} - {{mu_k}} ) }{ n \, {{sigma_j}} \, {{sigma_k}} }`,
          [
            ['r', 'r_{jk}'],
            ['x_j', 'x_{ij}'],
            ['x_k', 'x_{ik}'],
            ['mu_j', String.raw`\bar{x}_j`],
            ['mu_k', String.raw`\bar{x}_k`],
            ['sigma_j', String.raw`\sigma_j`],
            ['sigma_k', String.raw`\sigma_k`],
            ['n', 'n'],
          ],
        ),
      ],
      rows: criteria,
      columns: criteria,
      visualization: { view: 'matrix', basedOn: norm.id },
      cell: (row, column) => {
        const products = alternatives.map((_, i) =>
          crisp.multiply(
            crisp.subtract(term(norm.cell(i, row.index), 'x_j'), term(mean.at(row.index), 'mu_j')),
            crisp.subtract(
              term(norm.cell(i, column.index), 'x_k'),
              term(mean.at(column.index), 'mu_k'),
            ),
          ),
        );
        return crisp.divide(
          crisp.sum(products),
          crisp.multiply(
            crisp.multiply(n, term(sigma.at(row.index), 'sigma_j')),
            term(sigma.at(column.index), 'sigma_k'),
          ),
        );
      },
    });

    const conflict = tb.rowVector<number>({
      ...step('conflict'),
      formulas: [
        formula('conflict', String.raw`{{c}} = \sum_{k=1}^{m} ( 1 - {{r}} )`, [
          ['c', String.raw`\sum_{k}(1 - r_{jk})`],
          ['r', 'r_{jk}'],
        ]),
      ],
      items: criteria,
      cell: (column) =>
        crisp.sum(criteria.map((_, k) => crisp.subtract(1, term(r.cell(column.index, k), 'r')))),
    });

    // Eq. 5: C_j = σ_j · Σ_k (1 − r_jk).
    const info = tb.rowVector<number>({
      ...step('information-content'),
      formulas: [
        formula('information', String.raw`{{C}} = {{sigma}} \cdot {{conflict}}`, [
          ['C', 'C_j'],
          ['sigma', String.raw`\sigma_j`],
          ['conflict', String.raw`\sum_{k}(1 - r_{jk})`],
        ]),
      ],
      items: criteria,
      cell: (column) =>
        crisp.multiply(
          term(sigma.at(column.index), 'sigma'),
          term(conflict.at(column.index), 'conflict'),
        ),
    });

    // Eq. 6: w_j = C_j / Σ_k C_k.
    const total = term(crisp.sum(info.all()), 'C_sum');
    const weights = tb.rowVector<number>({
      ...step('weights'),
      role: 'result',
      formulas: [
        formula('weight', String.raw`{{w}} = \frac{ {{C}} }{ {{C_sum}} }`, [
          ['w', 'w_j'],
          ['C', 'C_j'],
          ['C_sum', String.raw`\sum_{k=1}^{m} C_k`],
        ]),
      ],
      items: criteria,
      row: quantity('w', key('rows.weight')),
      visualization: { view: 'bars', basedOn: info.id },
      cell: (column) => crisp.divide(term(info.at(column.index), 'C'), total),
    });

    const result: CriticResult = {
      weights: crispWeights(
        matrix.criteria.map((criterion) => criterion.id),
        weights.values()[0] as number[],
      ) satisfies WeightVector,
    };
    return { result, trace: tb.build() };
  },
});

const NORM_TERMS = [
  ['r', 'x_{ij}'],
  ['f', 'f_j(a_i)'],
  ['f_max', String.raw`\max_i f_j(a_i)`],
  ['f_min', String.raw`\min_i f_j(a_i)`],
] as const;

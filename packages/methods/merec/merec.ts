/**
 * MEREC: MEthod based on the REmoval Effects of Criteria (objective weights).
 *
 * Formulation: docs/methods/merec.md, from Keshavarz-Ghorabaee et al. (2021), Eqs. 1-6.
 *
 * Steps: initial matrix → normalized matrix (Eq. 2, every criterion becomes a minimisation
 * criterion) → |ln n_ij| → overall performance S_i (Eq. 3) → performance with each criterion
 * removed S′_ij (Eq. 4) → removal effects E_j (Eq. 5) → weights w_j (Eq. 6).
 */
import type {
  DecisionMatrix,
  Reference,
  ValidationCollector,
  WeightingResult,
} from '@mateo/engine';
import {
  alternativeAxis,
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

export const MEREC_ID = 'merec';
export const MEREC_VERSION = '1.0.0';

export const MEREC_ISSUE_CODES = {
  /** Every removal effect E_j is 0 (for example identical alternatives): w_j = 0 / 0. */
  zeroRemovalEffects: 'merec.zero-removal-effects',
} as const;

export interface MerecInput {
  readonly matrix: DecisionMatrix<number>;
}

export type MerecResult = WeightingResult<number>;

export const MEREC_REFERENCES: readonly Reference[] = [
  {
    id: 'keshavarz2021',
    authors: [
      'Keshavarz-Ghorabaee, M.',
      'Amiri, M.',
      'Zavadskas, E. K.',
      'Turskis, Z.',
      'Antucheviciene, J.',
    ],
    year: 2021,
    title:
      'Determination of objective weights using a new method based on the removal effects of criteria (MEREC)',
    source: 'Symmetry',
    volume: '13',
    issue: '4',
    pages: '525',
    doi: '10.3390/sym13040525',
    note: 'Original paper of the method: Eqs. 1-6 and the illustrative example, used as the golden test.',
  },
];

const key = (path: string): string => `methods.merec.${path}`;
const step = (id: string) => ({
  id,
  nameKey: key(`steps.${id}.name`),
  explanationKey: key(`steps.${id}.explanation`),
});

/** Untraced E_j, for validation only. */
function plainEffects(matrix: DecisionMatrix<number>): number[] {
  const m = matrix.criteria.length;
  const logs = matrix.values.map((row) =>
    row.map((x, j) => {
      const col = matrix.values.map((r) => r[j] as number);
      const n =
        matrix.criteria[j]!.direction === 'benefit' ? Math.min(...col) / x : x / Math.max(...col);
      return Math.abs(Math.log(n));
    }),
  );
  const overall = logs.map((row) => Math.log(1 + row.reduce((a, b) => a + b, 0) / m));
  return matrix.criteria.map((_, j) =>
    logs.reduce((acc, row, i) => {
      const rest = row.reduce((a, b, k) => (k === j ? a : a + b), 0);
      return acc + Math.abs(Math.log(1 + rest / m) - (overall[i] as number));
    }, 0),
  );
}

function validateMerec(input: MerecInput, v: ValidationCollector) {
  v.add(
    checkCrispMatrix(input?.matrix, {
      // The logarithm needs x_ij > 0. Shifting the data is the user's explicit choice.
      sign: 'positive',
      minCriteria: 2,
      supportedNumberTypes: ['crisp'],
    }),
  );
  if (v.hasErrors) return;
  const total = plainEffects(input.matrix).reduce((a, b) => a + b, 0);
  if (!(total > 1e-12)) {
    v.error(MEREC_ISSUE_CODES.zeroRemovalEffects, { location: { input: 'matrix' } });
  }
}

export const merecMethod = defineMethod({
  id: MEREC_ID,
  version: MEREC_VERSION,
  category: 'weighting',
  nameKey: key('name'),
  supportedNumberTypes: ['crisp'],
  inputSchema: [
    { name: 'matrix', kind: 'decision-matrix', required: true, numberTypes: ['crisp'] },
  ],
  outputSchema: [{ name: 'weights', kind: 'weights', numberTypes: ['crisp'] }],
  parameters: NO_PARAMETERS,
  references: MEREC_REFERENCES,

  validate(input: MerecInput) {
    const v = createValidation();
    validateMerec(input, v);
    return v.result();
  },

  run(input: MerecInput) {
    const { matrix } = input;
    const m = matrix.criteria.length;
    const tb = createTraceBuilder({ methodId: MEREC_ID, methodVersion: MEREC_VERSION });
    const x = tb.inputMatrix({ ...step('initial-matrix'), matrix });
    const alternatives = alternativeAxis(matrix.alternatives);
    const criteria = criterionAxis(matrix.criteria);

    // Eq. 2: n_ij = min_k x_kj / x_ij (benefit), n_ij = x_ij / max_k x_kj (cost).
    const n = tb.table<number>({
      ...step('normalized-matrix'),
      formulas: [
        formula(
          'benefit',
          String.raw`{{n}} = \frac{ \min_k {{x_k}} }{ {{x}} }`,
          NORM_TERMS,
          FOR_BENEFIT,
        ),
        formula('cost', String.raw`{{n}} = \frac{ {{x}} }{ \max_k {{x_k}} }`, NORM_TERMS, FOR_COST),
      ],
      rows: alternatives,
      columns: criteria,
      visualization: { view: 'matrix', basedOn: x.id },
      cell: (row, column) => {
        const direction = matrix.criteria[column.index]!.direction;
        const value = term(x.cell(row.index, column.index), 'x');
        const column_ = term(x.column(column.index), 'x_k');
        return direction === 'benefit'
          ? { tracked: crisp.divide(crisp.min(column_), value), formula: 'benefit' }
          : { tracked: crisp.divide(value, crisp.max(column_)), formula: 'cost' };
      },
    });

    // |ln n_ij|, the building block of Eqs. 3-4.
    const logs = tb.table<number>({
      ...step('absolute-logs'),
      formulas: [
        formula('abs-ln', String.raw`{{a}} = \left| \ln {{n}} \right|`, [
          ['a', String.raw`\left| \ln n_{ij} \right|`],
          ['n', 'n_{ij}'],
        ]),
      ],
      rows: alternatives,
      columns: criteria,
      visualization: { view: 'matrix', basedOn: n.id },
      cell: (row, column) => crisp.abs(crisp.ln(term(n.cell(row.index, column.index), 'n'))),
    });

    // Eq. 3: S_i = ln(1 + (1/m) Σ_j |ln n_ij|).
    const s = tb.columnVector<number>({
      ...step('overall-performance'),
      formulas: [
        formula(
          'overall',
          String.raw`{{S}} = \ln \left( 1 + \frac{1}{m} \sum_{j=1}^{m} {{a}} \right)`,
          [
            ['S', 'S_i'],
            ['a', String.raw`\left| \ln n_{ij} \right|`],
          ],
        ),
      ],
      items: alternatives,
      column: quantity('S', key('columns.S')),
      cell: (item) =>
        crisp.ln(crisp.add(1, crisp.divide(crisp.sum(term(logs.row(item.index), 'a')), m))),
    });

    // Eq. 4: S′_ij = ln(1 + (1/m) Σ_{k≠j} |ln n_ik|). The divisor stays m.
    const sPrime = tb.table<number>({
      ...step('removal-performance'),
      formulas: [
        formula(
          'removal',
          String.raw`{{S_r}} = \ln \left( 1 + \frac{1}{m} \sum_{k \neq j} {{a}} \right)`,
          [
            ['S_r', String.raw`S'_{ij}`],
            ['a', String.raw`\left| \ln n_{ik} \right|`],
          ],
        ),
      ],
      rows: alternatives,
      columns: criteria,
      visualization: { view: 'matrix', basedOn: logs.id },
      cell: (row, column) => {
        const others = criteria
          .map((_, k) => k)
          .filter((k) => k !== column.index)
          .map((k) => term(logs.cell(row.index, k), 'a'));
        return crisp.ln(crisp.add(1, crisp.divide(crisp.sum(others), m)));
      },
    });

    // Eq. 5: E_j = Σ_i |S′_ij − S_i|.
    const effects = tb.rowVector<number>({
      ...step('removal-effects'),
      formulas: [
        formula('effect', String.raw`{{E}} = \sum_{i=1}^{n} \left| {{S_r}} - {{S}} \right|`, [
          ['E', 'E_j'],
          ['S_r', String.raw`S'_{ij}`],
          ['S', 'S_i'],
        ]),
      ],
      items: criteria,
      cell: (column) =>
        crisp.sum(
          alternatives.map((_, i) =>
            crisp.abs(
              crisp.subtract(term(sPrime.cell(i, column.index), 'S_r'), term(s.at(i), 'S')),
            ),
          ),
        ),
    });

    // Eq. 6: w_j = E_j / Σ_k E_k. E is not rounded before dividing.
    const total = term(crisp.sum(effects.all()), 'E_sum');
    const weights = tb.rowVector<number>({
      ...step('weights'),
      role: 'result',
      formulas: [
        formula('weight', String.raw`{{w}} = \frac{ {{E}} }{ {{E_sum}} }`, [
          ['w', 'w_j'],
          ['E', 'E_j'],
          ['E_sum', String.raw`\sum_{k=1}^{m} E_k`],
        ]),
      ],
      items: criteria,
      row: quantity('w', key('rows.weight')),
      visualization: { view: 'bars', basedOn: effects.id },
      cell: (column) => crisp.divide(term(effects.at(column.index), 'E'), total),
    });

    const result: MerecResult = {
      weights: crispWeights(
        matrix.criteria.map((criterion) => criterion.id),
        weights.values()[0] as number[],
      ),
    };
    return { result, trace: tb.build() };
  },
});

const NORM_TERMS = [
  ['n', 'n_{ij}'],
  ['x', 'x_{ij}'],
  ['x_k', 'x_{kj}'],
] as const;

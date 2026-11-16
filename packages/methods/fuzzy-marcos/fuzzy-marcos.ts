/**
 * Fuzzy MARCOS with triangular fuzzy numbers.
 *
 * Formulation: docs/methods/fuzzy-marcos.md, from Stanković et al. (2020), Section 3,
 * Eqs. 19-32. Every step follows the paper; the only choice the paper leaves open is the
 * defuzzification of K̃_i⁻, K̃_i⁺, f(K̃_i⁻), f(K̃_i⁺) ("perform defuzzification"), which is a
 * parameter whose default, the graded mean, reproduces every printed value.
 *
 * Steps (docs/plan.md §8.3): initial matrix → weights → [normalized weights] → extended
 * matrix with the anti-ideal (AAI) and ideal (ID) rows → normalized matrix → weighted
 * matrix → sums S̃_i → utility degrees K̃_i⁻, K̃_i⁺ → T̃_i = K̃_i⁻ ⊕ K̃_i⁺ → D̃ = max T̃_i →
 * df_crisp → fuzzy utility functions → defuzzification → final utility f(K_i) → ranking.
 */
import type {
  DecisionMatrix,
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
  checkCrispWeights,
  createTraceBuilder,
  createValidation,
  crisp,
  defineMethod,
  defineParameters,
  ISSUE_CODES,
  term,
} from '@mateo/engine';
import type { DefuzzificationId, TFN } from '@mateo/fuzzy';
import { checkTfnMatrix, checkTfnWeights, encodeTfn, fromCrisp, tfnOps } from '@mateo/fuzzy';
import { FINAL_UTILITY_FORMULA, MARCOS_REFERENCES, finalUtility } from '../marcos/marcos';
import { FOR_BENEFIT, FOR_COST, formula, quantity, referenceRow } from '../src/common';

export const FUZZY_MARCOS_ID = 'fuzzy-marcos';
export const FUZZY_MARCOS_VERSION = '1.0.0';

/** Row ids of the reference solutions in the trace, as in the paper: Ã(AI) is written AAI. */
export const FUZZY_MARCOS_ANTI_IDEAL = 'AAI';
export const FUZZY_MARCOS_IDEAL = 'ID';

export const FUZZY_MARCOS_ISSUE_CODES = {
  /** An alternative id equals the id of the anti-ideal or ideal row. */
  reservedAlternativeId: 'fuzzy-marcos.reserved-alternative-id',
  /** The weights are neither crisp nor TFN. */
  unsupportedWeights: 'fuzzy-marcos.unsupported-weights',
  /** A cost criterion has a TFN with l = 0: x^l_id / x^l_ij divides by it. */
  zeroCostValue: 'fuzzy-marcos.zero-cost-value',
  /** The u component of the ideal of a benefit criterion is 0. */
  zeroIdealValue: 'fuzzy-marcos.zero-ideal-value',
  /** S̃ of the anti-ideal has a zero component, so K̃_i⁻ is undefined. */
  zeroAntiIdealSum: 'fuzzy-marcos.zero-anti-ideal-sum',
  /** S̃ of the ideal has a zero component, so K̃_i⁺ is undefined. */
  zeroIdealSum: 'fuzzy-marcos.zero-ideal-sum',
  /** S̃_i of an alternative is (0, 0, 0), so its utility functions are 0 and f(K_i) is undefined. */
  zeroSum: 'fuzzy-marcos.zero-sum',
  /** `normalizeWeights` is set but the weights are TFNs, which have no unique normalization. */
  normalizeFuzzyWeights: 'fuzzy-marcos.normalize-fuzzy-weights',
} as const;

/**
 * Weights may be TFNs (the paper's case) or crisp numbers, which enter Eq. 24 as the
 * degenerate TFN (w, w, w): ṽ_ij = (n^l·w, n^m·w, n^u·w).
 */
export type FuzzyMarcosWeights = WeightVector<TFN> | WeightVector<number>;

export interface FuzzyMarcosInput {
  readonly matrix: DecisionMatrix<TFN>;
  readonly weights: FuzzyMarcosWeights;
}

export interface FuzzyMarcosResult {
  /** Final utility f(K_i) of every alternative, in input order. */
  readonly scores: readonly number[];
  readonly ranking: readonly { alternativeId: string; score: number; rank: number }[];
}

const parameters = defineParameters({
  defuzzification: {
    type: 'enum',
    labelKey: 'methods.fuzzyMarcos.parameters.defuzzification.label',
    descriptionKey: 'methods.fuzzyMarcos.parameters.defuzzification.description',
    default: 'graded-mean',
    options: [
      {
        value: 'graded-mean',
        labelKey: 'methods.fuzzyMarcos.parameters.defuzzification.gradedMean',
      },
      { value: 'centroid', labelKey: 'methods.fuzzyMarcos.parameters.defuzzification.centroid' },
    ],
  },
  normalizeWeights: {
    type: 'boolean',
    labelKey: 'methods.fuzzyMarcos.parameters.normalizeWeights.label',
    descriptionKey: 'methods.fuzzyMarcos.parameters.normalizeWeights.description',
    default: false,
  },
});

export const FUZZY_MARCOS_REFERENCES: readonly Reference[] = [
  {
    ...(MARCOS_REFERENCES.find((reference) => reference.id === 'stankovic2020') as Reference),
    note: 'Original paper of the method: Section 3, Eqs. 19-32, and the worked example of Section 4, used as the golden test.',
  },
];

const key = (path: string): string => `methods.fuzzyMarcos.${path}`;
const step = (id: string) => ({
  id,
  nameKey: key(`steps.${id}.name`),
  explanationKey: key(`steps.${id}.explanation`),
});

const isTfnWeights = (weights: FuzzyMarcosWeights): weights is WeightVector<TFN> =>
  weights.numberType === 'tfn';

// ---------------------------------------------------------------- validation

const mul = (a: TFN, b: TFN): TFN => ({ l: a.l * b.l, m: a.m * b.m, u: a.u * b.u });
const add = (a: TFN, b: TFN): TFN => ({ l: a.l + b.l, m: a.m + b.m, u: a.u + b.u });

/** Untraced S̃ of the anti-ideal, the ideal and every alternative, for validation only. */
function plainSums(matrix: DecisionMatrix<TFN>, weights: readonly TFN[]) {
  const columns = matrix.criteria.map((criterion, j) => {
    const values = matrix.values.map((row) => row[j] as TFN);
    const pick = (fn: (...xs: number[]) => number): TFN => ({
      l: fn(...values.map((x) => x.l)),
      m: fn(...values.map((x) => x.m)),
      u: fn(...values.map((x) => x.u)),
    });
    const benefit = criterion.direction === 'benefit';
    const best = benefit ? pick(Math.max) : pick(Math.min);
    const worst = benefit ? pick(Math.min) : pick(Math.max);
    const normalize = (x: TFN): TFN =>
      benefit
        ? { l: x.l / best.u, m: x.m / best.u, u: x.u / best.u }
        : { l: best.l / x.u, m: best.l / x.m, u: best.l / x.l };
    return { best, worst, normalize };
  });
  const sumOf = (row: readonly TFN[]): TFN =>
    row.reduce<TFN>((acc, x, j) => add(acc, mul(columns[j]!.normalize(x), weights[j]!)), {
      l: 0,
      m: 0,
      u: 0,
    });
  return {
    antiIdeal: sumOf(columns.map((column) => column.worst)),
    ideal: sumOf(columns.map((column) => column.best)),
    alternatives: matrix.values.map(sumOf),
  };
}

const hasZero = (x: TFN): boolean => x.l === 0 || x.m === 0 || x.u === 0;

function validateFuzzyMarcos(
  input: FuzzyMarcosInput,
  normalizeWeights: boolean,
  v: ValidationCollector,
): void {
  v.add(checkTfnMatrix(input?.matrix, { sign: 'non-negative', supportedNumberTypes: ['tfn'] }));
  if (v.hasErrors) return;
  const { matrix } = input;

  matrix.alternatives.forEach((alternative, index) => {
    if (alternative.id === FUZZY_MARCOS_ANTI_IDEAL || alternative.id === FUZZY_MARCOS_IDEAL) {
      v.error(FUZZY_MARCOS_ISSUE_CODES.reservedAlternativeId, {
        params: { id: alternative.id },
        location: { input: 'matrix', row: { index, id: alternative.id } },
      });
    }
  });
  matrix.criteria.forEach((criterion, j) => {
    const column = { index: j, id: criterion.id };
    if (criterion.direction === 'cost') {
      matrix.values.forEach((row, i) => {
        if ((row[j] as TFN).l === 0) {
          const alternative = matrix.alternatives[i]!;
          v.error(FUZZY_MARCOS_ISSUE_CODES.zeroCostValue, {
            params: { id: criterion.id },
            location: { input: 'matrix', row: { index: i, id: alternative.id }, column },
          });
        }
      });
    } else if (matrix.values.every((row) => (row[j] as TFN).u === 0)) {
      v.error(FUZZY_MARCOS_ISSUE_CODES.zeroIdealValue, {
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
      v.error(FUZZY_MARCOS_ISSUE_CODES.normalizeFuzzyWeights, {
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
    v.error(FUZZY_MARCOS_ISSUE_CODES.unsupportedWeights, {
      params: { numberType: String(numberType) },
      location: { input: 'weights' },
    });
  } else {
    v.error(ISSUE_CODES.inputMalformed, {
      params: { input: 'weights' },
      location: { input: 'weights' },
    });
  }
  if (v.hasErrors) return;

  const aligned = alignWeights<TFN | number>(input.weights, criterionIds).map((w) =>
    typeof w === 'number' ? fromCrisp(w) : (w as TFN),
  );
  const sums = plainSums(matrix, aligned);
  if (hasZero(sums.antiIdeal)) {
    v.error(FUZZY_MARCOS_ISSUE_CODES.zeroAntiIdealSum, { location: { input: 'matrix' } });
  }
  if (hasZero(sums.ideal)) {
    v.error(FUZZY_MARCOS_ISSUE_CODES.zeroIdealSum, { location: { input: 'matrix' } });
  }
  sums.alternatives.forEach((sum, i) => {
    if (sum.u === 0) {
      const alternative = matrix.alternatives[i]!;
      v.error(FUZZY_MARCOS_ISSUE_CODES.zeroSum, {
        location: { input: 'matrix', row: { index: i, id: alternative.id } },
      });
    }
  });
}

// ---------------------------------------------------------------- method

export const fuzzyMarcosMethod = defineMethod({
  id: FUZZY_MARCOS_ID,
  version: FUZZY_MARCOS_VERSION,
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
  references: FUZZY_MARCOS_REFERENCES,

  validate(input: FuzzyMarcosInput, params) {
    const v = createValidation();
    validateFuzzyMarcos(input, params.normalizeWeights, v);
    return v.result();
  },

  run(input: FuzzyMarcosInput, params) {
    const { matrix } = input;
    const defuzzification: DefuzzificationId = params.defuzzification;
    const tb = createTraceBuilder({
      methodId: FUZZY_MARCOS_ID,
      methodVersion: FUZZY_MARCOS_VERSION,
    });

    const x = tb.inputMatrix<TFN>({ ...step('initial-matrix'), matrix, encode: encodeTfn });

    // Eq. 24 with TFN weights (n^l·w^l, n^m·w^m, n^u·w^u), or with crisp weights
    // (n^l·w, n^m·w, n^u·w), which is the same product with the degenerate TFN (w, w, w).
    let weightOf: (column: number) => Tracked<TFN> | Tracked<number>;
    let fuzzyWeights = false;
    const weights = input.weights;
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
      const inputWeights = tb.inputWeights<number>({
        ...step('weights'),
        weights,
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
      weightOf = (j) => w.at(j);
    }

    // Eqs. 19-21: component-wise minimum and maximum.
    const antiIdeal = matrix.criteria.map((criterion, j) => {
      const column = term(x.column(j), 'x');
      return criterion.direction === 'benefit' ? tfnOps.min(column) : tfnOps.max(column);
    });
    const ideal = matrix.criteria.map((criterion, j) => {
      const column = term(x.column(j), 'x');
      return criterion.direction === 'benefit' ? tfnOps.max(column) : tfnOps.min(column);
    });
    const alternatives = alternativeAxis(matrix.alternatives);
    const extendedRows: TraceAxisItem[] = [
      referenceRow(FUZZY_MARCOS_ANTI_IDEAL, key('rows.antiIdeal')),
      ...alternatives,
      referenceRow(FUZZY_MARCOS_IDEAL, key('rows.ideal')),
    ];
    const last = extendedRows.length - 1;
    const ext = tb.table<TFN>({
      ...step('extended-matrix'),
      formulas: [
        formula('anti-ideal-benefit', String.raw`{{x_ai}} = \min_i {{x}}`, EXT_TERMS, FOR_BENEFIT),
        formula('anti-ideal-cost', String.raw`{{x_ai}} = \max_i {{x}}`, EXT_TERMS, FOR_COST),
        formula('ideal-benefit', String.raw`{{x_id}} = \max_i {{x}}`, EXT_TERMS, FOR_BENEFIT),
        formula('ideal-cost', String.raw`{{x_id}} = \min_i {{x}}`, EXT_TERMS, FOR_COST),
      ],
      rows: extendedRows,
      columns: x.columns,
      visualization: {
        view: 'matrix',
        basedOn: x.id,
        highlightRows: [FUZZY_MARCOS_ANTI_IDEAL, FUZZY_MARCOS_IDEAL],
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

    // Eqs. 22-23: every component is divided by one number of the ideal.
    const idealLower = matrix.criteria.map((_, j) =>
      term(tfnOps.lower(ext.cell(FUZZY_MARCOS_IDEAL, j)), 'x_id_l'),
    );
    const idealUpper = matrix.criteria.map((_, j) =>
      term(tfnOps.upper(ext.cell(FUZZY_MARCOS_IDEAL, j)), 'x_id_u'),
    );
    const n = tb.table<TFN>({
      ...step('normalized-matrix'),
      formulas: [
        formula(
          'benefit',
          String.raw`{{n}} = \left( \frac{x^l_{ij}}{ {{x_id_u}} }, \frac{x^m_{ij}}{ {{x_id_u}} }, \frac{x^u_{ij}}{ {{x_id_u}} } \right), \; {{x}} = (x^l_{ij}, x^m_{ij}, x^u_{ij})`,
          NORM_TERMS_BENEFIT,
          FOR_BENEFIT,
        ),
        formula(
          'cost',
          String.raw`{{n}} = \left( \frac{ {{x_id_l}} }{x^u_{ij}}, \frac{ {{x_id_l}} }{x^m_{ij}}, \frac{ {{x_id_l}} }{x^l_{ij}} \right), \; {{x}} = (x^l_{ij}, x^m_{ij}, x^u_{ij})`,
          NORM_TERMS_COST,
          FOR_COST,
        ),
      ],
      rows: ext.rows,
      columns: ext.columns,
      visualization: { view: 'matrix', basedOn: ext.id },
      cell: (row, column) => {
        const value = term(ext.cell(row.index, column.index), 'x');
        return matrix.criteria[column.index]!.direction === 'benefit'
          ? { tracked: tfnOps.divideByScalar(value, idealUpper[column.index]!), formula: 'benefit' }
          : { tracked: tfnOps.scalarDividedBy(idealLower[column.index]!, value), formula: 'cost' };
      },
    });

    const v = tb.table<TFN>({
      ...step('weighted-matrix'),
      formulas: [
        formula('weighted', String.raw`{{v}} = {{n}} \otimes {{w}}`, [
          ['v', String.raw`\tilde{v}_{ij}`],
          ['n', String.raw`\tilde{n}_{ij}`],
          ['w', fuzzyWeights ? String.raw`\tilde{w}_j` : 'w_j'],
        ]),
      ],
      rows: n.rows,
      columns: n.columns,
      visualization: { view: 'matrix', basedOn: n.id },
      cell: (row, column) => {
        const value = term(n.cell(row.index, column.index), 'n');
        const weight = weightOf(column.index);
        return fuzzyWeights
          ? tfnOps.multiply(value, term(weight as Tracked<TFN>, 'w'))
          : tfnOps.multiplyByScalar(value, term(weight as Tracked<number>, 'w'));
      },
    });

    // Eq. 25: S̃_i = Σ_j ṽ_ij, for every row including AAI and ID.
    const s = tb.columnVector<TFN>({
      ...step('sums'),
      formulas: [
        formula('sum', String.raw`{{S}} = \sum_{j=1}^{n} {{v}}`, [
          ['S', String.raw`\tilde{S}_i`],
          ['v', String.raw`\tilde{v}_{ij}`],
        ]),
      ],
      items: v.rows,
      column: quantity('S', key('columns.S')),
      cell: (item) => tfnOps.sum(term(v.row(item.index), 'v')),
    });

    // Eqs. 26-27: K̃_i⁻ = S̃_i ⊘ S̃_ai, K̃_i⁺ = S̃_i ⊘ S̃_id.
    const k = tb.table<TFN>({
      ...step('utility-degrees'),
      formulas: [
        formula('k-minus', String.raw`{{K_minus}} = {{S}} \oslash {{S_ai}}`, [
          ['K_minus', String.raw`\tilde{K}_i^-`],
          ['S', String.raw`\tilde{S}_i`],
          ['S_ai', String.raw`\tilde{S}_{ai}`],
        ]),
        formula('k-plus', String.raw`{{K_plus}} = {{S}} \oslash {{S_id}}`, [
          ['K_plus', String.raw`\tilde{K}_i^+`],
          ['S', String.raw`\tilde{S}_i`],
          ['S_id', String.raw`\tilde{S}_{id}`],
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
              tracked: tfnOps.divide(own, term(s.at(FUZZY_MARCOS_ANTI_IDEAL), 'S_ai')),
              formula: 'k-minus',
            }
          : {
              tracked: tfnOps.divide(own, term(s.at(FUZZY_MARCOS_IDEAL), 'S_id')),
              formula: 'k-plus',
            };
      },
    });

    // Eq. 28: T̃_i = K̃_i⁻ ⊕ K̃_i⁺.
    const t = tb.columnVector<TFN>({
      ...step('utility-degree-sums'),
      formulas: [
        formula('t', String.raw`{{T}} = {{K_minus}} \oplus {{K_plus}}`, [
          ['T', String.raw`\tilde{T}_i`],
          ['K_minus', String.raw`\tilde{K}_i^-`],
          ['K_plus', String.raw`\tilde{K}_i^+`],
        ]),
      ],
      items: alternatives,
      column: quantity('T', key('columns.T')),
      cell: (item) =>
        tfnOps.add(
          term(k.cell(item.index, 'k-minus'), 'K_minus'),
          term(k.cell(item.index, 'k-plus'), 'K_plus'),
        ),
    });

    // Eq. 29: D̃ = max_i T̃_i, component-wise.
    const d = tb.scalar<TFN>({
      ...step('max-utility-degree-sum'),
      formulas: [
        formula('d', String.raw`{{D}} = \max_i {{T}}`, [
          ['D', String.raw`\tilde{D}`],
          ['T', String.raw`\tilde{T}_i`],
        ]),
      ],
      value: tfnOps.max(term(t.all(), 'T')),
    });

    // df_crisp = (d^l + 4 d^m + d^u) / 6, as printed in the paper (not a parameter).
    const df = tb.scalar<number>({
      ...step('max-utility-degree-sum-crisp'),
      formulas: [
        formula(
          'df',
          String.raw`{{df}} = \frac{d^l + 4 d^m + d^u}{6}, \; {{D}} = (d^l, d^m, d^u)`,
          [
            ['df', String.raw`df_{crisp}`],
            ['D', String.raw`\tilde{D}`],
          ],
        ),
      ],
      value: tfnOps.gradedMean(term(d.at(), 'D')),
    });

    // Eqs. 30-31: f(K̃_i⁺) = K̃_i⁻ / df_crisp, f(K̃_i⁻) = K̃_i⁺ / df_crisp.
    const f = tb.table<TFN>({
      ...step('utility-functions'),
      formulas: [
        formula('f-k-minus', String.raw`{{f_minus}} = \frac{ {{K_plus}} }{ {{df}} }`, [
          ['f_minus', String.raw`f(\tilde{K}_i^-)`],
          ['K_plus', String.raw`\tilde{K}_i^+`],
          ['df', String.raw`df_{crisp}`],
        ]),
        formula('f-k-plus', String.raw`{{f_plus}} = \frac{ {{K_minus}} }{ {{df}} }`, [
          ['f_plus', String.raw`f(\tilde{K}_i^+)`],
          ['K_minus', String.raw`\tilde{K}_i^-`],
          ['df', String.raw`df_{crisp}`],
        ]),
      ],
      rows: alternatives,
      columns: [
        quantity('f-k-minus', key('columns.fKMinus')),
        quantity('f-k-plus', key('columns.fKPlus')),
      ],
      visualization: { view: 'matrix', basedOn: k.id },
      cell: (row, column) => {
        const divisor = term(df.at(), 'df');
        return column.index === 0
          ? {
              tracked: tfnOps.divideByScalar(term(k.cell(row.index, 'k-plus'), 'K_plus'), divisor),
              formula: 'f-k-minus',
            }
          : {
              tracked: tfnOps.divideByScalar(
                term(k.cell(row.index, 'k-minus'), 'K_minus'),
                divisor,
              ),
              formula: 'f-k-plus',
            };
      },
    });

    // "Perform defuzzification" of K̃_i⁻, K̃_i⁺, f(K̃_i⁻), f(K̃_i⁺) (Table 6).
    const DEFUZZIFIED = [
      { id: 'k-minus', label: 'columns.kMinus', from: k, column: 'k-minus' },
      { id: 'k-plus', label: 'columns.kPlus', from: k, column: 'k-plus' },
      { id: 'f-k-minus', label: 'columns.fKMinus', from: f, column: 'f-k-minus' },
      { id: 'f-k-plus', label: 'columns.fKPlus', from: f, column: 'f-k-plus' },
    ] as const;
    const crispValues = tb.table<number>({
      ...step('defuzzification'),
      explanationParams: { defuzzification },
      formulas: [
        defuzzification === 'graded-mean'
          ? formula(
              'defuzzify',
              String.raw`{{a}} = \frac{l + 4m + u}{6}, \; {{A}} = (l, m, u)`,
              DEFUZZ_TERMS,
            )
          : formula(
              'defuzzify',
              String.raw`{{a}} = \frac{l + m + u}{3}, \; {{A}} = (l, m, u)`,
              DEFUZZ_TERMS,
            ),
      ],
      rows: alternatives,
      columns: DEFUZZIFIED.map((entry) => quantity(entry.id, key(entry.label))),
      visualization: { view: 'matrix', basedOn: f.id },
      cell: (row, column) => {
        const entry = DEFUZZIFIED[column.index]!;
        return tfnOps.defuzzify(
          defuzzification,
          term(entry.from.cell(row.index, entry.column), 'A'),
        );
      },
    });

    // Eq. 32 on the crisp values.
    const utility = tb.columnVector<number>({
      ...step('final-utility'),
      role: 'result',
      formulas: [FINAL_UTILITY_FORMULA],
      items: alternatives,
      column: quantity('f-k', key('columns.fK')),
      cell: (item) =>
        finalUtility(
          term(crispValues.cell(item.index, 'k-minus'), 'K_minus'),
          term(crispValues.cell(item.index, 'k-plus'), 'K_plus'),
          term(crispValues.cell(item.index, 'f-k-minus'), 'f_minus'),
          term(crispValues.cell(item.index, 'f-k-plus'), 'f_plus'),
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
    const result: FuzzyMarcosResult = {
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
  ['x', String.raw`\tilde{x}_{ij}`],
  ['x_ai', String.raw`\tilde{x}_{ai,j}`],
  ['x_id', String.raw`\tilde{x}_{id,j}`],
] as const;

const NORM_TERMS_BENEFIT = [
  ['n', String.raw`\tilde{n}_{ij}`],
  ['x', String.raw`\tilde{x}_{ij}`],
  ['x_id_u', String.raw`x^u_{id}`],
] as const;

const NORM_TERMS_COST = [
  ['n', String.raw`\tilde{n}_{ij}`],
  ['x', String.raw`\tilde{x}_{ij}`],
  ['x_id_l', String.raw`x^l_{id}`],
] as const;

const DEFUZZ_TERMS = [
  ['a', 'a'],
  ['A', String.raw`\tilde{A}`],
] as const;

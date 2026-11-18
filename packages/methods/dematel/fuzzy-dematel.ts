/**
 * Fuzzy DEMATEL with triangular fuzzy numbers.
 *
 * Formulation: docs/methods/dematel.md, "Fuzzy DEMATEL", after Lin, Wu (2008): the
 * linguistic judgements are TFNs, the experts' matrices are averaged, the normalized
 * fuzzy matrix is split into its l, m and u matrices and T is computed for each separately
 * (T_l = X_l (I − X_l)⁻¹, and so on); the fuzzy D + R and D − R are defuzzified.
 *
 * NOT VERIFIED against a published example (the paper is paywalled and the open-access
 * example that was tried does not reproduce from its printed tables). The method is held to
 * its properties instead: a crisp input (l = m = u) gives exactly the classical result and
 * l ≤ m ≤ u holds in every table. See docs/methods/dematel.md.
 *
 * Steps: Z̃ → s from the upper components → X̃ → (I − X̃)⁻¹ → T̃ → D̃, R̃ → D̃ + R̃, D̃ − R̃ →
 * defuzzified T and D + R, D − R → weights → threshold, the last three as in `dematel.ts`.
 */
import type { Trace, TraceAxisItem, Tracked, ValidationCollector } from '@mateo/engine';
import {
  createTraceBuilder,
  createValidation,
  crisp,
  defineMethod,
  defineParameters,
  ISSUE_CODES,
  maximum,
  sum,
  term,
  textLiteral,
} from '@mateo/engine';
import type { TFN } from '@mateo/fuzzy';
import {
  encodeTfn,
  FUZZY_ISSUE_CODES,
  tfnArithmeticMean,
  tfnDivideByScalar,
  tfnOps,
  tfnProblem,
} from '@mateo/fuzzy';
import { formula, quantity } from '../src/common';
import { inverseOfIdentityMinus } from './linear';
import {
  cfcs,
  fuzzyInverseMatrix,
  tracedCfcs,
  tracedComponentwiseProduct,
  tracedFuzzyInverse,
} from './operations';
import type {
  DematelCommonResult,
  DematelFactor,
  DematelGroup,
  DematelNormalization,
  DematelOptions,
} from './shared';
import {
  checkExpertMatrices,
  checkFactors,
  DEMATEL_ISSUE_CODES,
  DEMATEL_PARAMETERS,
  DEMATEL_REFERENCES,
  factorAxis,
  groupOf,
  key as sharedKey,
  recordTail,
  warnDiagonal,
} from './shared';

export const FUZZY_DEMATEL_ID = 'fuzzy-dematel';
export const FUZZY_DEMATEL_VERSION = '1.0.0';

/** `centroid` (default) and `graded-mean` per TFN; `cfcs` over the set of each table. */
export const FUZZY_DEMATEL_DEFUZZIFICATIONS = ['centroid', 'graded-mean', 'cfcs'] as const;
export type FuzzyDematelDefuzzification = (typeof FUZZY_DEMATEL_DEFUZZIFICATIONS)[number];

export const FUZZY_DEMATEL_REFERENCES = [
  ...DEMATEL_REFERENCES,
  {
    id: 'lin2008',
    authors: ['Lin, C.-J.', 'Wu, W.-W.'],
    year: 2008,
    title: 'A causal analytical method for group decision-making under fuzzy environment',
    source: 'Expert Systems with Applications',
    volume: '34',
    issue: '1',
    pages: '205-213',
    doi: '10.1016/j.eswa.2006.08.012',
    note: 'Structure of the fuzzy variant. Paywalled: not verified against a worked example.',
  },
  {
    id: 'opricovic2003',
    authors: ['Opricovic, S.', 'Tzeng, G.-H.'],
    year: 2003,
    title: 'Defuzzification within a multicriteria decision model',
    source: 'International Journal of Uncertainty, Fuzziness and Knowledge-Based Systems',
    volume: '11',
    issue: '5',
    pages: '635-652',
    doi: '10.1142/S0218488503002387',
    note: 'The CFCS defuzzification option (converting fuzzy data into crisp scores). Not checked against the paper.',
  },
];

const fkey = (path: string): string => `methods.fuzzyDematel.${path}`;
const fstep = (id: string) => ({
  id,
  nameKey: fkey(`steps.${id}.name`),
  explanationKey: fkey(`steps.${id}.explanation`),
});

const parameters = defineParameters({
  ...DEMATEL_PARAMETERS,
  defuzzification: {
    type: 'enum',
    default: 'centroid',
    labelKey: fkey('parameters.defuzzification.label'),
    descriptionKey: fkey('parameters.defuzzification.description'),
    options: [
      { value: 'centroid', labelKey: fkey('parameters.defuzzification.centroid') },
      { value: 'graded-mean', labelKey: fkey('parameters.defuzzification.gradedMean') },
      { value: 'cfcs', labelKey: fkey('parameters.defuzzification.cfcs') },
    ],
  },
});

export interface FuzzyDematelInput {
  readonly factors: readonly DematelFactor[];
  /** One n × n matrix of TFNs per expert; entry (i, j): influence of i on j. */
  readonly relations: readonly (readonly (readonly TFN[])[])[];
}

export interface FuzzyDematelFactorResult {
  readonly factorId: string;
  /** D̃ and R̃: the fuzzy dispatched and received influence. */
  readonly dispatch: TFN;
  readonly receive: TFN;
  /** D̃ + R̃ and D̃ − R̃. */
  readonly fuzzyProminence: TFN;
  readonly fuzzyRelation: TFN;
  /** Their defuzzified values. */
  readonly prominence: number;
  readonly relation: number;
  readonly group: DematelGroup;
}

export interface FuzzyDematelResult extends DematelCommonResult {
  /** T̃, the fuzzy total-relation matrix; `totalRelation` holds its defuzzification. */
  readonly fuzzyTotalRelation: readonly (readonly TFN[])[];
  readonly factors: readonly FuzzyDematelFactorResult[];
}

/** Z̃: the mean of the experts' TFNs. */
function averageMatrix(experts: readonly (readonly (readonly TFN[])[])[]): TFN[][] {
  const first = experts[0] as readonly (readonly TFN[])[];
  return first.map((row, i) =>
    row.map((_, j) => tfnArithmeticMean(experts.map((m) => (m[i] as readonly TFN[])[j] as TFN))),
  );
}

/** s from the upper components, the largest of the row (and column) sums. */
function normalizationOf(
  z: readonly (readonly TFN[])[],
  normalization: DematelNormalization,
): number {
  const upper = z.map((row) => row.map((cell) => cell.u));
  const rows = maximum(upper.map((row) => sum(row)));
  if (normalization === 'max-row-sum') return rows;
  const columns = maximum(upper.map((_, j) => sum(upper.map((row) => row[j] as number))));
  return maximum([rows, columns]);
}

function validateFuzzyDematel(
  input: FuzzyDematelInput,
  options: DematelOptions,
  v: ValidationCollector,
) {
  if (typeof input !== 'object' || input === null) {
    v.error(ISSUE_CODES.inputMalformed, {
      params: { input: 'factors' },
      location: { input: 'factors' },
    });
    return;
  }
  if (!checkFactors(input.factors, v)) return;
  const { factors, relations } = input;
  const usable = checkExpertMatrices(relations, factors, v, (cell, location) => {
    if (cell === null || cell === undefined) {
      v.error(ISSUE_CODES.matrixMissingValue, { location });
      return false;
    }
    const problem = tfnProblem(cell);
    if (problem === 'order') {
      const { l, m, u } = cell as TFN;
      v.error(FUZZY_ISSUE_CODES.tfnInvalidOrder, { params: { l, m, u }, location });
      return false;
    }
    if (problem !== undefined) {
      v.error(FUZZY_ISSUE_CODES.tfnInvalidValue, { location });
      return false;
    }
    if ((cell as TFN).l < 0) {
      v.error(FUZZY_ISSUE_CODES.tfnNegativeValue, { params: { l: (cell as TFN).l }, location });
      return false;
    }
    return true;
  });
  if (!usable) return;

  relations.forEach((matrix, expert) =>
    factors.forEach((_, i) => {
      const { l, m, u } = (matrix[i] as readonly TFN[])[i] as TFN;
      if (l !== 0 || m !== 0 || u !== 0) warnDiagonal(v, factors, expert, i);
    }),
  );

  const z = averageMatrix(relations);
  const s = normalizationOf(z, options.normalization);
  if (!(s > 0)) {
    v.error(DEMATEL_ISSUE_CODES.zeroMatrix, { location: { input: 'relations' } });
    return;
  }
  const x = z.map((row) => row.map((cell) => tfnDivideByScalar(cell, s)));
  const singular = (['l', 'm', 'u'] as const)
    .map((component) => inverseOfIdentityMinus(x.map((row) => row.map((cell) => cell[component]))))
    .find((outcome) => outcome.kind === 'singular');
  if (singular !== undefined) {
    v.error(DEMATEL_ISSUE_CODES.nearSingular, {
      params: {
        condition: Number.isFinite(singular.condition) ? singular.condition : 'infinite',
      },
      location: { input: 'relations' },
    });
  }
}

export const fuzzyDematelMethod = defineMethod({
  id: FUZZY_DEMATEL_ID,
  version: FUZZY_DEMATEL_VERSION,
  category: 'relationship',
  nameKey: fkey('name'),
  supportedNumberTypes: ['tfn'],
  inputSchema: [
    { name: 'factors', kind: 'factor-list', required: true, numberTypes: ['tfn'] },
    { name: 'relations', kind: 'relation-matrices', required: true, numberTypes: ['tfn'] },
  ],
  outputSchema: [
    { name: 'factors', kind: 'relationship', numberTypes: ['tfn', 'crisp'] },
    { name: 'weights', kind: 'weights', numberTypes: ['crisp'] },
  ],
  parameters,
  references: FUZZY_DEMATEL_REFERENCES,

  validate(input: FuzzyDematelInput, params) {
    const v = createValidation();
    validateFuzzyDematel(input, params, v);
    return v.result();
  },

  run(input: FuzzyDematelInput, params): { result: FuzzyDematelResult; trace: Trace } {
    const { factors, relations } = input;
    const n = factors.length;
    const items = factorAxis(factors);
    const defuzzification: FuzzyDematelDefuzzification = params.defuzzification;
    const tb = createTraceBuilder({
      methodId: FUZZY_DEMATEL_ID,
      methodVersion: FUZZY_DEMATEL_VERSION,
    });
    const experts = relations.length;

    let z;
    if (experts === 1) {
      z = tb.input<TFN>({
        ...fstep('direct-relation'),
        explanationParams: { experts },
        input: 'relations',
        encode: encodeTfn,
        rows: items,
        columns: items,
        values: relations[0] as readonly (readonly TFN[])[],
      });
    } else {
      const stacked: TraceAxisItem[] = relations.flatMap((_, expert) =>
        factors.map(({ id }) => ({
          id: `e${expert + 1}:${id}`,
          label: textLiteral(`E${expert + 1} · ${id}`),
          kind: 'factor',
        })),
      );
      const all = tb.input<TFN>({
        ...fstep('expert-matrices'),
        input: 'relations',
        encode: encodeTfn,
        rows: stacked,
        columns: items,
        values: relations.flatMap((matrix) => matrix.map((row) => [...row])),
      });
      z = tb.table<TFN>({
        ...fstep('direct-relation'),
        explanationParams: { experts },
        formulas: [
          formula('mean', String.raw`{{z}} = \frac{1}{H} \sum_{k=1}^{H} {{x}}`, [
            ['z', String.raw`\tilde{z}_{ij}`],
            ['x', String.raw`\tilde{x}^{k}_{ij}`],
            ['H', 'H'],
          ]),
        ],
        rows: items,
        columns: items,
        visualization: { view: 'matrix', basedOn: all.id },
        cell: (row, column) =>
          tfnOps.arithmeticMean(
            relations.map((_, expert) => term(all.cell(expert * n + row.index, column.index), 'x')),
          ),
      });
    }

    const rowSums = tb.columnVector<TFN>({
      ...fstep('row-sums'),
      formulas: [
        formula('row-sum', String.raw`{{r}} = \sum_{j=1}^{n} {{z}}`, [
          ['r', String.raw`\sum_{j} \tilde{z}_{ij}`],
          ['z', String.raw`\tilde{z}_{ij}`],
        ]),
      ],
      items,
      column: quantity('rowSum', sharedKey('columns.rowSum')),
      cell: (row) => tfnOps.sum(term(z.row(row.index), 'z')),
    });
    const bothSums = params.normalization === 'max-row-or-column-sum';
    const columnSums = bothSums
      ? tb.rowVector<TFN>({
          ...fstep('column-sums'),
          formulas: [
            formula('column-sum', String.raw`{{c}} = \sum_{i=1}^{n} {{z}}`, [
              ['c', String.raw`\sum_{i} \tilde{z}_{ij}`],
              ['z', String.raw`\tilde{z}_{ij}`],
            ]),
          ],
          items,
          row: quantity('columnSum', sharedKey('rows.columnSum')),
          cell: (column) => tfnOps.sum(term(z.column(column.index), 'z')),
        })
      : undefined;
    const upperOf = (handle: { all(): { items: readonly Tracked<TFN>[] } }) =>
      handle.all().items.map((item) => tfnOps.upper(item));
    const s = tb.scalar<number>({
      ...fstep('normalization-constant'),
      explanationParams: { normalization: params.normalization },
      formulas: [
        formula(
          bothSums ? 'both' : 'rows',
          bothSums
            ? String.raw`{{s}} = \max \left( \max_i \sum_{j} z^{u}_{ij}, \; \max_j \sum_{i} z^{u}_{ij} \right)`
            : String.raw`{{s}} = \max_i \sum_{j} z^{u}_{ij}`,
          [['s', 's']],
        ),
      ],
      value:
        columnSums === undefined
          ? crisp.max(upperOf(rowSums))
          : crisp.max([crisp.max(upperOf(rowSums)), crisp.max(upperOf(columnSums))]),
    });

    const x = tb.table<TFN>({
      ...fstep('normalized-matrix'),
      formulas: [
        formula('normalize', String.raw`{{x}} = \frac{ {{z}} }{ {{s}} }`, [
          ['x', String.raw`\tilde{x}_{ij}`],
          ['z', String.raw`\tilde{z}_{ij}`],
          ['s', 's'],
        ]),
      ],
      rows: items,
      columns: items,
      visualization: { view: 'matrix', basedOn: z.id },
      cell: (row, column) =>
        tfnOps.divideByScalar(term(z.cell(row.index, column.index), 'z'), term(s.at(), 's')),
    });

    const inverse = fuzzyInverseMatrix(x.values()) as TFN[][];
    const inv = tb.table<TFN>({
      ...fstep('inverse'),
      formulas: [
        formula('inverse', String.raw`{{inv}} = \left[ (I - X_{\bullet})^{-1} \right]_{ij}`, [
          ['inv', String.raw`\left[ (I - X_{\bullet})^{-1} \right]_{ij}`],
        ]),
      ],
      rows: items,
      columns: items,
      visualization: { view: 'matrix', basedOn: x.id },
      cell: (row, column) => tracedFuzzyInverse(x.all(), inverse, row.index, column.index),
    });

    const t = tb.table<TFN>({
      ...fstep('total-relation'),
      formulas: [
        formula(
          'total',
          String.raw`{{t}} = \left( \sum_{k} x^{l}_{ik} \, v^{l}_{kj}, \; \sum_{k} x^{m}_{ik} \, v^{m}_{kj}, \; \sum_{k} x^{u}_{ik} \, v^{u}_{kj} \right)`,
          [
            ['t', String.raw`\tilde{t}_{ij}`],
            ['x', String.raw`\tilde{x}_{ik}`],
            ['v', String.raw`\tilde{v}_{kj}`],
          ],
        ),
      ],
      rows: items,
      columns: items,
      visualization: { view: 'matrix', basedOn: x.id },
      cell: (row, column) =>
        tracedComponentwiseProduct(
          term(x.row(row.index), 'x'),
          term(inv.column(column.index), 'v'),
        ),
    });

    const influence = tb.table<TFN>({
      ...fstep('influence'),
      formulas: [
        formula('dispatch', String.raw`{{d}} = \sum_{j=1}^{n} {{t}}`, [
          ['d', String.raw`\tilde{D}_i`],
          ['t', String.raw`\tilde{t}_{ij}`],
        ]),
        formula('receive', String.raw`{{r}} = \sum_{i=1}^{n} {{t}}`, [
          ['r', String.raw`\tilde{R}_j`],
          ['t', String.raw`\tilde{t}_{ij}`],
        ]),
      ],
      rows: items,
      columns: [
        quantity('D', sharedKey('columns.dispatch')),
        quantity('R', sharedKey('columns.receive')),
      ],
      visualization: { view: 'bars', basedOn: t.id },
      cell: (row, column) =>
        column.index === 0
          ? { tracked: tfnOps.sum(term(t.row(row.index), 't')), formula: 'dispatch' }
          : { tracked: tfnOps.sum(term(t.column(row.index), 't')), formula: 'receive' },
    });

    const fuzzyPr = tb.table<TFN>({
      ...fstep('fuzzy-prominence-relation'),
      formulas: [
        formula('prominence', String.raw`{{p}} = {{d}} \oplus {{r}}`, [
          ['p', String.raw`\tilde{D}_i + \tilde{R}_i`],
          ['d', String.raw`\tilde{D}_i`],
          ['r', String.raw`\tilde{R}_i`],
        ]),
        formula('relation', String.raw`{{q}} = {{d}} \ominus {{r}}`, [
          ['q', String.raw`\tilde{D}_i - \tilde{R}_i`],
          ['d', String.raw`\tilde{D}_i`],
          ['r', String.raw`\tilde{R}_i`],
        ]),
      ],
      rows: items,
      columns: [
        quantity('prominence', sharedKey('columns.prominence')),
        quantity('relation', sharedKey('columns.relation')),
      ],
      visualization: { view: 'bars', basedOn: influence.id },
      cell: (row, column) => {
        const d = term(influence.cell(row.index, 0), 'd');
        const r = term(influence.cell(row.index, 1), 'r');
        return column.index === 0
          ? { tracked: tfnOps.add(d, r), formula: 'prominence' }
          : { tracked: tfnOps.subtract(d, r), formula: 'relation' };
      },
    });

    // Defuzzification. CFCS works on a set (it normalizes with the extremes of all its
    // members): T̃ as a whole, and the D̃ + R̃ and D̃ − R̃ columns each on their own.
    const defuzzify = (
      cell: Tracked<TFN>,
      set: ReturnType<typeof t.all>,
      values: readonly number[],
      index: number,
    ): Tracked<number> =>
      defuzzification === 'cfcs'
        ? tracedCfcs(set, values, index)
        : tfnOps.defuzzify(defuzzification, cell);
    const setValues = (values: readonly Tracked<TFN>[]): number[] =>
      defuzzification === 'cfcs' ? cfcs(values.map((value) => value.value)) : [];

    const tAll = t.all();
    const tCfcs = setValues(tAll.items);
    const crispT = tb.table<number>({
      ...fstep('defuzzified-total-relation'),
      explanationParams: { defuzzification },
      formulas: [defuzzificationFormula('t', String.raw`\tilde{t}_{ij}`, defuzzification)],
      rows: items,
      columns: items,
      visualization: { view: 'matrix', basedOn: t.id },
      cell: (row, column) =>
        defuzzify(
          term(t.cell(row.index, column.index), 'v'),
          term(tAll, 'v'),
          tCfcs,
          row.index * n + column.index,
        ),
    });

    const columnCfcs = [0, 1].map((column) => {
      const range = fuzzyPr.column(column);
      return { range, values: setValues(range.items) };
    });
    const pr = tb.table<number>({
      ...fstep('prominence-relation'),
      explanationParams: { defuzzification },
      formulas: [
        defuzzificationFormula('p', String.raw`\tilde{D}_i \pm \tilde{R}_i`, defuzzification),
      ],
      rows: items,
      columns: [
        quantity('prominence', sharedKey('columns.prominence')),
        quantity('relation', sharedKey('columns.relation')),
      ],
      visualization: { view: 'bars', basedOn: fuzzyPr.id },
      cell: (row, column) => {
        const set = columnCfcs[column.index]!;
        return defuzzify(
          term(fuzzyPr.cell(row.index, column.index), 'v'),
          term(set.range, 'v'),
          set.values,
          row.index,
        );
      },
    });

    const tail = recordTail({
      tb,
      factors,
      options: params,
      total: crispT,
      prominenceRelation: pr,
    });

    const influenceValues = influence.values();
    const fuzzyPrValues = fuzzyPr.values();
    const prValues = pr.values();
    const result: FuzzyDematelResult = {
      normalizationConstant: s.at().value,
      totalRelation: crispT.values(),
      fuzzyTotalRelation: t.values(),
      factors: factors.map((factor, i) => ({
        factorId: factor.id,
        dispatch: (influenceValues[i] as TFN[])[0] as TFN,
        receive: (influenceValues[i] as TFN[])[1] as TFN,
        fuzzyProminence: (fuzzyPrValues[i] as TFN[])[0] as TFN,
        fuzzyRelation: (fuzzyPrValues[i] as TFN[])[1] as TFN,
        prominence: (prValues[i] as number[])[0] as number,
        relation: (prValues[i] as number[])[1] as number,
        group: groupOf((prValues[i] as number[])[1] as number),
      })),
      ...tail,
    };
    return { result, trace: tb.build() };
  },
});

/** The formula of a defuzzification step: the chosen one only, with `v` the fuzzy value. */
function defuzzificationFormula(id: string, latex: string, defuzzification: string) {
  const template: Record<string, string> = {
    centroid: String.raw`{{x}} = \frac{ l + m + u }{ 3 } \quad \text{for } {{v}} = (l, m, u)`,
    'graded-mean': String.raw`{{x}} = \frac{ l + 4m + u }{ 6 } \quad \text{for } {{v}} = (l, m, u)`,
    cfcs: String.raw`{{x}} = l_{\min} + \Delta \cdot \frac{ l_s (1 - l_s) + u_s^2 }{ 1 - l_s + u_s } \quad \text{for } {{v}} = (l, m, u)`,
  };
  return formula(`defuzzify-${id}`, template[defuzzification] as string, [
    ['x', String.raw`\mathrm{crisp}(${latex})`],
    ['v', latex],
  ]);
}

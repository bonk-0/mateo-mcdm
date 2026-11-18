/**
 * EDAS: Evaluation based on Distance from Average Solution.
 *
 * Formulation: docs/methods/edas.md, Keshavarz Ghorabaee, Zavadskas, Olfat, Turskis (2015),
 * Section 2, Eqs. 1-11.
 *
 * Steps: initial matrix → weights → average solution AV_j → positive distances PDA_ij and
 * negative distances NDA_ij from the average → weighted sums SP_i and SN_i → normalized
 * sums NSP_i and NSN_i → appraisal score AS_i = (NSP_i + NSN_i) / 2 → ranking.
 *
 * The score does not depend on the scale of the weights (SP and SN are divided by their
 * maxima), so the weights are used as entered and no normalization step exists.
 */
import type {
  DecisionMatrix,
  RankingResult,
  Reference,
  ValidationCollector,
  WeightVector,
} from '@mateo/engine';
import {
  alignWeights,
  alternativeAxis,
  checkCrispMatrix,
  checkCrispWeights,
  createTraceBuilder,
  createValidation,
  crisp,
  criterionAxis,
  defineMethod,
  NO_PARAMETERS,
  term,
} from '@mateo/engine';
import { FOR_BENEFIT, FOR_COST, formula, quantity } from '../src/common';

export const EDAS_ID = 'edas';
export const EDAS_VERSION = '1.0.0';

export const EDAS_ISSUE_CODES = {
  /** The average of a criterion is 0, so its distances divide by 0. */
  zeroAverage: 'edas.zero-average',
  /** Every SP_i is 0, so NSP_i = SP_i / max SP is undefined. */
  zeroPositiveSums: 'edas.zero-positive-sums',
  /** Every SN_i is 0, so NSN_i = 1 − SN_i / max SN is undefined. */
  zeroNegativeSums: 'edas.zero-negative-sums',
} as const;

export interface EdasInput {
  readonly matrix: DecisionMatrix<number>;
  readonly weights: WeightVector;
}

export interface EdasResult extends RankingResult {
  /** Appraisal score AS_i of every alternative, in input order. Higher is better. */
  readonly scores: readonly number[];
}

export const EDAS_REFERENCES: readonly Reference[] = [
  {
    id: 'keshavarz2015',
    authors: ['Keshavarz Ghorabaee, M.', 'Zavadskas, E. K.', 'Olfat, L.', 'Turskis, Z.'],
    year: 2015,
    title:
      'Multi-criteria inventory classification using a new method of evaluation based on distance from average solution (EDAS)',
    source: 'Informatica',
    volume: '26',
    issue: '3',
    pages: '435-451',
    doi: '10.15388/Informatica.2015.57',
    note: 'Original paper of the method: Section 2, Eqs. 1-11, and the inventory example of Section 3 (Tables 1-3), used as the golden test.',
  },
];

const key = (path: string): string => `methods.edas.${path}`;
const step = (id: string) => ({
  id,
  nameKey: key(`steps.${id}.name`),
  explanationKey: key(`steps.${id}.explanation`),
});

/** Untraced AV_j, for validation only. */
function plainAverages(matrix: DecisionMatrix<number>): number[] {
  return matrix.criteria.map(
    (_, j) =>
      matrix.values.reduce((total, row) => total + (row[j] as number), 0) / matrix.values.length,
  );
}

/** Untraced SP_i and SN_i, for validation only. Needs non-zero averages. */
function plainSums(matrix: DecisionMatrix<number>, weights: readonly number[]) {
  const averages = plainAverages(matrix);
  return matrix.values.map((row) => {
    let sp = 0;
    let sn = 0;
    row.forEach((x, j) => {
      const average = averages[j] as number;
      const above = Math.max(0, x - average) / average;
      const below = Math.max(0, average - x) / average;
      const benefit = matrix.criteria[j]!.direction === 'benefit';
      sp += (weights[j] as number) * (benefit ? above : below);
      sn += (weights[j] as number) * (benefit ? below : above);
    });
    return { sp, sn };
  });
}

function validateEdas(input: EdasInput, v: ValidationCollector): void {
  v.add(checkCrispMatrix(input?.matrix, { sign: 'non-negative', supportedNumberTypes: ['crisp'] }));
  if (v.hasErrors) return;
  const { matrix } = input;
  const criterionIds = matrix.criteria.map((criterion) => criterion.id);
  // Scaling every weight by one constant changes neither NSP, NSN nor AS.
  v.add(checkCrispWeights(input.weights, criterionIds, { notNormalized: 'ignore' }));
  if (v.hasErrors) return;

  plainAverages(matrix).forEach((average, j) => {
    if (average === 0) {
      v.error(EDAS_ISSUE_CODES.zeroAverage, {
        params: { id: criterionIds[j]! },
        location: { input: 'matrix', column: { index: j, id: criterionIds[j]! } },
      });
    }
  });
  if (v.hasErrors) return;

  const sums = plainSums(matrix, alignWeights(input.weights, criterionIds) as number[]);
  if (Math.max(...sums.map((sum) => sum.sp)) === 0) {
    v.error(EDAS_ISSUE_CODES.zeroPositiveSums, { location: { input: 'matrix' } });
  }
  if (Math.max(...sums.map((sum) => sum.sn)) === 0) {
    v.error(EDAS_ISSUE_CODES.zeroNegativeSums, { location: { input: 'matrix' } });
  }
}

export const edasMethod = defineMethod({
  id: EDAS_ID,
  version: EDAS_VERSION,
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
  parameters: NO_PARAMETERS,
  references: EDAS_REFERENCES,

  validate(input: EdasInput) {
    const v = createValidation();
    validateEdas(input, v);
    return v.result();
  },

  run(input: EdasInput) {
    const { matrix } = input;
    const tb = createTraceBuilder({ methodId: EDAS_ID, methodVersion: EDAS_VERSION });
    const x = tb.inputMatrix({ ...step('initial-matrix'), matrix });
    const w = tb.inputWeights({
      ...step('weights'),
      weights: input.weights,
      criteria: matrix.criteria,
    });
    const criteria = criterionAxis(matrix.criteria);
    const alternatives = alternativeAxis(matrix.alternatives);

    // Eq. 3: AV_j = (Σ_i x_ij) / n.
    const average = tb.rowVector<number>({
      ...step('average-solution'),
      formulas: [
        formula('average', String.raw`{{av}} = \frac{1}{m} \sum_{i=1}^{m} {{x}}`, [
          ['av', 'AV_j'],
          ['x', 'x_{ij}'],
        ]),
      ],
      items: criteria,
      row: quantity('av', key('rows.average')),
      cell: (column) => crisp.mean(term(x.column(column.index), 'x')),
    });

    // Eqs. 4-7: the distance above the average is wanted for a benefit criterion and the
    // distance below it for a cost criterion; PDA and NDA swap roles between the two.
    const distances = (id: 'positive-distances' | 'negative-distances') => {
      const positive = id === 'positive-distances';
      const name = positive ? 'PDA' : 'NDA';
      const terms = [
        ['d', `${name}_{ij}`],
        ['x', 'x_{ij}'],
        ['av', 'AV_j'],
      ] as const;
      const above = positive;
      return tb.table<number>({
        ...step(id),
        formulas: [
          formula(
            'benefit',
            above
              ? String.raw`{{d}} = \frac{ \max(0,\; {{x}} - {{av}}) }{ {{av}} }`
              : String.raw`{{d}} = \frac{ \max(0,\; {{av}} - {{x}}) }{ {{av}} }`,
            terms,
            FOR_BENEFIT,
          ),
          formula(
            'cost',
            above
              ? String.raw`{{d}} = \frac{ \max(0,\; {{av}} - {{x}}) }{ {{av}} }`
              : String.raw`{{d}} = \frac{ \max(0,\; {{x}} - {{av}}) }{ {{av}} }`,
            terms,
            FOR_COST,
          ),
        ],
        rows: alternatives,
        columns: criteria,
        visualization: { view: 'matrix', basedOn: x.id },
        cell: (row, column) => {
          const direction = matrix.criteria[column.index]!.direction;
          const value = term(x.cell(row.index, column.index), 'x');
          const mean = term(average.at(column.index), 'av');
          const wantsAbove = direction === 'benefit' ? above : !above;
          const excess = wantsAbove ? crisp.subtract(value, mean) : crisp.subtract(mean, value);
          return { tracked: crisp.divide(crisp.max([0, excess]), mean), formula: direction };
        },
      });
    };
    const pda = distances('positive-distances');
    const nda = distances('negative-distances');

    // Eqs. 8-9: SP_i = Σ_j w_j PDA_ij, SN_i = Σ_j w_j NDA_ij.
    const weightedSums = (
      id: 'weighted-positive-sums' | 'weighted-negative-sums',
      source: typeof pda,
    ) => {
      const name = id === 'weighted-positive-sums' ? 'SP' : 'SN';
      const distance = id === 'weighted-positive-sums' ? 'PDA' : 'NDA';
      return tb.columnVector<number>({
        ...step(id),
        formulas: [
          formula('weighted-sum', String.raw`{{S}} = \sum_{j=1}^{n} {{w}} \cdot {{d}}`, [
            ['S', `${name}_i`],
            ['w', 'w_j'],
            ['d', `${distance}_{ij}`],
          ]),
        ],
        items: alternatives,
        column: quantity(name.toLowerCase(), key(`columns.${name}`)),
        cell: (item) => crisp.sumOfProducts(term(w.row(0), 'w'), term(source.row(item.index), 'd')),
      });
    };
    const sp = weightedSums('weighted-positive-sums', pda);
    const sn = weightedSums('weighted-negative-sums', nda);

    // Eqs. 10-11: NSP_i = SP_i / max SP, NSN_i = 1 − SN_i / max SN.
    const maxSp = term(crisp.max(sp.all()), 'SP_max');
    const nsp = tb.columnVector<number>({
      ...step('normalized-positive-sums'),
      formulas: [
        formula('nsp', String.raw`{{NSP}} = \frac{ {{SP}} }{ {{SP_max}} }`, [
          ['NSP', 'NSP_i'],
          ['SP', 'SP_i'],
          ['SP_max', String.raw`\max_i SP_i`],
        ]),
      ],
      items: alternatives,
      column: quantity('nsp', key('columns.NSP')),
      cell: (item) => crisp.divide(term(sp.at(item.index), 'SP'), maxSp),
    });
    const maxSn = term(crisp.max(sn.all()), 'SN_max');
    const nsn = tb.columnVector<number>({
      ...step('normalized-negative-sums'),
      formulas: [
        formula('nsn', String.raw`{{NSN}} = 1 - \frac{ {{SN}} }{ {{SN_max}} }`, [
          ['NSN', 'NSN_i'],
          ['SN', 'SN_i'],
          ['SN_max', String.raw`\max_i SN_i`],
        ]),
      ],
      items: alternatives,
      column: quantity('nsn', key('columns.NSN')),
      cell: (item) => crisp.subtract(1, crisp.divide(term(sn.at(item.index), 'SN'), maxSn)),
    });

    // Eq. 12: AS_i = (NSP_i + NSN_i) / 2.
    const appraisal = tb.columnVector<number>({
      ...step('appraisal-scores'),
      role: 'result',
      formulas: [
        formula('as', String.raw`{{AS}} = \frac{ {{NSP}} + {{NSN}} }{2}`, [
          ['AS', 'AS_i'],
          ['NSP', 'NSP_i'],
          ['NSN', 'NSN_i'],
        ]),
      ],
      items: alternatives,
      column: quantity('as', key('columns.AS')),
      cell: (item) =>
        crisp.divide(
          crisp.add(term(nsp.at(item.index), 'NSP'), term(nsn.at(item.index), 'NSN')),
          2,
        ),
    });

    const ranks = crisp.rank(appraisal.all());
    const ranking = tb.columnVector<number>({
      ...step('ranking'),
      role: 'result',
      items: alternatives,
      column: quantity('rank', key('columns.rank')),
      visualization: { view: 'ranking', basedOn: appraisal.id },
      cell: (item) => ranks[item.index]!,
    });

    const scores = appraisal.values().map((cells) => cells[0] as number);
    const rankValues = ranking.values().map((cells) => cells[0] as number);
    const result: EdasResult = {
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

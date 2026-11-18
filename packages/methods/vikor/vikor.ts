/**
 * VIKOR: VIseKriterijumska Optimizacija I Kompromisno Resenje.
 *
 * Formulation: docs/methods/vikor.md. Method by Opricovic and Tzeng (2004); the formulas,
 * the strategy weight (n + 1) / (2n) and the worked example come from the open-access
 * restatement by the same authors (Opricovic and Tzeng 2008), Eqs. 1-4 and Table 7.
 *
 * Steps: initial matrix → weights → [normalized weights] → best and worst values f*_j,
 * f⁻_j → weighted distances w_j (f*_j − f_ij) / (f*_j − f⁻_j) → group utility S_i and
 * individual regret R_i → their extremes → normalized S and R → strategy weight v →
 * compromise index Q_i → rankings by S and R → acceptable-advantage threshold DQ and the
 * differences Q_i − Q(A(1)) → ranking by Q (smallest first).
 *
 * The result also holds the compromise solution: the acceptable-advantage condition C1,
 * the acceptable-stability condition C2 and the set they lead to. Both conditions are
 * decided from numbers in the trace (the Q differences, DQ and the rankings by S, R, Q).
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
  alignWeights,
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
  parameter,
  term,
  textKey,
} from '@mateo/engine';
import { FOR_BENEFIT, FOR_COST, formula, quantity, referenceRow } from '../src/common';

export const VIKOR_ID = 'vikor';
export const VIKOR_VERSION = '1.0.0';

/** Row ids of the best and worst values in the trace. Criteria may be named anything. */
export const VIKOR_BEST = 'best';
export const VIKOR_WORST = 'worst';

export const VIKOR_ISSUE_CODES = {
  /**
   * Every alternative has the same S_i and the same R_i, so the normalized measures divide
   * by 0 and Q_i is undefined: nothing separates the alternatives.
   */
  noDiscrimination: 'vikor.no-discrimination',
} as const;

/**
 * Two Q values (or a Q difference and DQ) that differ by floating-point noise only are
 * equal, as in the engine's ranking.
 */
const TOLERANCE = 1e-12;

export interface VikorInput {
  readonly matrix: DecisionMatrix<number>;
  readonly weights: WeightVector;
}

/** How the compromise solution came out (Opricovic and Tzeng 2004, 2008). */
export interface VikorCompromise {
  /**
   * The compromise set, smallest Q first (equal values in input order): A(1) alone when
   * both conditions hold, A(1) and A(2) when only C2 fails, and every A(M) with
   * Q(A(M)) − Q(A(1)) < DQ when C1 fails.
   */
  readonly alternativeIds: readonly string[];
  /** C1: Q(A(2)) − Q(A(1)) ≥ DQ with DQ = 1 / (J − 1). */
  readonly acceptableAdvantage: {
    readonly threshold: number;
    readonly difference: number;
    readonly holds: boolean;
  };
  /** C2: A(1) is also the best alternative by S or by R. */
  readonly acceptableStability: {
    readonly holds: boolean;
    readonly bestByGroupUtility: boolean;
    readonly bestByRegret: boolean;
  };
}

export interface VikorResult extends RankingResult {
  /** Compromise index Q_i of every alternative, in input order. Smaller is better. */
  readonly scores: readonly number[];
  /** Group utility S_i, in input order. */
  readonly groupUtility: readonly number[];
  /** Individual regret R_i, in input order. */
  readonly individualRegret: readonly number[];
  /** The strategy weight v that was used. */
  readonly strategyWeight: number;
  readonly compromise: VikorCompromise;
}

const parameters = defineParameters({
  vRule: {
    type: 'enum',
    labelKey: 'methods.vikor.parameters.vRule.label',
    descriptionKey: 'methods.vikor.parameters.vRule.description',
    default: 'fixed',
    options: [
      { value: 'fixed', labelKey: 'methods.vikor.parameters.vRule.fixed' },
      {
        value: 'opricovic-tzeng-2008',
        labelKey: 'methods.vikor.parameters.vRule.opricovicTzeng2008',
      },
    ],
  },
  v: {
    type: 'number',
    labelKey: 'methods.vikor.parameters.v.label',
    descriptionKey: 'methods.vikor.parameters.v.description',
    default: 0.5,
    min: 0,
    max: 1,
    step: 0.05,
  },
  normalizeWeights: {
    type: 'boolean',
    labelKey: 'methods.vikor.parameters.normalizeWeights.label',
    descriptionKey: 'methods.vikor.parameters.normalizeWeights.description',
    default: true,
  },
});

export const VIKOR_REFERENCES: readonly Reference[] = [
  {
    id: 'opricovic2004',
    authors: ['Opricovic, S.', 'Tzeng, G.-H.'],
    year: 2004,
    title: 'Compromise solution by MCDM methods: A comparative analysis of VIKOR and TOPSIS',
    source: 'European Journal of Operational Research',
    volume: '156',
    issue: '2',
    pages: '445-455',
    doi: '10.1016/S0377-2217(03)00020-1',
    note: 'Original paper of the method (paywalled, not read). It uses v = 0.5. The formulation follows opricovic2008.',
  },
  {
    id: 'opricovic2008',
    authors: ['Opricovic, S.', 'Tzeng, G.-H.'],
    year: 2008,
    title: 'A comparative analysis of the DEA-CCR model and the VIKOR method',
    source: 'Yugoslav Journal of Operations Research',
    volume: '18',
    issue: '2',
    pages: '187-203',
    doi: '10.2298/YUJOR0802187O',
    note: 'Open-access restatement by the same authors: Section 3, Eqs. 1-4, the strategy weight v = (n + 1) / (2n), and the hydropower example of Tables 1 and 7, used as the golden test.',
  },
];

const key = (path: string): string => `methods.vikor.${path}`;
const step = (id: string) => ({
  id,
  nameKey: key(`steps.${id}.name`),
  explanationKey: key(`steps.${id}.explanation`),
});

/** Untraced S_i and R_i, for validation only. */
function plainMeasures(matrix: DecisionMatrix<number>, weights: readonly number[]) {
  const best = matrix.criteria.map((criterion, j) => {
    const values = matrix.values.map((row) => row[j] as number);
    return criterion.direction === 'benefit' ? Math.max(...values) : Math.min(...values);
  });
  const worst = matrix.criteria.map((criterion, j) => {
    const values = matrix.values.map((row) => row[j] as number);
    return criterion.direction === 'benefit' ? Math.min(...values) : Math.max(...values);
  });
  const terms = matrix.values.map((row) =>
    row.map((x, j) =>
      best[j] === worst[j]
        ? 0
        : ((weights[j] as number) * ((best[j] as number) - x)) /
          ((best[j] as number) - (worst[j] as number)),
    ),
  );
  return {
    s: terms.map((row) => row.reduce((a, b) => a + b, 0)),
    r: terms.map((row) => Math.max(...row)),
  };
}

function validateVikor(input: VikorInput, normalizeWeights: boolean, v: ValidationCollector) {
  v.add(
    checkCrispMatrix(input?.matrix, {
      sign: 'any',
      minAlternatives: 2,
      supportedNumberTypes: ['crisp'],
      constantCriterion: 'warning',
    }),
  );
  if (v.hasErrors) return;
  const { matrix } = input;
  const criterionIds = matrix.criteria.map((criterion) => criterion.id);
  v.add(
    checkCrispWeights(input.weights, criterionIds, {
      // With the option on, the method normalizes the weights itself.
      notNormalized: normalizeWeights ? 'ignore' : 'warning',
    }),
  );
  if (v.hasErrors) return;

  const { s, r } = plainMeasures(matrix, alignWeights(input.weights, criterionIds) as number[]);
  const range = (values: readonly number[]) => Math.max(...values) - Math.min(...values);
  // The weights of the criteria that vary are all there is to rank by; a range this small
  // is round-off, not a difference.
  if (!(range(s) > TOLERANCE) && !(range(r) > TOLERANCE)) {
    v.error(VIKOR_ISSUE_CODES.noDiscrimination, { location: { input: 'matrix' } });
  }
}

export const vikorMethod = defineMethod({
  id: VIKOR_ID,
  version: VIKOR_VERSION,
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
  references: VIKOR_REFERENCES,

  validate(input: VikorInput, params) {
    const v = createValidation();
    validateVikor(input, params.normalizeWeights, v);
    return v.result();
  },

  run(input: VikorInput, params) {
    const { matrix } = input;
    const tb = createTraceBuilder({ methodId: VIKOR_ID, methodVersion: VIKOR_VERSION });
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

    // Eq. 1: f*_j is the best and f⁻_j the worst value of criterion j.
    const bestWorst = tb.table<number>({
      ...step('best-worst-values'),
      formulas: [
        formula('best-benefit', String.raw`{{f_best}} = \max_i {{f}}`, BOUND_TERMS, FOR_BENEFIT),
        formula('best-cost', String.raw`{{f_best}} = \min_i {{f}}`, BOUND_TERMS, FOR_COST),
        formula('worst-benefit', String.raw`{{f_worst}} = \min_i {{f}}`, BOUND_TERMS, FOR_BENEFIT),
        formula('worst-cost', String.raw`{{f_worst}} = \max_i {{f}}`, BOUND_TERMS, FOR_COST),
      ],
      rows: [
        referenceRow(VIKOR_BEST, key('rows.best')),
        referenceRow(VIKOR_WORST, key('rows.worst')),
      ],
      columns: criteria,
      visualization: { view: 'matrix', basedOn: x.id },
      cell: (row, column) => {
        const direction = matrix.criteria[column.index]!.direction;
        const values = term(x.column(column.index), 'f');
        const takeMax = (row.id === VIKOR_BEST) === (direction === 'benefit');
        return {
          tracked: takeMax ? crisp.max(values) : crisp.min(values),
          formula: `${row.id}-${direction}`,
        };
      },
    });

    // The term of Eqs. 2-3: w_j (f*_j − f_ij) / (f*_j − f⁻_j). A criterion on which every
    // alternative is equal has no range; its term is 0 (docs/methods/vikor.md).
    const hasRange = matrix.criteria.map((_, j) => {
      const column = x.values().map((row) => row[j] as number);
      return Math.max(...column) !== Math.min(...column);
    });
    const distances = tb.table<number>({
      ...step('weighted-distances'),
      formulas: [
        formula(
          'distance',
          String.raw`{{d}} = {{w}} \cdot \frac{ {{f_best}} - {{f}} }{ {{f_best}} - {{f_worst}} }`,
          [
            ['d', String.raw`w_j \dfrac{f^*_j - f_{ij}}{f^*_j - f^-_j}`],
            ['w', 'w_j'],
            ['f', 'f_{ij}'],
            ['f_best', 'f^*_j'],
            ['f_worst', 'f^-_j'],
          ],
        ),
        formula(
          'no-range',
          String.raw`{{d}} = 0`,
          [['d', String.raw`w_j \dfrac{f^*_j - f_{ij}}{f^*_j - f^-_j}`]],
          textKey(key('conditions.noRange')),
        ),
      ],
      rows: alternatives,
      columns: criteria,
      visualization: { view: 'matrix', basedOn: x.id },
      cell: (row, column) => {
        if (!hasRange[column.index]) return { tracked: constant(0), formula: 'no-range' };
        const best = term(bestWorst.cell(VIKOR_BEST, column.index), 'f_best');
        const worst = term(bestWorst.cell(VIKOR_WORST, column.index), 'f_worst');
        const value = term(x.cell(row.index, column.index), 'f');
        return {
          tracked: crisp.multiply(
            term(w.at(column.index), 'w'),
            crisp.divide(crisp.subtract(best, value), crisp.subtract(best, worst)),
          ),
          formula: 'distance',
        };
      },
    });

    // Eq. 2: S_i = Σ_j w_j (f*_j − f_ij) / (f*_j − f⁻_j); Eq. 3: R_i = max_j of the same terms.
    const s = tb.columnVector<number>({
      ...step('group-utility'),
      formulas: [
        formula('group-utility', String.raw`{{S}} = \sum_{j=1}^{n} {{d}}`, [
          ['S', 'S_i'],
          ['d', String.raw`w_j \dfrac{f^*_j - f_{ij}}{f^*_j - f^-_j}`],
        ]),
      ],
      items: alternatives,
      column: quantity('s', key('columns.S')),
      cell: (item) => crisp.sum(term(distances.row(item.index), 'd')),
    });
    const r = tb.columnVector<number>({
      ...step('individual-regret'),
      formulas: [
        formula('individual-regret', String.raw`{{R}} = \max_{j} {{d}}`, [
          ['R', 'R_i'],
          ['d', String.raw`w_j \dfrac{f^*_j - f_{ij}}{f^*_j - f^-_j}`],
        ]),
      ],
      items: alternatives,
      column: quantity('r', key('columns.R')),
      cell: (item) => crisp.max(term(distances.row(item.index), 'd')),
    });

    // S* = min S, S⁻ = max S, R* = min R, R⁻ = max R.
    const extremes = tb.table<number>({
      ...step('extremes'),
      formulas: [
        formula('best', String.raw`{{best}} = \min_i {{m}}`, EXTREME_TERMS),
        formula('worst', String.raw`{{worst}} = \max_i {{m}}`, EXTREME_TERMS),
      ],
      rows: [quantity('s', key('columns.S')), quantity('r', key('columns.R'))],
      columns: [
        quantity('best', key('columns.extremeBest')),
        quantity('worst', key('columns.extremeWorst')),
      ],
      visualization: { view: 'matrix', basedOn: s.id },
      cell: (row, column) => {
        const source = row.id === 's' ? s : r;
        const values = term(source.all(), 'm');
        return column.id === 'best'
          ? { tracked: crisp.min(values), formula: 'best' }
          : { tracked: crisp.max(values), formula: 'worst' };
      },
    });

    // (S_i − S*) / (S⁻ − S*) and (R_i − R*) / (R⁻ − R*); 0 when all alternatives are equal.
    const spread = (id: string) => {
      const [best, worst] = [extremes.cell(id, 'best'), extremes.cell(id, 'worst')];
      return best.value === worst.value ? undefined : { best, worst };
    };
    const sSpread = spread('s');
    const rSpread = spread('r');
    const normalized = tb.table<number>({
      ...step('normalized-measures'),
      formulas: [
        formula(
          'normalized-s',
          String.raw`{{s_hat}} = \frac{ {{S}} - {{S_best}} }{ {{S_worst}} - {{S_best}} }`,
          [
            ['s_hat', String.raw`\hat{S}_i`],
            ['S', 'S_i'],
            ['S_best', 'S^*'],
            ['S_worst', 'S^-'],
          ],
        ),
        formula(
          'normalized-r',
          String.raw`{{r_hat}} = \frac{ {{R}} - {{R_best}} }{ {{R_worst}} - {{R_best}} }`,
          [
            ['r_hat', String.raw`\hat{R}_i`],
            ['R', 'R_i'],
            ['R_best', 'R^*'],
            ['R_worst', 'R^-'],
          ],
        ),
        formula(
          'no-range',
          String.raw`{{h}} = 0`,
          [['h', String.raw`\hat{S}_i, \hat{R}_i`]],
          textKey(key('conditions.noSpread')),
        ),
      ],
      rows: alternatives,
      columns: [quantity('s-hat', key('columns.sHat')), quantity('r-hat', key('columns.rHat'))],
      visualization: { view: 'matrix', basedOn: s.id },
      cell: (row, column) => {
        const isS = column.id === 's-hat';
        const bounds = isS ? sSpread : rSpread;
        if (bounds === undefined) return { tracked: constant(0), formula: 'no-range' };
        const own = isS ? term(s.at(row.index), 'S') : term(r.at(row.index), 'R');
        const best = term(bounds.best, isS ? 'S_best' : 'R_best');
        const worst = term(bounds.worst, isS ? 'S_worst' : 'R_worst');
        return {
          tracked: crisp.divide(crisp.subtract(own, best), crisp.subtract(worst, best)),
          formula: isS ? 'normalized-s' : 'normalized-r',
        };
      },
    });

    // v: 0.5 (Opricovic and Tzeng 2004) or (n + 1) / (2n) (Opricovic and Tzeng 2008).
    const criteriaCount = matrix.criteria.length;
    const strategyWeight = tb.scalar<number>({
      ...step('strategy-weight'),
      explanationParams: { vRule: params.vRule },
      formulas: [
        params.vRule === 'fixed'
          ? formula('v', String.raw`{{v}} = {{v_given}}`, [
              ['v', 'v'],
              ['v_given', 'v'],
            ])
          : formula('v', String.raw`{{v}} = \frac{ {{n}} + 1 }{ 2 \cdot {{n}} }`, [
              ['v', 'v'],
              ['n', 'n'],
            ]),
      ],
      value:
        params.vRule === 'fixed'
          ? parameter('v', params.v, 'v_given')
          : crisp.divide(
              crisp.add(constant(criteriaCount, 'n'), 1),
              crisp.multiply(2, constant(criteriaCount, 'n')),
            ),
    });

    // Eq. 4: Q_i = v (S_i − S*) / (S⁻ − S*) + (1 − v) (R_i − R*) / (R⁻ − R*).
    const q = tb.columnVector<number>({
      ...step('compromise-index'),
      formulas: [
        formula('q', String.raw`{{Q}} = {{v}} \cdot {{s_hat}} + (1 - {{v}}) \cdot {{r_hat}}`, [
          ['Q', 'Q_i'],
          ['v', 'v'],
          ['s_hat', String.raw`\hat{S}_i`],
          ['r_hat', String.raw`\hat{R}_i`],
        ]),
      ],
      items: alternatives,
      column: quantity('q', key('columns.Q')),
      cell: (item) => {
        const v: Tracked<number> = term(strategyWeight.at(), 'v');
        return crisp.add(
          crisp.multiply(v, term(normalized.cell(item.index, 's-hat'), 's_hat')),
          crisp.multiply(crisp.subtract(1, v), term(normalized.cell(item.index, 'r-hat'), 'r_hat')),
        );
      },
    });

    // The rankings by S and R decide the acceptable-stability condition C2.
    const ranksS = crisp.rank(s.all(), { order: 'ascending' });
    const ranksR = crisp.rank(r.all(), { order: 'ascending' });
    const componentRanks = tb.table<number>({
      ...step('component-rankings'),
      rows: alternatives,
      columns: [quantity('rank-s', key('columns.rankS')), quantity('rank-r', key('columns.rankR'))],
      visualization: { view: 'matrix', basedOn: s.id },
      cell: (row, column) => (column.id === 'rank-s' ? ranksS : ranksR)[row.index]!,
    });

    // Condition C1 compares Q(A(2)) − Q(A(1)) with DQ = 1 / (J − 1); C1 failing makes the
    // compromise set every alternative whose Q is less than DQ above Q(A(1)).
    const threshold = tb.scalar<number>({
      ...step('advantage-threshold'),
      formulas: [formula('dq', String.raw`DQ = \frac{1}{ {{J}} - 1 }`, [['J', 'J']])],
      value: crisp.divide(1, crisp.subtract(constant(matrix.alternatives.length, 'J'), 1)),
    });
    const bestQ = term(crisp.min(q.all()), 'Q_1');
    const differences = tb.columnVector<number>({
      ...step('q-differences'),
      formulas: [
        formula('difference', String.raw`{{dQ}} = {{Q}} - {{Q_1}}`, [
          ['dQ', String.raw`Q_i - Q(A^{(1)})`],
          ['Q', 'Q_i'],
          ['Q_1', String.raw`Q(A^{(1)})`],
        ]),
      ],
      items: alternatives,
      column: quantity('dq', key('columns.QDifference')),
      cell: (item) => crisp.subtract(term(q.at(item.index), 'Q'), bestQ),
    });

    const ranks = crisp.rank(q.all(), { order: 'ascending' });
    const ranking = tb.columnVector<number>({
      ...step('ranking'),
      role: 'result',
      items: alternatives,
      column: quantity('rank', key('columns.rank')),
      visualization: { view: 'ranking', basedOn: q.id },
      cell: (item) => ranks[item.index]!,
    });

    const column = (handle: StepHandle<number>, index = 0) =>
      handle.values().map((cells) => cells[index] as number);
    const scores = column(q);
    const rankValues = column(ranking);
    const compromise = decideCompromise({
      alternativeIds: matrix.alternatives.map((alternative) => alternative.id),
      scores,
      differences: column(differences),
      threshold: threshold.at().value,
      ranksS: column(componentRanks, 0),
      ranksR: column(componentRanks, 1),
    });
    const result: VikorResult = {
      scores,
      groupUtility: column(s),
      individualRegret: column(r),
      strategyWeight: strategyWeight.at().value,
      compromise,
      ranking: matrix.alternatives.map((alternative, i) => ({
        alternativeId: alternative.id,
        score: scores[i]!,
        rank: rankValues[i]!,
      })),
    };
    return { result, trace: tb.build() };
  },
});

/**
 * The compromise solution from the numbers of the trace: Q and its differences, DQ and the
 * rankings by S and R. A(1) is the alternative with the smallest Q and A(2) the next one.
 */
function decideCompromise(args: {
  readonly alternativeIds: readonly string[];
  readonly scores: readonly number[];
  readonly differences: readonly number[];
  readonly threshold: number;
  readonly ranksS: readonly number[];
  readonly ranksR: readonly number[];
}): VikorCompromise {
  const { alternativeIds, scores, differences, threshold, ranksS, ranksR } = args;
  const order = scores
    .map((score, index) => ({ score, index }))
    .sort((a, b) => a.score - b.score || a.index - b.index)
    .map((entry) => entry.index);
  const first = order[0] as number;
  const second = order[1] as number;

  // A difference of DQ up to round-off counts as reaching it.
  const reachesThreshold = (difference: number) => difference >= threshold - TOLERANCE;
  const difference = differences[second] as number;
  const advantage = reachesThreshold(difference);
  const bestByGroupUtility = ranksS[first] === 1;
  const bestByRegret = ranksR[first] === 1;
  const stability = bestByGroupUtility || bestByRegret;

  const members = !advantage
    ? order.filter((index) => !reachesThreshold(differences[index] as number))
    : stability
      ? [first]
      : [first, second];
  return {
    alternativeIds: members.map((index) => alternativeIds[index] as string),
    acceptableAdvantage: { threshold, difference, holds: advantage },
    acceptableStability: { holds: stability, bestByGroupUtility, bestByRegret },
  };
}

const BOUND_TERMS = [
  ['f_best', 'f^*_j'],
  ['f_worst', 'f^-_j'],
  ['f', 'f_{ij}'],
] as const;

const EXTREME_TERMS = [
  ['best', String.raw`S^*, R^*`],
  ['worst', String.raw`S^-, R^-`],
  ['m', String.raw`S_i, R_i`],
] as const;

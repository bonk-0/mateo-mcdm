/**
 * BWM: Best–Worst Method (subjective weights), nonlinear (Rezaei 2015) and linear
 * (Rezaei 2016) models.
 *
 * Formulation: docs/methods/bwm.md. Both Omega papers are paywalled; the models and the
 * golden example come from the method author's lecture slides (Rezaei 2019, slides 21-25).
 *
 * The decision maker picks the best criterion B and the worst W and gives a_Bj (B over j)
 * and a_jW (j over W) on 1-9.
 *
 * - `nonlinear`: ξ* = min ξ s.t. |w_B / w_j − a_Bj| ≤ ξ, |w_j / w_W − a_jW| ≤ ξ, Σ w = 1,
 *   w ≥ 0. The optimal weights are not unique in general, so the method reports each
 *   weight's interval over the whole optimal set and the interval centres (as the slides
 *   do), never one solver-dependent optimum. CR = ξ* / CI(a_BW). The centres need not sum
 *   to 1; the weight output is the centres normalised to sum 1.
 * - `linear`: ξ^L* = min ξ s.t. |w_B − a_Bj w_j| ≤ ξ, |w_j − a_jW w_W| ≤ ξ. Its optimum is
 *   unique; ξ^L* itself is the consistency indicator.
 *
 * Both models are solved with the linear solver the method receives (see `model.ts`).
 * Steps (nonlinear): best-to-others → others-to-worst → optimal ξ* → weight intervals →
 * interval centres → consistency index → consistency ratio → weights. Steps (linear):
 * best-to-others → others-to-worst → optimal ξ^L* → weights.
 */
import type {
  LinearSolver,
  MethodRun,
  Reference,
  StepHandle,
  Tracked,
  ValidationCollector,
  WeightingResult,
} from '@mateo/engine';
import {
  createTraceBuilder,
  createValidation,
  crisp,
  crispWeights,
  defineMethod,
  defineParameters,
  derive,
  EngineError,
  encodeCrisp,
  ISSUE_CODES,
  solverLabel,
  term,
} from '@mateo/engine';
import { formula, quantity } from '../src/common';
import type { NamedCriterion } from '../src/criteria';
import { checkCriterionList, checkNumberList, criterionAxisItems } from '../src/criteria';
import type { BwmVectors, WeightBound } from './model';
import { linearOptimum, nonlinearXi, weightBound } from './model';
import { inputThreshold, THRESHOLD_CRITERIA, THRESHOLD_SCALES } from './consistency';
import { BWM_OPERATIONS, bwmOptions } from './operations';

export const BWM_ID = 'bwm';
export const BWM_VERSION = '1.1.0';

/** The 1-9 scale of the comparisons. */
export const BWM_SCALE = { min: 1, max: 9 } as const;

export const BWM_ISSUE_CODES = {
  /** `best` or `worst` is not the id of a criterion. */
  unknownCriterion: 'bwm.unknown-criterion',
  /** The same criterion is chosen as best and worst. */
  bestIsWorst: 'bwm.best-is-worst',
  /** A comparison is outside the 1-9 scale. */
  outOfScale: 'bwm.out-of-scale',
  /** a_BB or a_WW is not 1. */
  selfComparison: 'bwm.self-comparison',
  /** a_BW is given twice (best-to-others and others-to-worst) with different values. */
  bestWorstMismatch: 'bwm.best-worst-mismatch',
  /** a_BW = 1: the best criterion is not preferred to the worst. */
  bestNotPreferred: 'bwm.best-not-preferred',
  /**
   * Warning: the two vectors order a pair of criteria differently (a_Bi > a_Bj, so j is
   * more important, but a_iW > a_jW, so i is).
   */
  ordinalInconsistency: 'bwm.ordinal-inconsistency',
  /** Warning: Liang et al. (2020) give no CR^I threshold for this number of criteria. */
  thresholdUnavailable: 'bwm.threshold-unavailable',
} as const;

export interface BwmInput {
  readonly criteria: readonly NamedCriterion[];
  /** Id of the best criterion B. */
  readonly best: string;
  /** Id of the worst criterion W. */
  readonly worst: string;
  /** a_Bj in criteria order; a_BB = 1. */
  readonly bestToOthers: readonly number[];
  /** a_jW in criteria order; a_WW = 1. */
  readonly othersToWorst: readonly number[];
}

export interface BwmWeightInterval {
  readonly criterionId: string;
  readonly lower: number;
  readonly upper: number;
  readonly centre: number;
}

/**
 * The input-based consistency check of Liang, Brunelli & Rezaei (2020), computed from the
 * two vectors alone, for both models.
 */
export interface BwmInputConsistency {
  /** CR^I_j in criteria order. */
  readonly ratios: readonly number[];
  /** CR^I = max_j CR^I_j. */
  readonly ratio: number;
  /** Threshold for this number of criteria and scale; null when the paper gives none. */
  readonly threshold: number | null;
  /** CR^I ≤ threshold; null when there is no threshold to judge by. */
  readonly acceptable: boolean | null;
}

export type BwmResult = WeightingResult<number> & {
  readonly inputConsistency: BwmInputConsistency;
} & (
    | {
        readonly model: 'nonlinear';
        /** ξ*. */
        readonly xi: number;
        readonly consistencyIndex: number;
        readonly consistencyRatio: number;
        /** Each weight over the optimal set, in criteria order. */
        readonly intervals: readonly BwmWeightInterval[];
      }
    | {
        readonly model: 'linear';
        /** ξ^L*, the consistency indicator of the linear model. */
        readonly xi: number;
      }
  );

export const BWM_REFERENCES: readonly Reference[] = [
  {
    id: 'rezaei2015',
    authors: ['Rezaei, J.'],
    year: 2015,
    title: 'Best-worst multi-criteria decision-making method',
    source: 'Omega',
    volume: '53',
    pages: '49-57',
    doi: '10.1016/j.omega.2014.11.009',
    note: 'Original paper and nonlinear model (paywalled, not read); see rezaei2019.',
  },
  {
    id: 'rezaei2016',
    authors: ['Rezaei, J.'],
    year: 2016,
    title: 'Best-worst multi-criteria decision-making method: Some properties and a linear model',
    source: 'Omega',
    volume: '64',
    pages: '126-130',
    doi: '10.1016/j.omega.2015.12.001',
    note: 'Linear model and the interval weights of the nonlinear model (paywalled, not read); see rezaei2019.',
  },
  {
    id: 'liang2020',
    authors: ['Liang, F.', 'Brunelli, M.', 'Rezaei, J.'],
    year: 2020,
    title: 'Consistency issues in the best worst method: Measurements and thresholds',
    source: 'Omega',
    volume: '96',
    pages: '102175',
    doi: '10.1016/j.omega.2019.102175',
    note: 'Input-based consistency ratio CR^I and its thresholds (Eq. 6-7, Table 3), read in the open-access full text.',
  },
  {
    id: 'rezaei2019',
    authors: ['Rezaei, J.'],
    year: 2019,
    title: 'BWM: Best Worst Method',
    source: 'Lecture slides, bestworstmethod.com',
    url: 'https://bestworstmethod.com/wp-content/uploads/2020/01/Best-Worst-Method-BWM-2019.pdf',
    note: 'By the method’s author: both models and the car-buying example (slides 21-25), used as the golden test.',
  },
];

const key = (path: string): string => `methods.bwm.${path}`;
const step = (id: string) => ({
  id,
  nameKey: key(`steps.${id}.name`),
  explanationKey: key(`steps.${id}.explanation`),
});

const parameters = defineParameters({
  model: {
    type: 'enum',
    labelKey: key('parameters.model.label'),
    descriptionKey: key('parameters.model.description'),
    default: 'nonlinear',
    options: [
      { value: 'nonlinear', labelKey: key('parameters.model.nonlinear') },
      { value: 'linear', labelKey: key('parameters.model.linear') },
    ],
  },
  scale: {
    type: 'integer',
    labelKey: key('parameters.scale.label'),
    descriptionKey: key('parameters.scale.description'),
    default: BWM_SCALE.max,
    min: THRESHOLD_SCALES.min,
    max: BWM_SCALE.max,
  },
});

function checkCriterionId(
  value: unknown,
  input: 'best' | 'worst',
  ids: readonly string[],
  v: ValidationCollector,
): value is string {
  if (typeof value !== 'string') {
    v.error(ISSUE_CODES.inputMalformed, { params: { input }, location: { input } });
    return false;
  }
  if (!ids.includes(value)) {
    v.error(BWM_ISSUE_CODES.unknownCriterion, { params: { id: value }, location: { input } });
    return false;
  }
  return true;
}

function validateBwm(input: BwmInput, scale: number, v: ValidationCollector) {
  if (typeof input !== 'object' || input === null) {
    v.error(ISSUE_CODES.inputMalformed, {
      params: { input: 'criteria' },
      location: { input: 'criteria' },
    });
    return;
  }
  if (!checkCriterionList(input.criteria, v)) return;
  const ids = input.criteria.map((criterion) => criterion.id);
  const n = ids.length;
  const best = checkCriterionId(input.best, 'best', ids, v);
  const worst = checkCriterionId(input.worst, 'worst', ids, v);
  if (best && worst && input.best === input.worst) {
    v.error(BWM_ISSUE_CODES.bestIsWorst, {
      params: { id: input.best },
      location: { input: 'worst' },
    });
  }
  const columnId = (index: number) => ids[index];
  const bo: unknown = input.bestToOthers;
  const ow: unknown = input.othersToWorst;
  const boUsable = checkNumberList(bo, 'bestToOthers', n, v, columnId);
  const owUsable = checkNumberList(ow, 'othersToWorst', n, v, columnId);
  for (const [slot, values, usable] of [
    ['bestToOthers', bo, boUsable],
    ['othersToWorst', ow, owUsable],
  ] as const) {
    if (!usable) continue;
    (values as readonly number[]).forEach((value, index) => {
      if (value < BWM_SCALE.min || value > scale) {
        v.error(BWM_ISSUE_CODES.outOfScale, {
          params: { value, min: BWM_SCALE.min, max: scale },
          location: { input: slot, column: { index, id: ids[index]! } },
        });
      }
    });
  }
  if (!best || !worst || !boUsable || !owUsable || v.hasErrors) return;

  const b = ids.indexOf(input.best);
  const w = ids.indexOf(input.worst);
  for (const [slot, values, index] of [
    ['bestToOthers', bo, b],
    ['othersToWorst', ow, w],
  ] as const) {
    if (values[index] !== 1) {
      v.error(BWM_ISSUE_CODES.selfComparison, {
        params: { id: ids[index]!, value: values[index]! },
        location: { input: slot, column: { index, id: ids[index]! } },
      });
    }
  }
  if (bo[w] !== ow[b]) {
    v.error(BWM_ISSUE_CODES.bestWorstMismatch, {
      params: { bestToWorst: bo[w]!, worstFromBest: ow[b]! },
      location: { input: 'othersToWorst', column: { index: b, id: ids[b]! } },
    });
  } else if (bo[w] === 1) {
    v.error(BWM_ISSUE_CODES.bestNotPreferred, {
      location: { input: 'bestToOthers', column: { index: w, id: ids[w]! } },
    });
  }
  if (v.hasErrors) return;

  if (n > THRESHOLD_CRITERIA.max) {
    v.warning(BWM_ISSUE_CODES.thresholdUnavailable, {
      params: { count: n, max: THRESHOLD_CRITERIA.max },
      location: { input: 'criteria' },
    });
  }

  // Ordinal consistency (Rezaei 2015): visible before running, so the user can fix it.
  for (let i = 0; i < n; i += 1) {
    for (let j = 0; j < n; j += 1) {
      if (bo[i]! > bo[j]! && ow[i]! > ow[j]!) {
        v.warning(BWM_ISSUE_CODES.ordinalInconsistency, {
          params: { first: ids[i]!, second: ids[j]! },
          location: { input: 'othersToWorst', column: { index: i, id: ids[i]! } },
        });
      }
    }
  }
}

function requireSolver(solver: LinearSolver | undefined): LinearSolver {
  if (solver === undefined) {
    // runMethod checks the `requires` declaration first; this is the backstop.
    throw new EngineError('INVALID_ARGUMENT', 'BWM needs a linear solver in its context.');
  }
  return solver;
}

const BO_TERMS = [
  ['a_B', 'a_{Bj}'],
  ['a_W', 'a_{jW}'],
] as const;

export const bwmMethod = defineMethod({
  id: BWM_ID,
  version: BWM_VERSION,
  category: 'weighting',
  nameKey: key('name'),
  supportedNumberTypes: ['crisp'],
  inputSchema: [
    { name: 'criteria', kind: 'criteria', required: true, numberTypes: ['crisp'] },
    { name: 'best', kind: 'expert-judgements', required: true, numberTypes: ['crisp'] },
    { name: 'worst', kind: 'expert-judgements', required: true, numberTypes: ['crisp'] },
    { name: 'bestToOthers', kind: 'expert-judgements', required: true, numberTypes: ['crisp'] },
    { name: 'othersToWorst', kind: 'expert-judgements', required: true, numberTypes: ['crisp'] },
  ],
  outputSchema: [{ name: 'weights', kind: 'weights', numberTypes: ['crisp'] }],
  parameters,
  references: BWM_REFERENCES,
  requires: ['linear-solver'],

  validate(input: BwmInput, params) {
    const v = createValidation();
    validateBwm(input, params.scale, v);
    return v.result();
  },

  run(input: BwmInput, params, context): MethodRun<BwmResult> {
    const solver = requireSolver(context.solver);
    const { criteria } = input;
    const ids = criteria.map((criterion) => criterion.id);
    const vectors: BwmVectors = {
      bo: input.bestToOthers,
      ow: input.othersToWorst,
      best: ids.indexOf(input.best),
      worst: ids.indexOf(input.worst),
    };
    const tb = createTraceBuilder({ methodId: BWM_ID, methodVersion: BWM_VERSION });
    const items = criterionAxisItems(criteria);
    const explanationParams = { solver: solverLabel(solver) };
    const options = bwmOptions(vectors, solver);

    const bo = tb.input<number>({
      ...step('best-to-others'),
      input: 'bestToOthers',
      rows: [quantity('a-best', key('rows.bestToOthers'))],
      columns: items,
      values: [[...input.bestToOthers]],
    });
    const ow = tb.input<number>({
      ...step('others-to-worst'),
      input: 'othersToWorst',
      rows: [quantity('a-worst', key('rows.othersToWorst'))],
      columns: items,
      values: [[...input.othersToWorst]],
    });
    const preferences = [term(bo.row(0), 'a_B'), term(ow.row(0), 'a_W')] as const;

    // CR^I needs no solver: it is shown before the optimization, as in the paper, where it
    // gives feedback while the comparisons are entered.
    const aBW = term(bo.at(vectors.worst), 'a');
    const ratios = tb.rowVector<number>({
      ...step('input-consistency'),
      formulas: [
        formula(
          'local',
          String.raw`{{CRj}} = \frac{ \left| {{aB}} \cdot {{aW}} - {{a}} \right| }{ {{a}}^2 - {{a}} }`,
          [
            ['CRj', String.raw`CR^I_j`],
            ['aB', 'a_{Bj}'],
            ['aW', 'a_{jW}'],
            ['a', 'a_{BW}'],
          ],
        ),
      ],
      items,
      row: quantity('cri', key('rows.inputRatio')),
      cell: (column) =>
        crisp.divide(
          crisp.abs(
            crisp.subtract(
              crisp.multiply(term(bo.at(column.index), 'aB'), term(ow.at(column.index), 'aW')),
              aBW,
            ),
          ),
          crisp.multiply(aBW, crisp.subtract(aBW, 1)),
        ),
    });
    const ratio = tb.scalar<number>({
      ...step('input-consistency-ratio'),
      formulas: [
        formula('max', String.raw`{{CR}} = \max_j {{CRj}}`, [
          ['CR', String.raw`CR^I`],
          ['CRj', String.raw`CR^I_j`],
        ]),
      ],
      value: term(crisp.max(ratios.all()), 'CR'),
    });
    const thresholdValue = inputThreshold(ids.length, params.scale);
    const threshold =
      thresholdValue === null
        ? null
        : tb.scalar<number>({
            ...step('input-threshold'),
            role: 'result',
            explanationParams: { count: ids.length, scale: params.scale },
            formulas: [
              formula('verdict', String.raw`{{CR}} \le {{T}}`, [
                ['CR', String.raw`CR^I`],
                ['T', String.raw`T_{n,m}`],
              ]),
            ],
            value: term(
              derive(BWM_OPERATIONS.inputThreshold, [], thresholdValue, encodeCrisp, {
                criteria: ids.length,
                scale: params.scale,
              }),
              'T',
            ),
          });
    const inputConsistency: BwmInputConsistency = {
      ratios: (ratios.values()[0] as number[]).slice(),
      ratio: ratio.at().value,
      threshold: threshold === null ? null : threshold.at().value,
      acceptable: threshold === null ? null : ratio.at().value <= threshold.at().value,
    };

    if (params.model === 'linear') {
      const optimum = linearOptimum(solver, vectors);
      const xi = tb.scalar<number>({
        ...step('linear-xi'),
        explanationParams,
        formulas: [
          formula(
            'model',
            String.raw`{{xi}} = \min \xi^L \;\text{s.t.}\; \left| w_B - {{a_B}} \, w_j \right| \le \xi^L,\; \left| w_j - {{a_W}} \, w_W \right| \le \xi^L,\; \sum_j w_j = 1,\; w_j \ge 0`,
            [['xi', String.raw`\xi^{L*}`], ...BO_TERMS],
          ),
        ],
        value: term(
          derive(BWM_OPERATIONS.linearXi, preferences, optimum.xi, encodeCrisp, options),
          'xi',
        ),
      });
      const weights = tb.rowVector<number>({
        ...step('weights'),
        explanationKey: key('steps.weights.linearExplanation'),
        role: 'result',
        explanationParams,
        formulas: [
          formula(
            'model',
            String.raw`{{w}} = \operatorname{arg\,min} \xi^L \;\text{s.t.}\; \left| w_B - {{a_B}} \, w_j \right| \le \xi^L,\; \left| w_j - {{a_W}} \, w_W \right| \le \xi^L`,
            [['w', 'w_j'], ...BO_TERMS],
          ),
        ],
        items,
        row: quantity('w', key('rows.weight')),
        visualization: { view: 'bars', basedOn: bo.id },
        cell: (column) =>
          term(
            derive(
              BWM_OPERATIONS.linearWeight,
              preferences,
              optimum.weights[column.index]!,
              encodeCrisp,
              { ...options, criterion: column.index },
            ),
            'w',
          ),
      });
      const result: BwmResult = {
        model: 'linear',
        inputConsistency,
        xi: xi.at().value,
        weights: crispWeights(ids, weights.values()[0] as number[]),
      };
      return { result, trace: tb.build() };
    }

    const xiValue = nonlinearXi(solver, vectors);
    const xi = tb.scalar<number>({
      ...step('optimal-xi'),
      explanationParams,
      formulas: [
        formula(
          'model',
          String.raw`{{xi}} = \min \xi \;\text{s.t.}\; \left| \frac{w_B}{w_j} - {{a_B}} \right| \le \xi,\; \left| \frac{w_j}{w_W} - {{a_W}} \right| \le \xi,\; \sum_j w_j = 1,\; w_j \ge 0`,
          [['xi', String.raw`\xi^*`], ...BO_TERMS],
        ),
      ],
      value: term(
        derive(BWM_OPERATIONS.nonlinearXi, preferences, xiValue, encodeCrisp, options),
        'xi',
      ),
    });

    const bound = (j: number, side: WeightBound): Tracked<number> =>
      term(
        derive(
          BWM_OPERATIONS.weightBound,
          [...preferences, term(xi.at(), 'xi')],
          weightBound(solver, vectors, xiValue, j, side),
          encodeCrisp,
          { ...options, criterion: j, bound: side },
        ),
        side === 'lower' ? 'w_lo' : 'w_hi',
      );
    const intervals: StepHandle<number> = tb.table<number>({
      ...step('weight-intervals'),
      explanationParams,
      formulas: [
        formula(
          'lower',
          String.raw`{{w_lo}} = \min w_j \;\text{s.t.}\; \left| \frac{w_B}{w_k} - {{a_B}} \right| \le {{xi}},\; \left| \frac{w_k}{w_W} - {{a_W}} \right| \le {{xi}},\; \sum_k w_k = 1,\; w_k \ge 0`,
          [
            ['w_lo', String.raw`w_j^{-}`],
            ['xi', String.raw`\xi^*`],
            ['a_B', 'a_{Bk}'],
            ['a_W', 'a_{kW}'],
          ],
        ),
        formula(
          'upper',
          String.raw`{{w_hi}} = \max w_j \;\text{s.t.}\; \left| \frac{w_B}{w_k} - {{a_B}} \right| \le {{xi}},\; \left| \frac{w_k}{w_W} - {{a_W}} \right| \le {{xi}},\; \sum_k w_k = 1,\; w_k \ge 0`,
          [
            ['w_hi', String.raw`w_j^{+}`],
            ['xi', String.raw`\xi^*`],
            ['a_B', 'a_{Bk}'],
            ['a_W', 'a_{kW}'],
          ],
        ),
      ],
      rows: [quantity('lower', key('rows.lowerBound')), quantity('upper', key('rows.upperBound'))],
      columns: items,
      cell: (row, column) => {
        const side: WeightBound = row.index === 0 ? 'lower' : 'upper';
        return { tracked: bound(column.index, side), formula: side };
      },
    });

    const centres = tb.rowVector<number>({
      ...step('interval-centres'),
      formulas: [
        formula('centre', String.raw`{{c}} = \frac{ {{w_lo}} + {{w_hi}} }{2}`, [
          ['c', 'c_j'],
          ['w_lo', String.raw`w_j^{-}`],
          ['w_hi', String.raw`w_j^{+}`],
        ]),
      ],
      items,
      row: quantity('centre', key('rows.centre')),
      visualization: { view: 'matrix', basedOn: intervals.id },
      cell: (column) =>
        crisp.divide(
          crisp.add(
            term(intervals.cell(0, column.index), 'w_lo'),
            term(intervals.cell(1, column.index), 'w_hi'),
          ),
          2,
        ),
    });

    // CI(a_BW) = ((1 + 2a) − √(1 + 8a)) / 2, the smaller root of ξ² − (1 + 2a) ξ + a² − a = 0.
    const ci = tb.scalar<number>({
      ...step('consistency-index'),
      formulas: [
        formula('index', String.raw`{{CI}} = \frac{ (1 + 2 {{a}}) - \sqrt{1 + 8 {{a}}} }{2}`, [
          ['CI', 'CI'],
          ['a', 'a_{BW}'],
        ]),
      ],
      value: crisp.divide(
        crisp.subtract(
          crisp.add(1, crisp.multiply(2, aBW)),
          crisp.sqrt(crisp.add(1, crisp.multiply(8, aBW))),
        ),
        2,
      ),
    });

    const cr = tb.scalar<number>({
      ...step('consistency-ratio'),
      role: 'result',
      formulas: [
        formula('ratio', String.raw`{{CR}} = \frac{ {{xi}} }{ {{CI}} }`, [
          ['CR', 'CR'],
          ['xi', String.raw`\xi^*`],
          ['CI', 'CI'],
        ]),
      ],
      value: term(crisp.divide(term(xi.at(), 'xi'), term(ci.at(), 'CI')), 'CR'),
    });

    const centreSum = term(crisp.sum(centres.all()), 'c_sum');
    const weights = tb.rowVector<number>({
      ...step('weights'),
      role: 'result',
      formulas: [
        formula('weight', String.raw`{{w}} = \frac{ {{c}} }{ {{c_sum}} }`, [
          ['w', 'w_j'],
          ['c', 'c_j'],
          ['c_sum', String.raw`\sum_{k=1}^{n} c_k`],
        ]),
      ],
      items,
      row: quantity('w', key('rows.weight')),
      visualization: { view: 'bars', basedOn: centres.id },
      cell: (column) => crisp.divide(term(centres.at(column.index), 'c'), centreSum),
    });

    const lower = intervals.values()[0] as number[];
    const upper = intervals.values()[1] as number[];
    const centre = centres.values()[0] as number[];
    const result: BwmResult = {
      model: 'nonlinear',
      inputConsistency,
      xi: xi.at().value,
      consistencyIndex: ci.at().value,
      consistencyRatio: cr.at().value,
      intervals: ids.map((criterionId, j) => ({
        criterionId,
        lower: lower[j]!,
        upper: upper[j]!,
        centre: centre[j]!,
      })),
      weights: crispWeights(ids, weights.values()[0] as number[]),
    };
    return { result, trace: tb.build() };
  },
});

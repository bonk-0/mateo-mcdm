/**
 * FUCOM: FUll COnsistency Method (subjective weights).
 *
 * Formulation: docs/methods/fucom.md, from Pamučar, Stević, Sremac (2018), Eqs. 1-5.
 *
 * The expert ranks the criteria and gives comparative priorities φ_(k/(k+1)) = w_k / w_(k+1),
 * either directly or as significance values ϖ on a scale (φ_(k/(k+1)) = ϖ_(k+1) / ϖ_k).
 * Model (5) then minimises the deviation from full consistency χ subject to
 * |w_k / w_(k+1) − φ_(k/(k+1))| ≤ χ and |w_k / w_(k+2) − φ_(k/(k+1)) · φ_((k+1)/(k+2))| ≤ χ.
 *
 * No solver is needed. Each transitive condition is the product of two adjacent ones, so the
 * chain w_k = φ_(k/(k+1)) · w_(k+1), normalised to sum 1, meets every condition with χ = 0,
 * the smallest value χ can take; and the adjacent conditions with χ = 0 fix every ratio, so
 * this optimum is unique (the paper's examples report DFC = 0 for this reason). The trace
 * computes the chain, then recomputes every condition of model (5) from the final weights
 * and reports their largest deviation as χ, so the claim is checked, not assumed.
 *
 * Steps: [significance ϖ →] comparative priorities φ → transitive priorities (three criteria
 * or more) → relative weights → weights → deviations from each condition → χ (DFC).
 *
 * Input: `criteria` in descending order of importance and `priorities`. Ties are allowed
 * (φ = 1, equal ϖ).
 */
import type {
  Reference,
  Tracked,
  TraceAxisItem,
  ValidationCollector,
  WeightingResult,
} from '@mateo/engine';
import {
  constant,
  createTraceBuilder,
  createValidation,
  crisp,
  crispWeights,
  defineMethod,
  empty,
  ISSUE_CODES,
  NO_PARAMETERS,
  term,
} from '@mateo/engine';
import { formula, quantity } from '../src/common';
import type { NamedCriterion } from '../src/criteria';
import { checkCriterionList, checkNumberList, criterionAxisItems } from '../src/criteria';

export const FUCOM_ID = 'fucom';
export const FUCOM_VERSION = '1.0.0';

export const FUCOM_ISSUE_CODES = {
  /** A priority contradicts the ranking: φ < 1, or ϖ smaller than the one before it. */
  rankingViolated: 'fucom.ranking-violated',
  /** `priorities.kind` is neither `significance` nor `comparative`. */
  unknownPriorityKind: 'fucom.unknown-priority-kind',
} as const;

/**
 * How the expert states the priorities.
 * - `significance`: ϖ of every criterion in ranking order, non-decreasing and positive
 *   (Step 2b of the paper, for example on the scale [1, 9] with ϖ_(1) = 1).
 * - `comparative`: φ_(k/(k+1)) for k = 1 … n − 1, each at least 1 (Step 2a, Example 1).
 */
export type FucomPriorities =
  | { readonly kind: 'significance'; readonly values: readonly number[] }
  | { readonly kind: 'comparative'; readonly values: readonly number[] };

export interface FucomInput {
  /** In descending order of importance. */
  readonly criteria: readonly NamedCriterion[];
  readonly priorities: FucomPriorities;
}

export interface FucomResult extends WeightingResult<number> {
  /** χ, the deviation from full consistency (DFC) of the weights. */
  readonly dfc: number;
}

export const FUCOM_REFERENCES: readonly Reference[] = [
  {
    id: 'pamucar2018',
    authors: ['Pamučar, D.', 'Stević, Ž.', 'Sremac, S.'],
    year: 2018,
    title:
      'A new model for determining weight coefficients of criteria in MCDM models: Full Consistency Method (FUCOM)',
    source: 'Symmetry',
    volume: '10',
    issue: '9',
    pages: '393',
    doi: '10.3390/sym10090393',
    note: 'Original paper of the method: Eqs. 1-5 and Examples 1 and 2, used as the golden tests.',
  },
];

const key = (path: string): string => `methods.fucom.${path}`;
const step = (id: string) => ({
  id,
  nameKey: key(`steps.${id}.name`),
  explanationKey: key(`steps.${id}.explanation`),
});

function validateFucom(input: FucomInput, v: ValidationCollector) {
  if (typeof input !== 'object' || input === null) {
    v.error(ISSUE_CODES.inputMalformed, {
      params: { input: 'criteria' },
      location: { input: 'criteria' },
    });
    return;
  }
  if (!checkCriterionList(input.criteria, v)) return;
  const { criteria, priorities } = input;
  const n = criteria.length;
  if (typeof priorities !== 'object' || priorities === null) {
    v.error(ISSUE_CODES.inputMalformed, {
      params: { input: 'priorities' },
      location: { input: 'priorities' },
    });
    return;
  }
  const kind = (priorities as { kind?: unknown }).kind;
  if (kind !== 'significance' && kind !== 'comparative') {
    v.error(FUCOM_ISSUE_CODES.unknownPriorityKind, {
      params: { kind: String(kind) },
      location: { input: 'priorities' },
    });
    return;
  }
  // Comparative priorities belong to the second criterion of their pair.
  const offset = kind === 'significance' ? 0 : 1;
  const values: unknown = priorities.values;
  if (!checkNumberList(values, 'priorities', n - offset, v, (i) => criteria[i + offset]?.id)) {
    return;
  }
  values.forEach((value, index) => {
    const location = {
      input: 'priorities',
      column: { index, id: criteria[index + offset]!.id },
    };
    if (kind === 'significance') {
      if (value <= 0) {
        v.error(ISSUE_CODES.matrixNonPositiveValue, { params: { value }, location });
      } else if (index > 0 && value < values[index - 1]!) {
        v.error(FUCOM_ISSUE_CODES.rankingViolated, { params: { value }, location });
      }
    } else if (value < 1) {
      v.error(FUCOM_ISSUE_CODES.rankingViolated, { params: { value }, location });
    }
  });
}

/** The constraints of model (5), shared by the χ step and its deviations. */
const MODEL_FORMULA = formula(
  'model',
  String.raw`{{chi}} = \min \chi \;\text{s.t.}\; \left| \frac{w_{(k)}}{w_{(k+1)}} - \varphi_{k/(k+1)} \right| \le \chi,\; \left| \frac{w_{(k)}}{w_{(k+2)}} - \varphi_{k/(k+1)} \cdot \varphi_{(k+1)/(k+2)} \right| \le \chi,\; \sum_{j} w_j = 1,\; w_j \ge 0`,
  [['chi', String.raw`\chi`]],
);

export const fucomMethod = defineMethod({
  id: FUCOM_ID,
  version: FUCOM_VERSION,
  category: 'weighting',
  nameKey: key('name'),
  supportedNumberTypes: ['crisp'],
  inputSchema: [
    { name: 'criteria', kind: 'criteria-order', required: true, numberTypes: ['crisp'] },
    { name: 'priorities', kind: 'expert-judgements', required: true, numberTypes: ['crisp'] },
  ],
  outputSchema: [{ name: 'weights', kind: 'weights', numberTypes: ['crisp'] }],
  parameters: NO_PARAMETERS,
  references: FUCOM_REFERENCES,

  validate(input: FucomInput) {
    const v = createValidation();
    validateFucom(input, v);
    return v.result();
  },

  run(input: FucomInput) {
    const { criteria, priorities } = input;
    const n = criteria.length;
    const tb = createTraceBuilder({ methodId: FUCOM_ID, methodVersion: FUCOM_VERSION });
    const items = criterionAxisItems(criteria);
    const pairs: readonly TraceAxisItem[] = items.slice(1);

    // φ_(k/(k+1)), stored at the second criterion of each pair (column j = k + 1). A vector
    // of one item is a scalar step, so cells are addressed with cell(0, index), not at().
    let phi: (index: number) => Tracked<number>;
    let phiId: string;
    if (priorities.kind === 'significance') {
      const significance = tb.input<number>({
        ...step('significance'),
        input: 'priorities',
        rows: [quantity('significance', key('rows.significance'))],
        columns: items,
        values: [[...priorities.values]],
      });
      const computed = tb.rowVector<number>({
        ...step('comparative-priorities'),
        formulas: [
          formula('priority', String.raw`{{phi}} = \frac{ {{varpi_next}} }{ {{varpi}} }`, [
            ['phi', String.raw`\varphi_{k/(k+1)}`],
            ['varpi_next', String.raw`\varpi_{(k+1)}`],
            ['varpi', String.raw`\varpi_{(k)}`],
          ]),
        ],
        items: pairs,
        row: quantity('phi', key('rows.comparativePriority')),
        cell: (column) =>
          crisp.divide(
            term(significance.at(column.index + 1), 'varpi_next'),
            term(significance.at(column.index), 'varpi'),
          ),
      });
      phi = (index) => computed.cell(0, index);
      phiId = computed.id;
    } else {
      const given = tb.input<number>({
        ...step('comparative-priorities'),
        input: 'priorities',
        rows: [quantity('phi', key('rows.comparativePriority'))],
        columns: pairs,
        values: [[...priorities.values]],
      });
      phi = (index) => given.cell(0, index);
      phiId = given.id;
    }

    // φ_(k/(k+2)) = φ_(k/(k+1)) · φ_((k+1)/(k+2)), stored at criterion k + 2.
    const transitive =
      n < 3
        ? undefined
        : tb.rowVector<number>({
            ...step('transitive-priorities'),
            formulas: [
              formula('transitive', String.raw`{{tau}} = {{phi}} \cdot {{phi_next}}`, [
                ['tau', String.raw`\varphi_{k/(k+2)}`],
                ['phi', String.raw`\varphi_{k/(k+1)}`],
                ['phi_next', String.raw`\varphi_{(k+1)/(k+2)}`],
              ]),
            ],
            items: items.slice(2),
            row: quantity('tau', key('rows.transitivePriority')),
            visualization: { view: 'bars', basedOn: phiId },
            cell: (column) =>
              crisp.multiply(
                term(phi(column.index), 'phi'),
                term(phi(column.index + 1), 'phi_next'),
              ),
          });

    // The chain: v_(1) = 1, v_(k+1) = v_(k) / φ_(k/(k+1)).
    const chain: Tracked<number>[] = [];
    const relative = tb.rowVector<number>({
      ...step('relative-weights'),
      formulas: [
        formula('first', String.raw`{{v}} = 1`, [['v', String.raw`v_{(1)}`]]),
        formula('chain', String.raw`{{v}} = \frac{ {{v_prev}} }{ {{phi}} }`, [
          ['v', String.raw`v_{(k+1)}`],
          ['v_prev', String.raw`v_{(k)}`],
          ['phi', String.raw`\varphi_{k/(k+1)}`],
        ]),
      ],
      items,
      row: quantity('v', key('rows.relativeWeight')),
      cell: (column) => {
        const tracked =
          column.index === 0
            ? constant(1, 'v')
            : crisp.divide(
                term(chain[column.index - 1]!, 'v_prev'),
                term(phi(column.index - 1), 'phi'),
              );
        chain.push(tracked);
        return { tracked, formula: column.index === 0 ? 'first' : 'chain' };
      },
    });

    const total = term(crisp.sum(relative.all()), 'v_sum');
    const weights = tb.rowVector<number>({
      ...step('weights'),
      role: 'result',
      formulas: [
        formula('weight', String.raw`{{w}} = \frac{ {{v}} }{ {{v_sum}} }`, [
          ['w', 'w_j'],
          ['v', 'v_j'],
          ['v_sum', String.raw`\sum_{k=1}^{n} v_k`],
        ]),
      ],
      items,
      row: quantity('w', key('rows.weight')),
      visualization: { view: 'bars', basedOn: relative.id },
      cell: (column) => crisp.divide(term(relative.at(column.index), 'v'), total),
    });

    // Every condition of model (5), recomputed from the final weights.
    const w = (index: number) => weights.at(index);
    const deviations = tb.table<number | null>({
      ...step('consistency-deviations'),
      formulas: [
        formula(
          'adjacent',
          String.raw`{{d}} = \left| \frac{ {{w_prev}} }{ {{w}} } - {{phi}} \right|`,
          [
            ['d', String.raw`\delta_{k/(k+1)}`],
            ['w_prev', String.raw`w_{(k)}`],
            ['w', String.raw`w_{(k+1)}`],
            ['phi', String.raw`\varphi_{k/(k+1)}`],
          ],
        ),
        formula(
          'transitive',
          String.raw`{{d}} = \left| \frac{ {{w_prev}} }{ {{w}} } - {{tau}} \right|`,
          [
            ['d', String.raw`\delta_{k/(k+2)}`],
            ['w_prev', String.raw`w_{(k)}`],
            ['w', String.raw`w_{(k+2)}`],
            ['tau', String.raw`\varphi_{k/(k+2)}`],
          ],
        ),
      ],
      // With two criteria there is no transitive condition.
      rows: [
        quantity('adjacent', key('rows.adjacentDeviation')),
        ...(transitive === undefined
          ? []
          : [quantity('transitive', key('rows.transitiveDeviation'))]),
      ],
      columns: pairs,
      visualization: { view: 'matrix', basedOn: weights.id },
      cell: (row, column) => {
        const j = column.index + 1; // position of the criterion in the ranking
        if (row.id === 'adjacent') {
          return {
            tracked: crisp.abs(
              crisp.subtract(
                crisp.divide(term(w(j - 1), 'w_prev'), term(w(j), 'w')),
                term(phi(j - 1), 'phi'),
              ),
            ),
            formula: 'adjacent',
          };
        }
        if (j < 2 || transitive === undefined) return empty(key('reasons.firstPair'));
        return {
          tracked: crisp.abs(
            crisp.subtract(
              crisp.divide(term(w(j - 2), 'w_prev'), term(w(j), 'w')),
              term(transitive.cell(0, j - 2), 'tau'),
            ),
          ),
          formula: 'transitive',
        };
      },
    });

    const conditions: Tracked<number>[] = [];
    pairs.forEach((_, c) => {
      conditions.push(deviations.cell(0, c) as Tracked<number>);
      if (transitive !== undefined && c >= 1) {
        conditions.push(deviations.cell(1, c) as Tracked<number>);
      }
    });
    const dfc = tb.scalar<number>({
      ...step('dfc'),
      role: 'result',
      formulas: [
        MODEL_FORMULA,
        formula('dfc', String.raw`{{chi}} = \max \left( {{d}} \right)`, [
          ['chi', String.raw`\chi`],
          ['d', String.raw`\delta`],
        ]),
      ],
      value: {
        tracked: term(crisp.max(conditions.map((d) => term(d, 'd'))), 'chi'),
        formula: 'dfc',
      },
    });

    const result: FucomResult = {
      weights: crispWeights(
        criteria.map((criterion) => criterion.id),
        weights.values()[0] as number[],
      ),
      dfc: dfc.at().value,
    };
    return { result, trace: tb.build() };
  },
});

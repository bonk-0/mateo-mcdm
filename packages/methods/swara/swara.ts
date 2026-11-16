/**
 * SWARA: Step-wise Weight Assessment Ratio Analysis (subjective weights).
 *
 * Formulation: docs/methods/swara.md, from Keršulienė, Zavadskas, Turskis (2010), Fig. 2 and
 * Table 1. The paper calls the recalculated weight w_j and the final weight q_j; Mateo's step
 * ids (`recalculated-weights`, `weights`) avoid the ambiguity.
 *
 * Steps: comparative importance s_j → coefficients k_j = s_j + 1 → recalculated weights
 * w_j = w_{j−1} / k_j → final weights q_j = w_j / Σ w.
 *
 * Input: `criteria` in descending importance (as ranked by the experts) and
 * `comparativeImportance`, one entry per criterion; the first entry has no meaning and is `null`.
 */
import type {
  Reference,
  TextRef,
  TraceAxisItem,
  Tracked,
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
  ISSUE_CODES,
  NO_PARAMETERS,
  term,
} from '@mateo/engine';
import { formula, quantity } from '../src/common';

export const SWARA_ID = 'swara';
export const SWARA_VERSION = '1.0.0';

export const SWARA_ISSUE_CODES = {
  /** s_j < 0: the criteria must be in descending order of importance. */
  negativeImportance: 'swara.negative-importance',
  /** The first criterion has no comparative importance, but a value was given. */
  firstImportanceIgnored: 'swara.first-importance-ignored',
} as const;

/** A criterion of a SWARA input: only its id and label matter, the order carries the ranking. */
export interface OrderedCriterion {
  readonly id: string;
  readonly name: TextRef;
}

export interface SwaraInput {
  /** In descending order of importance. */
  readonly criteria: readonly OrderedCriterion[];
  /** s_j for j ≥ 2; the entry for the first criterion is `null`. Same length as `criteria`. */
  readonly comparativeImportance: readonly (number | null)[];
}

export type SwaraResult = WeightingResult<number>;

export const SWARA_REFERENCES: readonly Reference[] = [
  {
    id: 'kersuliene2010',
    authors: ['Keršulienė, V.', 'Zavadskas, E. K.', 'Turskis, Z.'],
    year: 2010,
    title:
      'Selection of rational dispute resolution method by applying new step-wise weight assessment ratio analysis (SWARA)',
    source: 'Journal of Business Economics and Management',
    volume: '11',
    issue: '2',
    pages: '243-258',
    doi: '10.3846/jbem.2010.12',
    note: 'Original paper of the method: Fig. 2 and Table 1, used as the golden test.',
  },
];

const key = (path: string): string => `methods.swara.${path}`;
const step = (id: string) => ({
  id,
  nameKey: key(`steps.${id}.name`),
  explanationKey: key(`steps.${id}.explanation`),
});

export function criterionItems(criteria: readonly OrderedCriterion[]): TraceAxisItem[] {
  return criteria.map(({ id, name }) => ({ id, label: name, kind: 'criterion' }));
}

/** Structure checks shared with fuzzy SWARA. Returns false when the criteria are unusable. */
export function checkOrderedCriteria(
  input: unknown,
  slot: string,
  v: ValidationCollector,
): input is { criteria: OrderedCriterion[] } & Record<string, unknown> {
  const candidate = input as { criteria?: unknown; [k: string]: unknown } | null;
  if (
    typeof candidate !== 'object' ||
    candidate === null ||
    !Array.isArray(candidate.criteria) ||
    !Array.isArray(candidate[slot]) ||
    !(candidate.criteria as unknown[]).every(
      (c) => typeof c === 'object' && c !== null && typeof (c as { id?: unknown }).id === 'string',
    )
  ) {
    v.error(ISSUE_CODES.inputMalformed, { params: { input: slot }, location: { input: slot } });
    return false;
  }
  const criteria = candidate.criteria as OrderedCriterion[];
  if (criteria.length < 2) {
    v.error(ISSUE_CODES.matrixTooFewCriteria, {
      params: { count: criteria.length, min: 2 },
      location: { input: 'criteria' },
    });
    return false;
  }
  const seen = new Set<string>();
  criteria.forEach((criterion, index) => {
    if (seen.has(criterion.id)) {
      v.error(ISSUE_CODES.matrixDuplicateCriterion, {
        params: { id: criterion.id },
        location: { input: 'criteria', column: { index, id: criterion.id } },
      });
    }
    seen.add(criterion.id);
  });
  if ((candidate[slot] as unknown[]).length !== criteria.length) {
    v.error(ISSUE_CODES.matrixColumnCountMismatch, {
      params: { cells: (candidate[slot] as unknown[]).length, criteria: criteria.length },
      location: { input: slot },
    });
    return false;
  }
  return true;
}

function validateSwara(input: SwaraInput, v: ValidationCollector) {
  if (!checkOrderedCriteria(input, 'comparativeImportance', v)) return;
  input.comparativeImportance.forEach((value, index) => {
    const column = { index, id: input.criteria[index]!.id };
    const location = { input: 'comparativeImportance', column };
    if (index === 0) {
      if (value !== null && value !== undefined) {
        v.warning(SWARA_ISSUE_CODES.firstImportanceIgnored, { location });
      }
    } else if (value === null || value === undefined) {
      v.error(ISSUE_CODES.matrixMissingValue, { location });
    } else if (typeof value !== 'number' || !Number.isFinite(value)) {
      v.error(ISSUE_CODES.matrixInvalidValue, { location });
    } else if (value < 0) {
      v.error(SWARA_ISSUE_CODES.negativeImportance, { params: { value }, location });
    }
  });
}

export const swaraMethod = defineMethod({
  id: SWARA_ID,
  version: SWARA_VERSION,
  category: 'weighting',
  nameKey: key('name'),
  supportedNumberTypes: ['crisp'],
  inputSchema: [
    { name: 'criteria', kind: 'criteria-order', required: true, numberTypes: ['crisp'] },
    {
      name: 'comparativeImportance',
      kind: 'expert-judgements',
      required: true,
      numberTypes: ['crisp'],
    },
  ],
  outputSchema: [{ name: 'weights', kind: 'weights', numberTypes: ['crisp'] }],
  parameters: NO_PARAMETERS,
  references: SWARA_REFERENCES,

  validate(input: SwaraInput) {
    const v = createValidation();
    validateSwara(input, v);
    return v.result();
  },

  run(input: SwaraInput) {
    const { criteria } = input;
    const tb = createTraceBuilder({ methodId: SWARA_ID, methodVersion: SWARA_VERSION });
    const items = criterionItems(criteria);
    const sRow = quantity('s', key('rows.s'));

    // The first criterion has no comparative importance, so the input step starts at the second.
    const s = tb.input<number>({
      ...step('comparative-importance'),
      input: 'comparativeImportance',
      rows: [sRow],
      columns: items.slice(1),
      values: [input.comparativeImportance.slice(1) as number[]],
    });

    // k_1 = 1, k_j = s_j + 1.
    const k = tb.rowVector<number>({
      ...step('coefficients'),
      formulas: [
        formula('first', String.raw`{{k}} = 1`, [['k', 'k_1']]),
        formula('coefficient', String.raw`{{k}} = {{s}} + 1`, [
          ['k', 'k_j'],
          ['s', 's_j'],
        ]),
      ],
      items,
      row: quantity('k', key('rows.k')),
      cell: (column) =>
        column.index === 0
          ? { tracked: constant(1, 'k'), formula: 'first' }
          : {
              tracked: crisp.add(term(s.cell(0, column.index - 1), 's'), 1),
              formula: 'coefficient',
            },
    });

    // w_1 = 1, w_j = w_{j−1} / k_j.
    const recalculated: Tracked<number>[] = [];
    const w = tb.rowVector<number>({
      ...step('recalculated-weights'),
      formulas: [
        formula('first', String.raw`{{w}} = 1`, [['w', 'w_1']]),
        formula('recalculated', String.raw`{{w}} = \frac{ {{w_prev}} }{ {{k}} }`, [
          ['w', 'w_j'],
          ['w_prev', 'w_{j-1}'],
          ['k', 'k_j'],
        ]),
      ],
      items,
      row: quantity('w', key('rows.w')),
      cell: (column) => {
        if (column.index === 0) {
          const first = constant(1, 'w');
          recalculated.push(first);
          return { tracked: first, formula: 'first' };
        }
        const tracked = crisp.divide(
          term(recalculated[column.index - 1]!, 'w_prev'),
          term(k.at(column.index), 'k'),
        );
        recalculated.push(tracked);
        return { tracked, formula: 'recalculated' };
      },
    });

    // q_j = w_j / Σ_k w_k.
    const total = term(crisp.sum(w.all()), 'w_sum');
    const q = tb.rowVector<number>({
      ...step('weights'),
      role: 'result',
      formulas: [
        formula('weight', String.raw`{{q}} = \frac{ {{w}} }{ {{w_sum}} }`, [
          ['q', 'q_j'],
          ['w', 'w_j'],
          ['w_sum', String.raw`\sum_{k=1}^{m} w_k`],
        ]),
      ],
      items,
      row: quantity('q', key('rows.q')),
      visualization: { view: 'bars', basedOn: w.id },
      cell: (column) => crisp.divide(term(w.at(column.index), 'w'), total),
    });

    const result: SwaraResult = {
      weights: crispWeights(
        criteria.map((criterion) => criterion.id),
        q.values()[0] as number[],
      ),
    };
    return { result, trace: tb.build() };
  },
});

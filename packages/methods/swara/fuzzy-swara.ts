/**
 * Fuzzy SWARA with triangular fuzzy numbers: IMF SWARA (improved fuzzy SWARA).
 *
 * Formulation: docs/methods/swara.md, from Vrtagić et al. (2021), Eqs. 9-11, with the scale
 * and worked example of Damjanović et al. (2022), Tables 2 and 4. The comparison scale is data
 * (`input.scale`, default `IMF_SWARA_SCALE`), so another scale needs no new code.
 *
 * Deviations from the printed text, both documented in docs/methods/swara.md:
 * - k̃_j = s̃_j ⊕ (1, 1, 1): Eq. 9 of the Axioms paper omits the "+ 1", every example uses it.
 * - The crisp weights are defuzzified (graded mean by default) and then explicitly normalized,
 *   because defuzzification is not additive and the raw crisp weights sum to 1.0003 or so.
 *   The raw values are kept in the trace (`crisp-weights`).
 *
 * Steps: assessments s̃_j → coefficients k̃_j → recalculated weights q̃_j → Σq̃ → fuzzy
 * weights w̃_j → crisp weights → normalized crisp weights.
 */
import type {
  Reference,
  Tracked,
  ValidationCollector,
  WeightingResult,
  WeightVector,
} from '@mateo/engine';
import {
  createTraceBuilder,
  createValidation,
  crisp,
  crispWeights,
  defineMethod,
  defineParameters,
  ISSUE_CODES,
  term,
} from '@mateo/engine';
import type { DefuzzificationId, LinguisticScale, TFN } from '@mateo/fuzzy';
import { checkLinguisticScale, encodeTfn, findTerm, IMF_SWARA_SCALE, tfnOps } from '@mateo/fuzzy';
import { formula, quantity } from '../src/common';
import type { OrderedCriterion } from './swara';
import { checkOrderedCriteria, criterionItems, SWARA_REFERENCES } from './swara';

export const FUZZY_SWARA_ID = 'fuzzy-swara';
export const FUZZY_SWARA_VERSION = '1.0.0';

export const FUZZY_SWARA_ISSUE_CODES = {
  /** An assessment is not a term of the scale. */
  unknownTerm: 'fuzzy-swara.unknown-term',
  /** A term of the scale has a negative component, so k̃_j = s̃_j ⊕ 1 could fall below 1. */
  negativeScaleValue: 'fuzzy-swara.negative-scale-value',
  /** The first criterion has no assessment, but a value was given. */
  firstAssessmentIgnored: 'fuzzy-swara.first-assessment-ignored',
} as const;

export interface FuzzySwaraInput {
  /** In descending order of significance. */
  readonly criteria: readonly OrderedCriterion[];
  /** Term (id or abbreviation) of the scale for j ≥ 2; the first entry is `null`. */
  readonly assessments: readonly (string | null)[];
  /** Comparison scale. Default `IMF_SWARA_SCALE`. */
  readonly scale?: LinguisticScale;
}

export interface FuzzySwaraResult extends WeightingResult<number> {
  /** Fuzzy weights w̃_j, before defuzzification. */
  readonly fuzzyWeights: WeightVector<TFN>;
}

const parameters = defineParameters({
  defuzzification: {
    type: 'enum',
    labelKey: 'methods.fuzzySwara.parameters.defuzzification.label',
    descriptionKey: 'methods.fuzzySwara.parameters.defuzzification.description',
    default: 'graded-mean',
    options: [
      {
        value: 'graded-mean',
        labelKey: 'methods.fuzzySwara.parameters.defuzzification.gradedMean',
      },
      { value: 'centroid', labelKey: 'methods.fuzzySwara.parameters.defuzzification.centroid' },
    ],
  },
});

export const FUZZY_SWARA_REFERENCES: readonly Reference[] = [
  {
    id: 'vrtagic2021',
    authors: [
      'Vrtagić, S.',
      'Softić, E.',
      'Subotić, M.',
      'Stević, Ž.',
      'Dordevic, M.',
      'Ponjavic, M.',
    ],
    year: 2021,
    title: 'Ranking road sections based on MCDM model: New improved fuzzy SWARA (IMF SWARA)',
    source: 'Axioms',
    volume: '10',
    issue: '2',
    pages: '92',
    doi: '10.3390/axioms10020092',
    note: 'Procedure, Eqs. 9-11. Eq. 9 omits the "+ 1" of k̃_j; see docs/methods/swara.md.',
  },
  {
    id: 'damjanovic2022',
    authors: ['Damjanović, M.', 'Stević, Ž.', 'Stanimirović, D.', 'Tanackov, I.', 'Marinković, D.'],
    year: 2022,
    title: 'Impact of the number of vehicles on traffic safety: multiphase modeling',
    source: 'Facta Universitatis, Series: Mechanical Engineering',
    volume: '20',
    issue: '1',
    pages: '177-197',
    doi: '10.22190/FUME220215012D',
    note: 'Section 3.3, Tables 2 and 4: scale and worked examples S1, S2, S3 and S6, used as golden tests.',
  },
  ...SWARA_REFERENCES,
];

const key = (path: string): string => `methods.fuzzySwara.${path}`;
const step = (id: string) => ({
  id,
  nameKey: key(`steps.${id}.name`),
  explanationKey: key(`steps.${id}.explanation`),
});

function validateFuzzySwara(input: FuzzySwaraInput, v: ValidationCollector) {
  if (!checkOrderedCriteria(input, 'assessments', v)) return;
  const scale = input.scale ?? IMF_SWARA_SCALE;
  v.add(checkLinguisticScale(scale));
  if (v.hasErrors) return;
  scale.terms.forEach((item) => {
    if (item.value.l < 0) {
      v.error(FUZZY_SWARA_ISSUE_CODES.negativeScaleValue, {
        params: { term: item.abbreviation },
        location: { input: 'scale' },
      });
    }
  });
  input.assessments.forEach((value, index) => {
    const location = { input: 'assessments', column: { index, id: input.criteria[index]!.id } };
    if (index === 0) {
      if (value !== null && value !== undefined) {
        v.warning(FUZZY_SWARA_ISSUE_CODES.firstAssessmentIgnored, { location });
      }
    } else if (value === null || value === undefined) {
      v.error(ISSUE_CODES.matrixMissingValue, { location });
    } else if (findTerm(scale, value) === undefined) {
      v.error(FUZZY_SWARA_ISSUE_CODES.unknownTerm, { params: { term: String(value) }, location });
    }
  });
}

export const fuzzySwaraMethod = defineMethod({
  id: FUZZY_SWARA_ID,
  version: FUZZY_SWARA_VERSION,
  category: 'weighting',
  nameKey: key('name'),
  supportedNumberTypes: ['tfn'],
  inputSchema: [
    { name: 'criteria', kind: 'criteria-order', required: true, numberTypes: ['tfn'] },
    { name: 'assessments', kind: 'expert-judgements', required: true, numberTypes: ['tfn'] },
  ],
  outputSchema: [
    { name: 'fuzzyWeights', kind: 'weights', numberTypes: ['tfn'] },
    { name: 'weights', kind: 'weights', numberTypes: ['crisp'] },
  ],
  parameters,
  references: FUZZY_SWARA_REFERENCES,

  validate(input: FuzzySwaraInput) {
    const v = createValidation();
    validateFuzzySwara(input, v);
    return v.result();
  },

  run(input: FuzzySwaraInput, params) {
    const { criteria } = input;
    const scale = input.scale ?? IMF_SWARA_SCALE;
    const defuzzification: DefuzzificationId = params.defuzzification;
    const tb = createTraceBuilder({ methodId: FUZZY_SWARA_ID, methodVersion: FUZZY_SWARA_VERSION });
    const items = criterionItems(criteria);

    const assessed = input.assessments.slice(1).map((value) => findTerm(scale, value)!.value);
    const s = tb.input<TFN>({
      ...step('assessments'),
      input: 'assessments',
      encode: encodeTfn,
      rows: [quantity('s', key('rows.s'))],
      columns: items.slice(1),
      values: [assessed],
    });

    // k̃_1 = (1, 1, 1), k̃_j = s̃_j ⊕ 1.
    const k = tb.rowVector<TFN>({
      ...step('coefficients'),
      formulas: [
        formula('first', String.raw`{{k}} = (1, 1, 1)`, [['k', String.raw`\tilde{k}_1`]]),
        formula('coefficient', String.raw`{{k}} = {{s}} \oplus 1`, [
          ['k', String.raw`\tilde{k}_j`],
          ['s', String.raw`\tilde{s}_j`],
        ]),
      ],
      items,
      row: quantity('k', key('rows.k')),
      cell: (column) =>
        column.index === 0
          ? { tracked: tfnOps.fromCrisp(1), formula: 'first' }
          : {
              tracked: tfnOps.addScalar(term(s.cell(0, column.index - 1), 's'), 1),
              formula: 'coefficient',
            },
    });

    // q̃_1 = (1, 1, 1), q̃_j = q̃_{j−1} ⊘ k̃_j.
    const chain: Tracked<TFN>[] = [];
    const q = tb.rowVector<TFN>({
      ...step('recalculated-weights'),
      formulas: [
        formula('first', String.raw`{{q}} = (1, 1, 1)`, [['q', String.raw`\tilde{q}_1`]]),
        formula('recalculated', String.raw`{{q}} = \frac{ {{q_prev}} }{ {{k}} }`, [
          ['q', String.raw`\tilde{q}_j`],
          ['q_prev', String.raw`\tilde{q}_{j-1}`],
          ['k', String.raw`\tilde{k}_j`],
        ]),
      ],
      items,
      row: quantity('q', key('rows.q')),
      cell: (column) => {
        const tracked =
          column.index === 0
            ? tfnOps.fromCrisp(1)
            : tfnOps.divide(
                term(chain[column.index - 1]!, 'q_prev'),
                term(k.at(column.index), 'k'),
              );
        chain.push(tracked);
        return { tracked, formula: column.index === 0 ? 'first' : 'recalculated' };
      },
    });

    const sum = tb.scalar<TFN>({
      ...step('recalculated-weights-sum'),
      formulas: [
        formula('sum', String.raw`{{Q}} = \sum_{j=1}^{m} {{q}}`, [
          ['Q', String.raw`\sum_{j} \tilde{q}_j`],
          ['q', String.raw`\tilde{q}_j`],
        ]),
      ],
      value: tfnOps.sum(term(q.all(), 'q')),
    });

    // w̃_j = q̃_j ⊘ Σ q̃.
    const w = tb.rowVector<TFN>({
      ...step('fuzzy-weights'),
      formulas: [
        formula('weight', String.raw`{{w}} = \frac{ {{q}} }{ {{Q}} }`, [
          ['w', String.raw`\tilde{w}_j`],
          ['q', String.raw`\tilde{q}_j`],
          ['Q', String.raw`\sum_{j} \tilde{q}_j`],
        ]),
      ],
      items,
      row: quantity('w', key('rows.w')),
      cell: (column) => tfnOps.divide(term(q.at(column.index), 'q'), term(sum.at(), 'Q')),
    });

    const crispRaw = tb.rowVector<number>({
      ...step('crisp-weights'),
      explanationParams: { defuzzification },
      formulas: [
        formula(
          'defuzzify',
          defuzzification === 'graded-mean'
            ? String.raw`{{c}} = \frac{ l + 4m + u }{ 6 }, \; {{w}} = (l, m, u)`
            : String.raw`{{c}} = \frac{ l + m + u }{ 3 }, \; {{w}} = (l, m, u)`,
          [
            ['c', 'w_j^{crisp}'],
            ['w', String.raw`\tilde{w}_j`],
          ],
        ),
      ],
      items,
      row: quantity('c', key('rows.c')),
      cell: (column) => tfnOps.defuzzify(defuzzification, term(w.at(column.index), 'w')),
    });

    // Defuzzification is not additive, so the raw crisp weights do not sum to exactly 1.
    const total = term(crisp.sum(crispRaw.all()), 'c_sum');
    const weights = tb.rowVector<number>({
      ...step('weights'),
      role: 'result',
      formulas: [
        formula('normalized', String.raw`{{w}} = \frac{ {{c}} }{ {{c_sum}} }`, [
          ['w', 'w_j'],
          ['c', 'w_j^{crisp}'],
          ['c_sum', String.raw`\sum_{k} w_k^{crisp}`],
        ]),
      ],
      items,
      row: quantity('w', key('rows.weight')),
      visualization: { view: 'bars', basedOn: crispRaw.id },
      cell: (column) => crisp.divide(term(crispRaw.at(column.index), 'c'), total),
    });

    const ids = criteria.map((criterion) => criterion.id);
    const result: FuzzySwaraResult = {
      weights: crispWeights(ids, weights.values()[0] as number[]),
      fuzzyWeights: {
        numberType: 'tfn',
        entries: ids.map((criterionId, j) => ({
          criterionId,
          value: (w.values()[0] as TFN[])[j]!,
        })),
      },
    };
    return { result, trace: tb.build() };
  },
});

/**
 * The scales that ship with Mateo: two general rating scales and the scales of the Phase 1
 * reference papers. The values of the paper scales are copied from the verified sources of
 * P1.4 (`docs/methods`) and are compared with the method fixtures in the tests of
 * `@mateo/methods`.
 */
import type { Reference } from '@mateo/engine';
import { textKey } from '@mateo/engine';
import type { LinguisticScale, LinguisticScaleKind, LinguisticTerm } from './scales';
import { defineScale } from './scales';
import type { TfnTuple } from './tfn';
import { fromTuple } from './tfn';

type TermRow = readonly [id: string, abbreviation: string, value: TfnTuple];

function scale(
  id: string,
  kind: LinguisticScaleKind,
  rows: readonly TermRow[],
  references?: readonly Reference[],
): LinguisticScale {
  return defineScale({
    id,
    name: textKey(`scales.${id}.name`),
    kind,
    terms: rows.map(([termId, abbreviation, value]): LinguisticTerm => ({
      id: termId,
      label: textKey(`scales.${id}.terms.${termId}`),
      abbreviation,
      value: fromTuple(value),
    })),
    ...(references === undefined ? {} : { references }),
  });
}

/**
 * General 5-level rating scale: an even triangular partition of 1–9. Not taken from a
 * paper. Like the 7-level scale it is strictly positive on purpose, so it can be used with
 * methods that divide by a rating (cost criteria in Fuzzy MARCOS).
 */
export const FIVE_LEVEL_SCALE = scale('five-level', 'rating', [
  ['very-low', 'VL', [1, 1, 3]],
  ['low', 'L', [1, 3, 5]],
  ['medium', 'M', [3, 5, 7]],
  ['high', 'H', [5, 7, 9]],
  ['very-high', 'VH', [7, 9, 9]],
]);

/** General 7-level rating scale: an even triangular partition of 1–7. Not taken from a paper. */
export const SEVEN_LEVEL_SCALE = scale('seven-level', 'rating', [
  ['very-low', 'VL', [1, 1, 2]],
  ['low', 'L', [1, 2, 3]],
  ['medium-low', 'ML', [2, 3, 4]],
  ['medium', 'M', [3, 4, 5]],
  ['medium-high', 'MH', [4, 5, 6]],
  ['high', 'H', [5, 6, 7]],
  ['very-high', 'VH', [6, 7, 7]],
]);

/** The 9-term rating scale of the Fuzzy MARCOS paper (Stanković et al. 2020, Tables 1–2). */
export const FUZZY_MARCOS_SCALE = scale(
  'fuzzy-marcos',
  'rating',
  [
    ['extremely-poor', 'EP', [1, 1, 1]],
    ['very-poor', 'VP', [1, 1, 3]],
    ['poor', 'P', [1, 3, 3]],
    ['medium-poor', 'MP', [3, 3, 5]],
    ['medium', 'M', [3, 5, 5]],
    ['medium-good', 'MG', [5, 5, 7]],
    ['good', 'G', [5, 7, 7]],
    ['very-good', 'VG', [7, 7, 9]],
    ['extremely-good', 'EG', [7, 9, 9]],
  ],
  [
    {
      id: 'stankovic2020',
      authors: ['Stanković, M.', 'Stević, Ž.', 'Das, D. K.', 'Subotić, M.', 'Pamučar, D.'],
      year: 2020,
      title: 'A new fuzzy MARCOS method for road traffic risk analysis',
      source: 'Mathematics',
      volume: '8',
      issue: '3',
      pages: '457',
      doi: '10.3390/math8030457',
      note: 'Tables 1 and 2.',
    },
  ],
);

/**
 * The comparison scale of IMF SWARA: how much less significant a criterion is than the one
 * ranked just above it. Listed from "equally significant" `(0, 0, 0)` upwards, the reverse
 * of the order in which the papers print it.
 */
export const IMF_SWARA_SCALE = scale(
  'imf-swara',
  'comparison',
  [
    ['equally-significant', 'ES', [0, 0, 0]],
    ['weakly-less-significant', 'WLS', [2 / 9, 1 / 4, 2 / 7]],
    ['moderately-less-significant', 'MDLS', [1 / 4, 2 / 7, 1 / 3]],
    ['less-significant', 'LS', [2 / 7, 1 / 3, 2 / 5]],
    ['really-less-significant', 'RLS', [1 / 3, 2 / 5, 1 / 2]],
    ['much-less-significant', 'MLS', [2 / 5, 1 / 2, 2 / 3]],
    ['dominantly-less-significant', 'DLS', [1 / 2, 2 / 3, 1]],
    ['absolutely-less-significant', 'ALS', [1, 1, 1]],
  ],
  [
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
      note: 'The paper that introduces the scale.',
    },
    {
      id: 'damjanovic2022',
      authors: [
        'Damjanović, M.',
        'Stević, Ž.',
        'Stanimirović, D.',
        'Tanackov, I.',
        'Marinković, D.',
      ],
      year: 2022,
      title: 'Impact of the number of vehicles on traffic safety: multiphase modeling',
      source: 'Facta Universitatis, Series: Mechanical Engineering',
      volume: '20',
      issue: '1',
      pages: '177–197',
      doi: '10.22190/FUME220215012D',
      note: 'Table 2, the source the values were read from (see docs/methods/swara.md).',
    },
  ],
);

/** Every predefined scale, in the order the scale manager lists them. */
export const PREDEFINED_SCALES: readonly LinguisticScale[] = Object.freeze([
  FIVE_LEVEL_SCALE,
  SEVEN_LEVEL_SCALE,
  FUZZY_MARCOS_SCALE,
  IMF_SWARA_SCALE,
]);

/** The predefined scale with the given id, or `undefined`. */
export function findPredefinedScale(id: string): LinguisticScale | undefined {
  return PREDEFINED_SCALES.find((candidate) => candidate.id === id);
}

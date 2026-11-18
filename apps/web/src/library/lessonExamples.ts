import type { DecisionMatrix, MethodRunRecord } from '@mateo/engine';
import { crispWeights, textKey } from '@mateo/engine';
import type { TFN } from '@mateo/fuzzy';
import { executeJob } from '../workspace/runnerCore';
import { sampleMethodId, type SampleId } from './samples';

/**
 * The small example every lesson of the Method Library is taught on: three phones, A, B and
 * C, on price (lower is better), battery life and camera score. Small and familiar on
 * purpose, so that each number can be followed by eye. It runs through the real method like
 * any analysis; the paper's reference example stays on the page under "Reference".
 */

const PRICE = [20000, 15000, 25000];
const BATTERY = [30, 24, 36];
const CAMERA = [7, 8, 9];
/** Price matters most, then battery, then camera. */
const WEIGHTS = [0.4, 0.35, 0.25];

const PHONES = ['A', 'B', 'C'];
const CRITERIA = [
  { id: 'price', direction: 'cost' as const },
  { id: 'battery', direction: 'benefit' as const },
  { id: 'camera', direction: 'benefit' as const },
];

const criterionName = (id: string) => textKey(`explain:lessonExample.criteria.${id}`);

function matrix<T>(values: readonly (readonly T[])[], numberType: string): DecisionMatrix<T> {
  return {
    alternatives: PHONES.map((name) => ({
      id: name,
      name: textKey('explain:lessonExample.phone', { name }),
    })),
    criteria: CRITERIA.map((criterion) => ({
      id: criterion.id,
      name: criterionName(criterion.id),
      direction: criterion.direction,
      numberType,
    })),
    values,
  };
}

const crispRows = (): number[][] => PHONES.map((_, i) => [PRICE[i]!, BATTERY[i]!, CAMERA[i]!]);

/** About the crisp value: a tenth of the price either way, two hours of battery, one camera point. */
const fuzzyRows = (): TFN[][] =>
  PHONES.map((_, i) => [
    { l: PRICE[i]! - 2000, m: PRICE[i]!, u: PRICE[i]! + 2000 },
    { l: BATTERY[i]! - 2, m: BATTERY[i]!, u: BATTERY[i]! + 2 },
    { l: CAMERA[i]! - 1, m: CAMERA[i]!, u: CAMERA[i]! + 1 },
  ]);

const weights = () =>
  crispWeights(
    CRITERIA.map((criterion) => criterion.id),
    WEIGHTS,
  );

/** The criteria in order of importance, for SWARA. */
const ordered = () =>
  CRITERIA.map((criterion) => ({ id: criterion.id, name: criterionName(criterion.id) }));

function lessonInput(id: SampleId): unknown {
  switch (id) {
    case 'marcos':
      return { matrix: matrix(crispRows(), 'crisp'), weights: weights() };
    case 'fuzzy-marcos':
      return { matrix: matrix(fuzzyRows(), 'tfn'), weights: weights() };
    case 'critic':
    case 'merec':
      return { matrix: matrix(crispRows(), 'crisp') };
    case 'swara':
      // Battery is 20% less important than price, camera 30% less important than battery.
      return { criteria: ordered(), comparativeImportance: [null, 0.2, 0.3] };
    case 'fuzzy-swara':
      return { criteria: ordered(), assessments: [null, 'WLS', 'LS'] };
  }
}

/** The run of a lesson example, with the method's default parameters. */
export function runLessonExample(id: SampleId): MethodRunRecord<unknown> {
  const outcome = executeJob({
    methodId: sampleMethodId(id),
    input: lessonInput(id),
    parameters: {},
  });
  if (!outcome.ok) throw new Error(`The lesson example of ${id} does not run.`);
  return outcome.record;
}

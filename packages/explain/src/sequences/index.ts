import type { ExplainSequence } from '../types';
import { criticSequence } from './critic';
import { fuzzyMarcosSequence } from './fuzzy-marcos';
import { fuzzySwaraSequence } from './fuzzy-swara';
import { marcosSequence } from './marcos';
import { merecSequence } from './merec';
import { swaraSequence } from './swara';

export { criticSequence } from './critic';
export { fuzzyMarcosSequence } from './fuzzy-marcos';
export { fuzzySwaraSequence } from './fuzzy-swara';
export { marcosSequence } from './marcos';
export { merecSequence } from './merec';
export { swaraSequence } from './swara';

/** Every Phase 1 method has a lesson: three weighting and two ranking ones. */
export const EXPLAIN_SEQUENCES: readonly ExplainSequence[] = [
  marcosSequence,
  fuzzyMarcosSequence,
  criticSequence,
  merecSequence,
  swaraSequence,
  fuzzySwaraSequence,
];

/** The lesson of a method, or `undefined` when it has none. */
export function sequenceFor(methodId: string): ExplainSequence | undefined {
  return EXPLAIN_SEQUENCES.find((sequence) => sequence.methodId === methodId);
}

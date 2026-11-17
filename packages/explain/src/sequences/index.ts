import type { ExplainSequence } from '../types';
import { fuzzyMarcosSequence } from './fuzzy-marcos';
import { marcosSequence } from './marcos';

export { fuzzyMarcosSequence } from './fuzzy-marcos';
export { marcosSequence } from './marcos';

/** Every method that has an animated explanation. Weighting methods follow in P1.14. */
export const EXPLAIN_SEQUENCES: readonly ExplainSequence[] = [marcosSequence, fuzzyMarcosSequence];

/** The explain sequence of a method, or `undefined` when it has none yet. */
export function sequenceFor(methodId: string): ExplainSequence | undefined {
  return EXPLAIN_SEQUENCES.find((sequence) => sequence.methodId === methodId);
}

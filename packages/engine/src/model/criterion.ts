import type { NumberTypeId } from './number-type';
import type { TextRef } from './text';

/** `benefit`: larger is better. `cost`: smaller is better. */
export type CriterionDirection = 'benefit' | 'cost';

export const CRITERION_DIRECTIONS: readonly CriterionDirection[] = ['benefit', 'cost'];

export interface Criterion {
  /** Stable id, unique within a model. Never shown to the user. */
  readonly id: string;
  /** Name key (built-in) or literal label (user data). */
  readonly name: TextRef;
  readonly direction: CriterionDirection;
  /** Free-form measurement unit, for display only. */
  readonly unit?: string;
  /** How the cells of this criterion are represented. */
  readonly numberType: NumberTypeId;
}

export function isCriterionDirection(value: unknown): value is CriterionDirection {
  return value === 'benefit' || value === 'cost';
}

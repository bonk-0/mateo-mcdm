import type { TextParams } from '../model/text';

/**
 * `error`: the run is blocked. `warning`: the run is allowed and the warning is stored
 * with the analysis (docs/plan.md §9).
 */
export type Severity = 'error' | 'warning';

/** One side of a location: the position in the input and, when known, the entity id. */
export interface AxisLocation {
  readonly index: number;
  readonly id?: string;
}

/**
 * Where an issue is. Every field is optional: an issue about a whole column has only
 * `column`, an issue about a parameter has only `parameter`.
 */
export interface ValidationLocation {
  /** Name of the input slot (see `InputSlot.name`), for example `matrix` or `weights`. */
  readonly input?: string;
  /** Row of the input: the alternative for a decision matrix. */
  readonly row?: AxisLocation;
  /** Column of the input: the criterion for a decision matrix or a weight vector. */
  readonly column?: AxisLocation;
  /** Name of the method parameter. */
  readonly parameter?: string;
}

export interface ValidationIssue {
  readonly severity: Severity;
  /**
   * Stable machine code, for example `matrix.missing-value`. Codes are part of the public
   * contract: tests, stored analyses and the UI match on them, so they never change meaning.
   */
  readonly code: string;
  /** i18n key of the message (ICU message format). */
  readonly messageKey: string;
  /** Values interpolated into the message. */
  readonly params?: TextParams;
  readonly location?: ValidationLocation;
}

export interface ValidationResult {
  /** True when there are no errors. Warnings do not affect it. */
  readonly ok: boolean;
  readonly errors: readonly ValidationIssue[];
  readonly warnings: readonly ValidationIssue[];
}

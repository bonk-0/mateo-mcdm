export type ExplainErrorCode =
  /** The sequence was written for another method. */
  | 'METHOD_MISMATCH'
  /** The trace has a step the lesson does not teach. */
  | 'UNPLANNED_STEP'
  /** The lesson expects a step the trace does not have. */
  | 'MISSING_STEP'
  /** The lesson does not fit the trace: a step taught twice, or out of order. */
  | 'INVALID_PLAN';

/** A sequence and a trace that do not fit together. Always a programming error. */
export class ExplainError extends Error {
  readonly code: ExplainErrorCode;
  readonly details: Readonly<Record<string, unknown>>;

  constructor(code: ExplainErrorCode, message: string, details: Record<string, unknown> = {}) {
    super(message);
    this.name = 'ExplainError';
    this.code = code;
    this.details = details;
  }
}

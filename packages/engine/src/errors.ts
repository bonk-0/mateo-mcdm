/**
 * Programming and invariant errors raised by the engine.
 *
 * Problems with *user data* are never reported by throwing: they are returned as
 * {@link ValidationResult} issues so the UI can show all of them at once. `EngineError`
 * is the backstop for broken invariants (a method author's bug, a trace that would
 * contain `NaN`, a duplicate registration and so on).
 */
export type EngineErrorCode =
  | 'NON_FINITE_VALUE'
  | 'INVALID_TRACE'
  | 'UNKNOWN_REFERENCE'
  | 'DUPLICATE_ID'
  | 'INVALID_ARGUMENT'
  | 'INVALID_METHOD'
  | 'UNKNOWN_METHOD'
  | 'NON_DETERMINISTIC'
  | 'VALIDATION_FAILED'
  | 'SOLVER_FAILED';

export type EngineErrorDetails = Readonly<Record<string, unknown>>;

export class EngineError extends Error {
  readonly code: EngineErrorCode;
  readonly details: EngineErrorDetails;

  constructor(code: EngineErrorCode, message: string, details: EngineErrorDetails = {}) {
    super(message);
    this.name = 'EngineError';
    this.code = code;
    this.details = details;
  }
}

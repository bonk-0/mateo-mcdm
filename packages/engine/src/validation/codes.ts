/**
 * Issue codes reported by the shared checks of the engine. Method packages define their
 * own codes prefixed with the method id (for example `merec.non-positive-value`).
 */
export const ISSUE_CODES = {
  /** The input is not an object of the expected shape at all. */
  inputMalformed: 'input.malformed',

  matrixNoAlternatives: 'matrix.no-alternatives',
  matrixNoCriteria: 'matrix.no-criteria',
  matrixTooFewAlternatives: 'matrix.too-few-alternatives',
  matrixTooFewCriteria: 'matrix.too-few-criteria',
  matrixRowCountMismatch: 'matrix.row-count-mismatch',
  matrixColumnCountMismatch: 'matrix.column-count-mismatch',
  matrixDuplicateAlternative: 'matrix.duplicate-alternative',
  matrixDuplicateCriterion: 'matrix.duplicate-criterion',
  matrixInvalidDirection: 'matrix.invalid-direction',
  matrixUnsupportedNumberType: 'matrix.unsupported-number-type',
  matrixMissingValue: 'matrix.missing-value',
  matrixInvalidValue: 'matrix.invalid-value',
  matrixNegativeValue: 'matrix.negative-value',
  matrixNonPositiveValue: 'matrix.non-positive-value',
  matrixConstantCriterion: 'matrix.constant-criterion',

  weightsEmpty: 'weights.empty',
  weightsMissing: 'weights.missing',
  weightsUnknownCriterion: 'weights.unknown-criterion',
  weightsDuplicate: 'weights.duplicate',
  weightsInvalidValue: 'weights.invalid-value',
  weightsNegative: 'weights.negative',
  weightsZeroSum: 'weights.zero-sum',
  weightsNotNormalized: 'weights.not-normalized',

  parameterUnknown: 'parameter.unknown',
  parameterInvalidType: 'parameter.invalid-type',
  parameterOutOfRange: 'parameter.out-of-range',
  parameterNotInteger: 'parameter.not-integer',
  parameterInvalidOption: 'parameter.invalid-option',

  /** The method needs an optimization solver and none could be loaded. */
  solverUnavailable: 'solver.unavailable',
  /** The solver did not return an optimum for a model that has one. */
  solverFailed: 'solver.failed',
} as const;

export type EngineIssueCode = (typeof ISSUE_CODES)[keyof typeof ISSUE_CODES];

import { EngineError } from '../errors';
import type { Trace } from '../trace/types';
import type { VerifyTraceOptions } from '../trace/verify';
import { withoutTraceRecording } from '../trace/builder';
import { assertValidTrace } from '../trace/verify';
import type { LinearSolver } from '../solver/linear-program';
import { SolverFailure } from '../solver/failure';
import { ISSUE_CODES } from '../validation/codes';
import { createIssue, mergeValidation } from '../validation/collector';
import type { ValidationIssue, ValidationResult } from '../validation/types';
import type { Method, MethodContext } from './method';
import type { ParameterSchema, ParameterValuesOf } from './parameters';
import { resolveParameters } from './parameters';

/**
 * Everything the engine knows about one run. With the dataset snapshot id, the app
 * version and a timestamp added by the storage layer it is the stored analysis record of
 * docs/plan.md §13. It is plain JSON.
 */
export interface MethodRunRecord<TResult, TSchema extends ParameterSchema = ParameterSchema> {
  readonly methodId: string;
  readonly methodVersion: string;
  /** Every parameter with the value actually used, defaults included. */
  readonly parameters: ParameterValuesOf<TSchema>;
  readonly result: TResult;
  readonly trace: Trace;
  /** Warnings reported by validation; the run went ahead despite them. */
  readonly warnings: readonly ValidationIssue[];
}

/** Thrown by `runMethod` when validation reports errors. */
export class MethodValidationError extends EngineError {
  readonly validation: ValidationResult;

  constructor(methodId: string, validation: ValidationResult) {
    super(
      'VALIDATION_FAILED',
      `Method "${methodId}" cannot run: ${validation.errors.map((issue) => issue.code).join(', ')}.`,
      { methodId, codes: validation.errors.map((issue) => issue.code) },
    );
    this.name = 'MethodValidationError';
    this.validation = validation;
  }
}

/**
 * Validates parameters and input without running. Parameter issues come first. The
 * method's own `validate` is only called when the parameters are valid.
 */
export function validateMethodRun<TInput, TSchema extends ParameterSchema, TResult>(
  method: Method<TInput, TSchema, TResult>,
  input: TInput,
  params?: Partial<ParameterValuesOf<TSchema>>,
): ValidationResult {
  const resolved = resolveParameters(method.parameters, params ?? {});
  if (!resolved.validation.ok) return resolved.validation;
  return mergeValidation(resolved.validation, method.validate(input, resolved.values));
}

export interface RunMethodOptions {
  /**
   * Record the trace (default). With `false` the method still computes everything, but its
   * trace builder stores nothing: the record's trace has no steps, and the result is
   * identical to a traced run. For callers that only read the result, such as a
   * sensitivity sweep. Cannot be combined with `verifyTrace`.
   */
  readonly recordTrace?: boolean;
  /**
   * Audit the produced trace with `verifyTrace` and throw if it is inconsistent. Meant for
   * tests and debugging; off by default because it roughly doubles the work.
   */
  readonly verifyTrace?: boolean | VerifyTraceOptions;
  /**
   * The solver for methods that declare the `linear-solver` requirement. Without it such
   * a method is not run: `runMethod` throws a {@link MethodValidationError} with the issue
   * `solver.unavailable`. Ignored by other methods.
   */
  readonly solver?: LinearSolver;
}

/** Adds one error to a validation result. */
function withError(validation: ValidationResult, error: ValidationIssue): ValidationResult {
  return { ok: false, errors: [...validation.errors, error], warnings: validation.warnings };
}

/**
 * The one way to run a method: resolve parameters, validate, run, and return the record.
 * Throws {@link MethodValidationError} when validation reports errors, so `run` never sees
 * input its own `validate` rejected. A required service that is missing, and a solver that
 * fails inside `run` ({@link SolverFailure}), are reported the same way.
 */
export function runMethod<TInput, TSchema extends ParameterSchema, TResult>(
  method: Method<TInput, TSchema, TResult>,
  input: TInput,
  params?: Partial<ParameterValuesOf<TSchema>>,
  options: RunMethodOptions = {},
): MethodRunRecord<TResult, TSchema> {
  const resolved = resolveParameters(method.parameters, params ?? {});
  const validation = resolved.validation.ok
    ? mergeValidation(resolved.validation, method.validate(input, resolved.values))
    : resolved.validation;
  if (!validation.ok) throw new MethodValidationError(method.id, validation);

  const recordTrace = options.recordTrace !== false;
  if (!recordTrace && options.verifyTrace !== undefined && options.verifyTrace !== false) {
    throw new EngineError(
      'INVALID_ARGUMENT',
      'verifyTrace needs a recorded trace; it cannot be combined with recordTrace: false.',
    );
  }
  // A method receives only the services it declares.
  const needsSolver = method.requires?.includes('linear-solver') === true;
  if (needsSolver && options.solver === undefined) {
    throw new MethodValidationError(
      method.id,
      withError(validation, createIssue('error', ISSUE_CODES.solverUnavailable)),
    );
  }
  const context: MethodContext = needsSolver ? { solver: options.solver } : {};
  let run: ReturnType<typeof method.run>;
  try {
    run = recordTrace
      ? method.run(input, resolved.values, context)
      : withoutTraceRecording(() => method.run(input, resolved.values, context));
  } catch (error) {
    if (error instanceof SolverFailure) {
      throw new MethodValidationError(method.id, withError(validation, error.issue));
    }
    throw error;
  }
  const { result, trace } = run;
  if (trace.methodId !== method.id || trace.methodVersion !== method.version) {
    throw new EngineError(
      'INVALID_TRACE',
      `Method "${method.id}" ${method.version} returned a trace labelled "${trace.methodId}" ${trace.methodVersion}.`,
      { methodId: method.id, methodVersion: method.version },
    );
  }
  if (options.verifyTrace !== undefined && options.verifyTrace !== false) {
    assertValidTrace(trace, options.verifyTrace === true ? {} : options.verifyTrace);
  }
  return {
    methodId: method.id,
    methodVersion: method.version,
    parameters: resolved.values,
    result,
    trace,
    warnings: validation.warnings,
  };
}

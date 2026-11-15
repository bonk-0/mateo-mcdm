import { EngineError } from '../errors';
import type { Trace } from '../trace/types';
import type { VerifyTraceOptions } from '../trace/verify';
import { assertValidTrace } from '../trace/verify';
import { mergeValidation } from '../validation/collector';
import type { ValidationIssue, ValidationResult } from '../validation/types';
import type { Method } from './method';
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
   * Audit the produced trace with `verifyTrace` and throw if it is inconsistent. Meant for
   * tests and debugging; off by default because it roughly doubles the work.
   */
  readonly verifyTrace?: boolean | VerifyTraceOptions;
}

/**
 * The one way to run a method: resolve parameters, validate, run, and return the record.
 * Throws {@link MethodValidationError} when validation reports errors, so `run` never sees
 * input its own `validate` rejected.
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

  const { result, trace } = method.run(input, resolved.values);
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

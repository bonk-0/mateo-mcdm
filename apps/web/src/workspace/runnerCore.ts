import {
  MethodValidationError,
  runMethod,
  type RunMethodOptions,
  type MethodRunRecord,
  type ValidationResult,
} from '@mateo/engine';
import { workspaceRegistry } from './registry';

export type ParameterValues = Readonly<Record<string, string | number | boolean>>;

/** Everything needed to run one method. Plain data, so it can cross into a Web Worker. */
export interface RunJob {
  readonly methodId: string;
  readonly input: unknown;
  readonly parameters: ParameterValues;
}

type RunFailure =
  | { readonly ok: false; readonly kind: 'validation'; readonly validation: ValidationResult }
  | { readonly ok: false; readonly kind: 'error'; readonly message: string };

export type RunOutcome =
  { readonly ok: true; readonly record: MethodRunRecord<unknown> } | RunFailure;

/**
 * The outcome of a run whose caller only reads the result (a sensitivity scenario). The
 * engine runs the method without recording a trace, so there is nothing to copy out of
 * the worker either; the result is identical to a traced run.
 */
export type ResultOutcome = { readonly ok: true; readonly result: unknown } | RunFailure;

/** Whether the job's method needs the optimization solver (BWM). */
export function jobNeedsSolver(job: RunJob): boolean {
  return workspaceRegistry().find(job.methodId)?.requires?.includes('linear-solver') === true;
}

/**
 * Runs a job through the engine's `runMethod`. Used in the worker, and directly where
 * workers do not exist (tests).
 */
export function executeJob(job: RunJob, options: RunMethodOptions = {}): RunOutcome {
  try {
    const method = workspaceRegistry().get(job.methodId);
    const record = runMethod(method, job.input, job.parameters as never, options);
    return { ok: true, record };
  } catch (error) {
    if (error instanceof MethodValidationError) {
      return { ok: false, kind: 'validation', validation: error.validation };
    }
    return {
      ok: false,
      kind: 'error',
      message: error instanceof Error ? error.message : String(error),
    };
  }
}

/** {@link executeJob} for callers that only need the result: no trace is recorded. */
export function executeResultJob(
  job: RunJob,
  options: Pick<RunMethodOptions, 'solver'> = {},
): ResultOutcome {
  const outcome = executeJob(job, { ...options, recordTrace: false });
  return outcome.ok ? { ok: true, result: outcome.record.result } : outcome;
}

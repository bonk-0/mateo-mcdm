import {
  MethodValidationError,
  runMethod,
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

export type RunOutcome =
  | { readonly ok: true; readonly record: MethodRunRecord<unknown> }
  | { readonly ok: false; readonly kind: 'validation'; readonly validation: ValidationResult }
  | { readonly ok: false; readonly kind: 'error'; readonly message: string };

/**
 * Runs a job through the engine's `runMethod`. Used in the worker, and directly where
 * workers do not exist (tests).
 */
export function executeJob(job: RunJob): RunOutcome {
  try {
    const method = workspaceRegistry().get(job.methodId);
    const record = runMethod(method, job.input, job.parameters as never);
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

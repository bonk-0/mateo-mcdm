import type { ProjectSession, StoredAnalysis } from '@mateo/project';
import { saveAnalysis, type AnalysisConfiguration } from './analyses';
import { runJob, type RunJob, type RunOutcome } from './runner';

export type WorkflowResult =
  | { readonly ok: true; readonly analysis: StoredAnalysis }
  | { readonly ok: false; readonly outcome: Extract<RunOutcome, { ok: false }> };

/**
 * Runs a job in the worker and stores the result with a snapshot of the dataset. The
 * analysis that comes back is read from the project file, so what the page shows is what
 * was stored.
 */
export async function runAndStore(params: {
  readonly session: ProjectSession;
  readonly datasetId: string;
  readonly job: RunJob;
  readonly numberType: string;
  readonly configuration: AnalysisConfiguration;
}): Promise<WorkflowResult> {
  const outcome = await runJob(params.job);
  if (!outcome.ok) return { ok: false, outcome };
  const summary = await saveAnalysis(params.session, {
    datasetId: params.datasetId,
    record: outcome.record,
    methodInput: params.job.input,
    numberType: params.numberType,
    configuration: params.configuration,
  });
  return { ok: true, analysis: await params.session.getAnalysis(summary.id) };
}

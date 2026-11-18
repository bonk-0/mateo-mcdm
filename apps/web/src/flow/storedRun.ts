import type { ProjectSession, StoredAnalysis } from '@mateo/project';
import { useEffect, useMemo, useState } from 'react';
import { runAndStore, type WorkflowResult } from '../workspace/runWorkflow';
import type { RunOutcome } from '../workspace/runnerCore';
import type { RunPlan } from './plan';

/** JSON with sorted object keys, so equal values give equal text whatever their key order. */
export function stableJson(value: unknown): string {
  return JSON.stringify(value, (_key, item: unknown) =>
    item && typeof item === 'object' && !Array.isArray(item)
      ? Object.fromEntries(
          Object.entries(item as Record<string, unknown>).sort(([a], [b]) => (a < b ? -1 : 1)),
        )
      : item,
  );
}

function keyOf(datasetId: string, plan: RunPlan): string {
  return stableJson({ datasetId, ...plan });
}

/** Runs already stored in each open project, by the key of what they calculated. */
const runs = new WeakMap<ProjectSession, Map<string, Promise<WorkflowResult>>>();

/** How many of the newest analyses of the same method are checked for one to reuse. */
const REUSE_DEPTH = 3;

/**
 * A stored analysis that calculated exactly this: same method, input, parameters and
 * configuration. Reopening a project shows its results without storing them again.
 */
async function findStored(
  session: ProjectSession,
  datasetId: string,
  plan: RunPlan,
): Promise<StoredAnalysis | null> {
  const list = await session.listAnalyses(datasetId);
  const candidates = list
    .filter((item) => item.methodId === plan.job.methodId)
    .slice(-REUSE_DEPTH)
    .reverse();
  const wanted = stableJson({
    input: plan.job.input,
    parameters: plan.job.parameters,
    configuration: plan.configuration,
  });
  for (const candidate of candidates) {
    const stored = await session.getAnalysis(candidate.id);
    const found = stableJson({
      input: stored.methodInput,
      parameters: stored.record.parameters,
      configuration: stored.configuration,
    });
    if (found === wanted) return stored;
  }
  return null;
}

function runOnce(session: ProjectSession, datasetId: string, plan: RunPlan) {
  let byKey = runs.get(session);
  if (!byKey) runs.set(session, (byKey = new Map<string, Promise<WorkflowResult>>()));
  const key = keyOf(datasetId, plan);
  let pending = byKey.get(key);
  if (!pending) {
    pending = findStored(session, datasetId, plan)
      .catch(() => null)
      .then((stored): Promise<WorkflowResult> | WorkflowResult =>
        stored ? { ok: true, analysis: stored } : runAndStore({ session, datasetId, ...plan }),
      );
    // A failed run is not kept, so the next change tries again.
    const stored = pending;
    void stored.then(
      (result) => !result.ok && byKey.delete(key),
      () => byKey.delete(key),
    );
    byKey.set(key, pending);
  }
  return pending;
}

export type RunState =
  | { readonly status: 'idle' }
  /** `previous`: the last result, shown while the new one is calculated. */
  | { readonly status: 'running'; readonly previous: StoredAnalysis | null }
  | { readonly status: 'done'; readonly analysis: StoredAnalysis }
  | { readonly status: 'failed'; readonly outcome: Extract<RunOutcome, { ok: false }> };

/**
 * Calculates `plan` as soon as it settles and stores the analysis in the project, so the
 * person never presses "Run". The same calculation is stored once: asking again, here or
 * on another step, returns the stored analysis.
 */
export function useStoredRun(
  session: ProjectSession,
  datasetId: string,
  plan: RunPlan | null,
  delay = 350,
): RunState {
  const key = useMemo(() => (plan ? keyOf(datasetId, plan) : null), [datasetId, plan]);
  const [state, setState] = useState<{ key: string | null; value: RunState }>({
    key: null,
    value: { status: 'idle' },
  });

  useEffect(() => {
    if (!plan || key === null) {
      setState({ key: null, value: { status: 'idle' } });
      return;
    }
    let cancelled = false;
    const previous = (current: RunState): StoredAnalysis | null =>
      current.status === 'done'
        ? current.analysis
        : current.status === 'running'
          ? current.previous
          : null;
    setState((current) => ({
      key,
      value: { status: 'running', previous: previous(current.value) },
    }));
    const known = runs.get(session)?.has(key) ?? false;
    const timer = setTimeout(
      () => {
        void runOnce(session, datasetId, plan).then(
          (result) => {
            if (cancelled) return;
            setState({
              key,
              value: result.ok
                ? { status: 'done', analysis: result.analysis }
                : { status: 'failed', outcome: result.outcome },
            });
          },
          (error: unknown) => {
            if (cancelled) return;
            const message = error instanceof Error ? error.message : String(error);
            setState({
              key,
              value: { status: 'failed', outcome: { ok: false, kind: 'error', message } },
            });
          },
        );
      },
      // A calculation already made comes back at once; a new one waits for typing to pause.
      known ? 0 : delay,
    );
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // `key` stands for `plan`: a new plan object with the same content changes nothing.
  }, [session, datasetId, key]);

  if (state.key === key) return state.value;
  // The plan changed and the effect has not caught up yet: keep showing the last result.
  return key === null
    ? { status: 'idle' }
    : { status: 'running', previous: shownAnalysis(state.value) };
}

/** The analysis to show: the finished one, or the previous one while a new one runs. */
export function shownAnalysis(state: RunState): StoredAnalysis | null {
  if (state.status === 'done') return state.analysis;
  if (state.status === 'running') return state.previous;
  return null;
}

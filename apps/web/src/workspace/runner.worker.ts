/// <reference lib="webworker" />
import type { LinearSolver } from '@mateo/engine';
import {
  executeJob,
  executeResultJob,
  jobNeedsSolver,
  type ResultOutcome,
  type RunJob,
  type RunOutcome,
} from './runnerCore';
import { loadSolver } from './solver';

export interface WorkerRequest {
  readonly id: number;
  readonly job: RunJob;
  /** Send back only the result, not the trace. */
  readonly resultOnly?: boolean;
}

export interface WorkerResponse {
  readonly id: number;
  readonly outcome: RunOutcome | ResultOutcome;
}

/**
 * The solver for a job whose method needs one, loaded on first use. A load failure leaves
 * it undefined: the engine then reports the translated `solver.unavailable` error.
 */
async function solverFor(job: RunJob): Promise<LinearSolver | undefined> {
  if (!jobNeedsSolver(job)) return undefined;
  try {
    return await loadSolver();
  } catch (error) {
    console.error('The optimization solver could not be loaded.', error);
    return undefined;
  }
}

/** Runs methods off the main thread so the interface stays responsive. */
self.addEventListener('message', (event: MessageEvent<WorkerRequest>) => {
  const { id, job, resultOnly } = event.data;
  void solverFor(job).then((solver) => {
    const options = solver === undefined ? {} : { solver };
    const outcome = resultOnly === true ? executeResultJob(job, options) : executeJob(job, options);
    const response: WorkerResponse = { id, outcome };
    self.postMessage(response);
  });
});

/// <reference lib="webworker" />
import {
  executeJob,
  executeResultJob,
  type ResultOutcome,
  type RunJob,
  type RunOutcome,
} from './runnerCore';

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

/** Runs methods off the main thread so the interface stays responsive. */
self.addEventListener('message', (event: MessageEvent<WorkerRequest>) => {
  const { id, job, resultOnly } = event.data;
  const outcome = resultOnly === true ? executeResultJob(job) : executeJob(job);
  const response: WorkerResponse = { id, outcome };
  self.postMessage(response);
});

/// <reference lib="webworker" />
import { executeJob, type RunJob, type RunOutcome } from './runnerCore';

export interface WorkerRequest {
  readonly id: number;
  readonly job: RunJob;
}

export interface WorkerResponse {
  readonly id: number;
  readonly outcome: RunOutcome;
}

/** Runs methods off the main thread so the interface stays responsive. */
self.addEventListener('message', (event: MessageEvent<WorkerRequest>) => {
  const { id, job } = event.data;
  const response: WorkerResponse = { id, outcome: executeJob(job) };
  self.postMessage(response);
});

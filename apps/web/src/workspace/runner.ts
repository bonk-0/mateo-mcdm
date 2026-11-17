import {
  executeJob,
  executeResultJob,
  type ResultOutcome,
  type RunJob,
  type RunOutcome,
} from './runnerCore';
import type { WorkerRequest, WorkerResponse } from './runner.worker';

export type { ParameterValues, ResultOutcome, RunJob, RunOutcome } from './runnerCore';

interface Pending {
  readonly resolve: (outcome: RunOutcome | ResultOutcome) => void;
}

let worker: Worker | undefined;
let nextId = 1;
const pending = new Map<number, Pending>();

function failAll(message: string): void {
  for (const [id, entry] of pending) {
    pending.delete(id);
    entry.resolve({ ok: false, kind: 'error', message });
  }
}

function startWorker(): Worker | undefined {
  if (typeof Worker === 'undefined') return undefined;
  if (worker) return worker;
  const created = new Worker(new URL('./runner.worker.ts', import.meta.url), { type: 'module' });
  created.addEventListener('message', (event: MessageEvent<WorkerResponse>) => {
    const entry = pending.get(event.data.id);
    if (!entry) return;
    pending.delete(event.data.id);
    entry.resolve(event.data.outcome);
  });
  created.addEventListener('error', (event) => {
    worker = undefined;
    created.terminate();
    failAll(event.message || 'The calculation worker stopped.');
  });
  worker = created;
  return created;
}

function post<T extends RunOutcome | ResultOutcome>(
  target: Worker,
  job: RunJob,
  resultOnly: boolean,
): Promise<T> {
  return new Promise((resolve) => {
    const id = nextId++;
    pending.set(id, { resolve: resolve as (outcome: RunOutcome | ResultOutcome) => void });
    const request: WorkerRequest = { id, job, ...(resultOnly ? { resultOnly } : {}) };
    target.postMessage(request);
  });
}

/**
 * Runs a method in a Web Worker. Without Worker support (unit tests) it runs in place, so
 * both paths use the same `executeJob`.
 */
export function runJob(job: RunJob): Promise<RunOutcome> {
  const target = startWorker();
  if (!target) return Promise.resolve(executeJob(job));
  return post<RunOutcome>(target, job, false);
}

/** {@link runJob} for callers that only read the result: the trace stays in the worker. */
export function runResultJob(job: RunJob): Promise<ResultOutcome> {
  const target = startWorker();
  if (!target) return Promise.resolve(executeResultJob(job));
  return post<ResultOutcome>(target, job, true);
}

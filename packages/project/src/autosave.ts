import { ProjectError } from './errors';

/** What autosave needs from a `ProjectSession`. */
export interface AutosaveTarget {
  readonly isDirty: boolean;
  readonly isClosed: boolean;
  save(): Promise<void>;
  subscribe(listener: () => void): () => void;
}

/** `setTimeout` and `clearTimeout`, injectable for tests. */
export interface Scheduler {
  set(callback: () => void, delayMs: number): unknown;
  clear(handle: unknown): void;
}

export interface AutosaveOptions {
  /** Quiet time after the last edit before saving. Default 1500 ms. */
  readonly delayMs?: number;
  /** Longest time a change may stay unsaved while edits keep coming. Default 10 s. */
  readonly maxDelayMs?: number;
  readonly scheduler?: Scheduler;
  /** Called after each successful autosave. */
  readonly onSaved?: () => void;
  /**
   * Called when a save fails, so the app can tell the user. The change stays dirty and is
   * retried after the next edit.
   */
  readonly onError: (error: unknown) => void;
}

export interface Autosave {
  /** Saves now if there is anything to save, and waits for it. Rejects if that save fails. */
  flush(): Promise<void>;
  /** Stops watching. Pending changes are not saved: call `flush` first. */
  dispose(): void;
}

function platformScheduler(): Scheduler {
  const platform = globalThis as {
    setTimeout?: (callback: () => void, delayMs: number) => unknown;
    clearTimeout?: (handle: unknown) => void;
  };
  const { setTimeout, clearTimeout } = platform;
  if (!setTimeout || !clearTimeout) {
    throw new ProjectError('INVALID_ARGUMENT', 'No timers available; pass a scheduler.');
  }
  return { set: (callback, delayMs) => setTimeout(callback, delayMs), clear: clearTimeout };
}

/**
 * The autosave hook: saves a project a short while after it was last edited, so that the
 * file follows the editor without a save per keystroke.
 */
export function createAutosave(target: AutosaveTarget, options: AutosaveOptions): Autosave {
  const delayMs = options.delayMs ?? 1500;
  const maxDelayMs = Math.max(delayMs, options.maxDelayMs ?? 10_000);
  const scheduler = options.scheduler ?? platformScheduler();
  let timer: unknown;
  let deadline: unknown;
  let disposed = false;

  const cancel = (): void => {
    if (timer !== undefined) scheduler.clear(timer);
    if (deadline !== undefined) scheduler.clear(deadline);
    timer = undefined;
    deadline = undefined;
  };

  const saveNow = async (): Promise<void> => {
    cancel();
    if (target.isClosed || !target.isDirty) return;
    await target.save();
    options.onSaved?.();
  };

  const fire = (): void => {
    saveNow().catch((error: unknown) => options.onError(error));
  };

  const unsubscribe = target.subscribe(() => {
    if (disposed || target.isClosed || !target.isDirty) return;
    if (timer !== undefined) scheduler.clear(timer);
    timer = scheduler.set(fire, delayMs);
    deadline ??= scheduler.set(fire, maxDelayMs);
  });

  return {
    flush: saveNow,
    dispose() {
      disposed = true;
      cancel();
      unsubscribe();
    },
  };
}

import { describe, expect, it, vi } from 'vitest';
import { createAutosave, type AutosaveTarget, type Scheduler } from './autosave';
import { setCells } from './history/commands';
import { crispCell } from './model/cells';
import {
  createTestRepository,
  createTestStorage,
  fillSample,
  SAMPLE_DATASET,
} from './testing/harness';

/** Timers driven by hand. */
function manualScheduler() {
  let now = 0;
  let serial = 0;
  const timers = new Map<number, { at: number; callback: () => void }>();
  const scheduler: Scheduler = {
    set(callback, delayMs) {
      timers.set(++serial, { at: now + delayMs, callback });
      return serial;
    },
    clear(handle) {
      timers.delete(handle as number);
    },
  };
  return {
    scheduler,
    pending: () => timers.size,
    async advance(ms: number) {
      now += ms;
      for (const [id, timer] of [...timers]) {
        if (timer.at <= now && timers.delete(id)) timer.callback();
      }
      // Let the save that a timer started settle.
      for (let i = 0; i < 20; i += 1) await Promise.resolve();
    },
  };
}

function fakeTarget() {
  const listeners = new Set<() => void>();
  const target = {
    isDirty: false,
    isClosed: false,
    saves: 0,
    fail: false,
    save() {
      if (target.fail) return Promise.reject(new Error('disk full'));
      target.saves += 1;
      target.isDirty = false;
      return Promise.resolve();
    },
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => void listeners.delete(listener);
    },
    edit() {
      target.isDirty = true;
      for (const listener of listeners) listener();
    },
  };
  return target satisfies AutosaveTarget;
}

describe('autosave', () => {
  it('saves once after edits stop', async () => {
    const timers = manualScheduler();
    const target = fakeTarget();
    const onSaved = vi.fn();
    createAutosave(target, {
      delayMs: 1000,
      scheduler: timers.scheduler,
      onSaved,
      onError: vi.fn(),
    });
    target.edit();
    await timers.advance(600);
    target.edit();
    await timers.advance(600);
    expect(target.saves).toBe(0);
    await timers.advance(400);
    expect(target.saves).toBe(1);
    expect(onSaved).toHaveBeenCalledTimes(1);
    expect(timers.pending()).toBe(0);
    await timers.advance(60_000);
    expect(target.saves).toBe(1);
  });

  it('saves at the latest after maxDelayMs while edits keep coming', async () => {
    const timers = manualScheduler();
    const target = fakeTarget();
    createAutosave(target, {
      delayMs: 1000,
      maxDelayMs: 3000,
      scheduler: timers.scheduler,
      onError: vi.fn(),
    });
    for (let i = 0; i < 6; i += 1) {
      target.edit();
      await timers.advance(500);
    }
    expect(target.saves).toBe(1);
  });

  it('reports failures and tries again after the next edit', async () => {
    const timers = manualScheduler();
    const target = fakeTarget();
    const onError = vi.fn();
    const autosave = createAutosave(target, { delayMs: 100, scheduler: timers.scheduler, onError });
    target.fail = true;
    target.edit();
    await timers.advance(100);
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ message: 'disk full' }));
    await expect(autosave.flush()).rejects.toThrow('disk full');
    target.fail = false;
    target.edit();
    await timers.advance(100);
    expect(target.saves).toBe(1);
  });

  it('flushes on demand and stops when disposed or closed', async () => {
    const timers = manualScheduler();
    const target = fakeTarget();
    const autosave = createAutosave(target, {
      delayMs: 100,
      scheduler: timers.scheduler,
      onError: vi.fn(),
    });
    await autosave.flush();
    expect(target.saves).toBe(0);
    target.edit();
    await autosave.flush();
    expect(target.saves).toBe(1);
    expect(timers.pending()).toBe(0);

    target.edit();
    target.isClosed = true;
    await timers.advance(1000);
    expect(target.saves).toBe(1);
    target.isClosed = false;

    target.edit();
    autosave.dispose();
    target.edit();
    await timers.advance(1000);
    expect(target.saves).toBe(1);
    expect(timers.pending()).toBe(0);
  });

  it('works with a real session and the platform timers', async () => {
    const test = await createTestStorage('wasm');
    const repository = createTestRepository(test.storage);
    const session = await repository.create('auto.mateo', { name: 'Auto' });
    const saved = new Promise<void>((resolve) => {
      createAutosave(session, { delayMs: 5, onSaved: resolve, onError: vi.fn() });
    });
    fillSample(session);
    session.execute(
      setCells(SAMPLE_DATASET.id, 'm-decision', [
        { alternativeId: 'a-1', criterionId: 'c-price', value: crispCell(1) },
      ]),
    );
    await saved;
    expect(session.isDirty).toBe(false);
    const check = await repository.open('auto.mateo');
    expect(check.document.model).toEqual(session.document.model);
  });
});

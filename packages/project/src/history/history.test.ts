import { describe, expect, it, vi } from 'vitest';
import { composeCommands, History, type Command } from './history';

const add = (n: number, mergeKey?: string): Command<number> => ({
  type: 'add',
  labelKey: 'test.add',
  ...(mergeKey === undefined ? {} : { mergeKey }),
  apply: (state) => state + n,
});

describe('History', () => {
  it('undoes and redoes commands exactly', () => {
    const history = new History(0);
    const listener = vi.fn();
    history.subscribe(listener);
    history.execute(add(1));
    history.execute(add(10));
    expect(history.present).toBe(11);
    expect(history.canUndo).toBe(true);
    expect(history.canRedo).toBe(false);
    expect(history.nextUndo).toEqual({ type: 'add', labelKey: 'test.add' });

    expect(history.undo()).toBe(1);
    expect(history.undo()).toBe(0);
    expect(history.undo()).toBe(0);
    expect(history.canUndo).toBe(false);
    expect(history.nextUndo).toBeUndefined();
    expect(history.nextRedo).toEqual({ type: 'add', labelKey: 'test.add' });
    expect(history.redo()).toBe(1);
    expect(history.redo()).toBe(11);
    expect(history.redo()).toBe(11);
    expect(listener).toHaveBeenCalledTimes(6);
  });

  it('drops the redo steps when a new command is executed', () => {
    const history = new History(0);
    history.execute(add(1));
    history.undo();
    history.execute(add(5));
    expect(history.canRedo).toBe(false);
    expect(history.present).toBe(5);
  });

  it('records nothing for a command that changes nothing', () => {
    const history = new History(3);
    const listener = vi.fn();
    const unsubscribe = history.subscribe(listener);
    history.execute(add(0));
    expect(history.canUndo).toBe(false);
    expect(listener).not.toHaveBeenCalled();
    unsubscribe();
    history.execute(add(1));
    expect(listener).not.toHaveBeenCalled();
  });

  it('merges consecutive commands with the same merge key into one step', () => {
    const history = new History(0);
    history.execute(add(1, 'typing'));
    history.execute(add(1, 'typing'));
    history.execute(add(1, 'typing'));
    history.execute(add(100, 'other'));
    expect(history.undo()).toBe(3);
    expect(history.undo()).toBe(0);
    expect(history.redo()).toBe(3);

    // After undo/redo, sealing, or an unkeyed command a new step starts.
    history.execute(add(1, 'typing'));
    history.sealMerge();
    history.execute(add(1, 'typing'));
    history.execute(add(1));
    history.execute(add(1, 'typing'));
    expect([history.undo(), history.undo(), history.undo(), history.undo()]).toEqual([6, 5, 4, 3]);
  });

  it('keeps at most `limit` undo steps', () => {
    const history = new History(0, { limit: 3 });
    for (let i = 0; i < 10; i += 1) history.execute(add(1));
    expect([history.undo(), history.undo(), history.undo(), history.undo()]).toEqual([9, 8, 7, 7]);
  });

  it('forgets everything on reset', () => {
    const history = new History(0);
    history.execute(add(1));
    history.undo();
    history.reset(42);
    expect([history.present, history.canUndo, history.canRedo]).toEqual([42, false, false]);
  });

  it('composes commands into one step', () => {
    const history = new History(0);
    history.execute(
      composeCommands([add(1), add(2), add(3)], { type: 'paste', labelKey: 'test.paste' }),
    );
    expect(history.present).toBe(6);
    expect(history.nextUndo).toEqual({ type: 'paste', labelKey: 'test.paste' });
    expect(history.undo()).toBe(0);
  });
});

/**
 * Undo/redo over immutable state.
 *
 * A command is a pure function from one state to the next. Because states share every
 * unchanged part, the history simply keeps the earlier states: undo and redo are exact by
 * construction, and no command needs to know how to reverse itself.
 */
export interface Command<S> {
  /** Stable identifier of the kind of edit, for example `cells.set`. */
  readonly type: string;
  /** i18n key of the text shown in "Undo ..." and "Redo ...". */
  readonly labelKey: string;
  /**
   * Consecutive commands with the same merge key become one undo step (typing in one
   * cell, dragging a slider). Call `History.sealMerge` to end such a run.
   */
  readonly mergeKey?: string;
  /** Returns the next state. Must not modify `state`. Returning `state` means no change. */
  apply(state: S): S;
}

export interface HistoryEntry {
  readonly type: string;
  readonly labelKey: string;
}

interface Step<S> extends HistoryEntry {
  /** The state on the other side of the step: before it (undo) or after it (redo). */
  readonly state: S;
  readonly mergeKey: string | undefined;
}

export interface HistoryOptions {
  /** Maximum number of undo steps kept. Older ones are dropped. Default 200. */
  readonly limit?: number;
}

export class History<S> {
  private current: S;
  private past: Step<S>[] = [];
  private future: Step<S>[] = [];
  private mergeOpen = false;
  private readonly limit: number;
  private readonly listeners = new Set<() => void>();

  constructor(initial: S, options: HistoryOptions = {}) {
    this.current = initial;
    this.limit = Math.max(1, options.limit ?? 200);
  }

  get present(): S {
    return this.current;
  }

  get canUndo(): boolean {
    return this.past.length > 0;
  }

  get canRedo(): boolean {
    return this.future.length > 0;
  }

  /** The step `undo` would revert, for the menu label. */
  get nextUndo(): HistoryEntry | undefined {
    return entryOf(this.past.at(-1));
  }

  get nextRedo(): HistoryEntry | undefined {
    return entryOf(this.future.at(-1));
  }

  /** Applies a command and records it. Anything that could be redone is discarded. */
  execute(command: Command<S>): S {
    const next = command.apply(this.current);
    if (next === this.current) return next;
    const last = this.past.at(-1);
    const merges =
      this.mergeOpen &&
      command.mergeKey !== undefined &&
      last !== undefined &&
      last.mergeKey === command.mergeKey;
    if (!merges) {
      this.past.push({
        type: command.type,
        labelKey: command.labelKey,
        mergeKey: command.mergeKey,
        state: this.current,
      });
      if (this.past.length > this.limit) this.past.shift();
    }
    this.mergeOpen = command.mergeKey !== undefined;
    this.future = [];
    this.current = next;
    this.emit();
    return next;
  }

  undo(): S {
    const step = this.past.pop();
    if (step) {
      this.future.push({ ...step, state: this.current });
      this.current = step.state;
      this.mergeOpen = false;
      this.emit();
    }
    return this.current;
  }

  redo(): S {
    const step = this.future.pop();
    if (step) {
      this.past.push({ ...step, state: this.current });
      this.current = step.state;
      this.mergeOpen = false;
      this.emit();
    }
    return this.current;
  }

  /** Ends a run of merging commands: the next command starts a new undo step. */
  sealMerge(): void {
    this.mergeOpen = false;
  }

  /** Replaces the state and forgets all steps (a project was opened or replaced). */
  reset(state: S): void {
    this.current = state;
    this.past = [];
    this.future = [];
    this.mergeOpen = false;
    this.emit();
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private emit(): void {
    for (const listener of [...this.listeners]) listener();
  }
}

function entryOf<S>(step: Step<S> | undefined): HistoryEntry | undefined {
  return step && { type: step.type, labelKey: step.labelKey };
}

/** Several commands as one undo step, for example a paste that also adds rows. */
export function composeCommands<S>(
  commands: readonly Command<S>[],
  meta: { type: string; labelKey: string },
): Command<S> {
  return {
    ...meta,
    apply: (state) => commands.reduce((next, command) => command.apply(next), state),
  };
}

/**
 * Keeps a project open in one place at a time.
 *
 * The browser storage holds a project in memory and writes the whole file back after each
 * transaction, so two tabs (or windows) editing the same project would overwrite each
 * other's changes without noticing. A lock per project, held while it is open, prevents
 * that: the second tab is told the project is in use instead.
 */
export interface ProjectLocks {
  /**
   * Takes the lock of `location` if nobody holds it. Resolves with the function that
   * releases it, or `null` when it is held elsewhere (another tab, or this one).
   */
  acquire(location: string): Promise<(() => void) | null>;
  /** Whether the lock of `location` is held anywhere, this tab included. */
  isHeld(location: string): Promise<boolean>;
}

/**
 * The part of the Web Locks API (`navigator.locks`) used here. Described structurally,
 * because this package has no DOM types.
 */
export interface LockManagerLike {
  request(
    name: string,
    options: { readonly mode: 'exclusive'; readonly ifAvailable: true },
    callback: (lock: unknown) => Promise<void> | void,
  ): Promise<unknown>;
  query(): Promise<{ readonly held?: readonly { readonly name?: string }[] }>;
}

const PREFIX = 'mateo-project:';

/**
 * Locks shared by every tab and window of the same origin, through the Web Locks API. The
 * browser releases a tab's locks when the tab closes or crashes, so a lock is never left
 * behind.
 */
export function webProjectLocks(manager: LockManagerLike): ProjectLocks {
  return {
    acquire(location) {
      return new Promise((resolve, reject) => {
        manager
          .request(`${PREFIX}${location}`, { mode: 'exclusive', ifAvailable: true }, (lock) => {
            if (lock === null) {
              resolve(null);
              return;
            }
            // The lock is held until this promise settles.
            return new Promise<void>((release) => {
              resolve(() => release());
            });
          })
          .catch(reject);
      });
    },
    async isHeld(location) {
      const { held = [] } = await manager.query();
      return held.some((lock) => lock.name === `${PREFIX}${location}`);
    },
  };
}

/** Locks within one JavaScript realm, for tests and as a stand-in for `navigator.locks`. */
export function memoryProjectLocks(): ProjectLocks {
  const held = new Set<string>();
  return {
    acquire(location) {
      if (held.has(location)) return Promise.resolve(null);
      held.add(location);
      let released = false;
      return Promise.resolve(() => {
        if (released) return;
        released = true;
        held.delete(location);
      });
    },
    isHeld: (location) => Promise.resolve(held.has(location)),
  };
}

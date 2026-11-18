/**
 * The list of recently used projects. It belongs to the app, not to any project file, so
 * it is kept in a small key-value store the app provides: `localStorage` fits.
 */
export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface RecentProject {
  /** File name in the browser's project storage. */
  readonly location: string;
  /** Project name at the time it was last used. */
  readonly name: string;
  /** ISO 8601 UTC timestamp of the last use. */
  readonly openedAt: string;
}

export interface RecentProjects {
  /** Most recently used first. */
  list(): RecentProject[];
  /** Puts a project at the top of the list. */
  add(project: RecentProject): void;
  /** Removes a project, for example when its file no longer exists. */
  remove(location: string): void;
  clear(): void;
  subscribe(listener: () => void): () => void;
}

export interface RecentProjectsOptions {
  /** Maximum number of entries. Default 10. */
  readonly limit?: number;
  /** Key in the store. Default `mateo.recentProjects`. */
  readonly key?: string;
}

function isRecentProject(value: unknown): value is RecentProject {
  const item = value as Partial<RecentProject> | null;
  return (
    typeof item === 'object' &&
    item !== null &&
    typeof item.location === 'string' &&
    typeof item.name === 'string' &&
    typeof item.openedAt === 'string'
  );
}

export function createRecentProjects(
  store: KeyValueStore,
  options: RecentProjectsOptions = {},
): RecentProjects {
  const limit = Math.max(1, options.limit ?? 10);
  const key = options.key ?? 'mateo.recentProjects';
  const listeners = new Set<() => void>();

  const read = (): RecentProject[] => {
    try {
      const parsed: unknown = JSON.parse(store.getItem(key) ?? '[]');
      if (!Array.isArray(parsed)) return [];
      return parsed
        .filter(isRecentProject)
        .map(({ location, name, openedAt }) => ({ location, name, openedAt }))
        .slice(0, limit);
    } catch {
      // Unreadable preferences are not worth failing for: start with an empty list.
      return [];
    }
  };
  const write = (projects: readonly RecentProject[]): void => {
    try {
      store.setItem(key, JSON.stringify(projects.slice(0, limit)));
    } catch {
      // A full or unavailable preference store must not get in the way of working on a
      // project; the list is a convenience.
    }
    for (const listener of [...listeners]) listener();
  };

  return {
    list: read,
    add(project) {
      const { location, name, openedAt } = project;
      write([{ location, name, openedAt }, ...read().filter((item) => item.location !== location)]);
    },
    remove(location) {
      write(read().filter((item) => item.location !== location));
    },
    clear() {
      write([]);
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

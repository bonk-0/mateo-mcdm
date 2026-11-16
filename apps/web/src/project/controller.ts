import {
  createAutosave,
  createProjectRepository,
  type Autosave,
  createRecentProjects,
  isProjectError,
  type ProjectRepository,
  type ProjectSession,
  type RecentProject,
  type RecentProjects,
} from '@mateo/project';
import { projectNameFromLocation, type ProjectPlatform } from './platform';

/** The answer to "save changes before closing?". */
export type UnsavedChoice = 'save' | 'discard' | 'cancel';

export type ProjectAction = 'new' | 'open' | 'save' | 'saveAs' | 'close';

/** What the controller tells the user about, through `notify`. */
export type ProjectNotice =
  | {
      readonly kind: 'created' | 'opened' | 'saved';
      readonly name: string;
      readonly location: string;
    }
  | { readonly kind: 'alreadyOpen'; readonly name: string }
  | { readonly kind: 'noProject' }
  | {
      readonly kind: 'failed';
      readonly action: ProjectAction;
      readonly error: unknown;
      readonly location?: string;
    };

export interface ProjectControllerOptions {
  readonly platform: ProjectPlatform;
  readonly appVersion: string;
  /** Asks what to do with the unsaved changes of the project called `name`. */
  readonly confirmUnsaved: (name: string) => Promise<UnsavedChoice>;
  readonly notify: (notice: ProjectNotice) => void;
  /** File name suggested for a new project, without extension. */
  readonly untitledName: () => string;
  /** For tests. Defaults to `createProjectRepository` on the platform's storage. */
  readonly repository?: ProjectRepository;
  /**
   * Quiet time in milliseconds after the last edit before the open project is saved by
   * itself. `false` turns autosave off. Default 1500.
   */
  readonly autosaveDelayMs?: number | false;
}

/** The open project as the UI shows it. */
export interface OpenProjectInfo {
  readonly name: string;
  readonly location: string;
  readonly isDirty: boolean;
}

export interface ProjectState {
  readonly project: OpenProjectInfo | null;
  /** A file operation is running; further commands are ignored until it ends. */
  readonly busy: boolean;
  /** Most recently used first. */
  readonly recent: readonly RecentProject[];
}

/**
 * Runs the File menu: new, open, save, save as and the recent projects list, on top of
 * the `@mateo/project` repository. It keeps at most one project open, asks before unsaved
 * changes would be lost, and reports results and errors through `notify` instead of
 * throwing, so every caller (menu, buttons, files opened by the OS) behaves the same.
 */
export interface ProjectController {
  /** The open project, for screens that read or edit it. */
  readonly session: ProjectSession | null;
  getState(): ProjectState;
  subscribe(listener: () => void): () => void;

  newProject(): Promise<void>;
  /** Opens `location`, or asks the user which project to open. */
  openProject(location?: string): Promise<void>;
  save(): Promise<void>;
  saveAs(): Promise<void>;
  /**
   * Closes the open project, asking about unsaved changes first. Resolves `false` when the
   * user chose to keep it open (or saving failed), for example to cancel closing the window.
   */
  closeProject(): Promise<boolean>;
  clearRecent(): void;
}

export function createProjectController(options: ProjectControllerOptions): ProjectController {
  const { platform, notify } = options;
  const recent: RecentProjects = createRecentProjects(platform.preferences);
  const repository =
    options.repository ??
    createProjectRepository({ storage: platform.storage, appVersion: options.appVersion, recent });

  let session: ProjectSession | null = null;
  let unsubscribeSession: (() => void) | undefined;
  let autosave: Autosave | undefined;
  let busy = false;
  let state: ProjectState = { project: null, busy, recent: recent.list() };
  const listeners = new Set<() => void>();

  function refresh(): void {
    const project = session
      ? {
          name: session.document.info.name,
          location: session.location,
          isDirty: session.isDirty,
        }
      : null;
    const sameProject =
      project === state.project ||
      (project !== null &&
        state.project !== null &&
        project.name === state.project.name &&
        project.location === state.project.location &&
        project.isDirty === state.project.isDirty);
    const list = recent.list();
    const sameRecent =
      list.length === state.recent.length &&
      list.every(
        (item, i) =>
          item.location === state.recent[i]?.location &&
          item.name === state.recent[i]?.name &&
          item.openedAt === state.recent[i]?.openedAt,
      );
    if (sameProject && sameRecent && busy === state.busy) return;
    state = {
      project: sameProject ? state.project : project,
      busy,
      recent: sameRecent ? state.recent : list,
    };
    for (const listener of [...listeners]) listener();
  }

  recent.subscribe(refresh);

  function setSession(next: ProjectSession | null): void {
    unsubscribeSession?.();
    unsubscribeSession = undefined;
    autosave?.dispose();
    autosave = undefined;
    session = next;
    if (next) {
      unsubscribeSession = next.subscribe(refresh);
      if (options.autosaveDelayMs !== false) {
        autosave = createAutosave(next, {
          delayMs: options.autosaveDelayMs ?? 1500,
          onSaved: refresh,
          onError: (error) => fail('save', error, next.location),
        });
      }
    }
    refresh();
  }

  /** Runs one file operation at a time. A command while another runs is ignored. */
  async function exclusive<T>(fallback: T, run: () => Promise<T>): Promise<T> {
    if (busy) return fallback;
    busy = true;
    refresh();
    try {
      return await run();
    } finally {
      busy = false;
      refresh();
    }
  }

  /**
   * Makes sure unsaved changes are saved or knowingly discarded. Resolves `false` when the
   * current project must stay open.
   */
  async function settleUnsaved(): Promise<boolean> {
    if (!session?.isDirty) return true;
    // With autosave on, pending edits are saved quietly; only a failure asks the user.
    try {
      await autosave?.flush();
    } catch (error) {
      notify({ kind: 'failed', action: 'save', error, location: session.location });
    }
    if (!session.isDirty) return true;
    const choice = await options.confirmUnsaved(session.document.info.name);
    if (choice === 'cancel') return false;
    if (choice === 'discard') return true;
    try {
      await session.save();
      return true;
    } catch (error) {
      notify({ kind: 'failed', action: 'save', error, location: session.location });
      return false;
    }
  }

  /** Closes the open project without asking. A failing close is reported, not fatal. */
  async function closeCurrent(): Promise<void> {
    const current = session;
    if (!current) return;
    setSession(null);
    try {
      await current.close();
    } catch (error) {
      notify({ kind: 'failed', action: 'close', error, location: current.location });
    }
  }

  function fail(action: ProjectAction, error: unknown, location?: string): void {
    notify({ kind: 'failed', action, error, ...(location === undefined ? {} : { location }) });
  }

  return {
    get session() {
      return session;
    },
    getState: () => state,
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },

    newProject: () =>
      exclusive(undefined, async () => {
        if (!(await settleUnsaved())) return;
        let location: string | null;
        try {
          location = await platform.chooseNewLocation(options.untitledName());
        } catch (error) {
          fail('new', error);
          return;
        }
        if (location === null) return;
        await closeCurrent();
        try {
          await platform.removeReplacedFile(location);
          const created = await repository.create(location, {
            name: projectNameFromLocation(location),
          });
          setSession(created);
          notify({ kind: 'created', name: created.document.info.name, location });
        } catch (error) {
          fail('new', error, location);
        }
      }),

    openProject: (requested) =>
      exclusive(undefined, async () => {
        let location: string | null | undefined = requested;
        if (location === undefined) {
          try {
            location = await platform.chooseOpenLocation();
          } catch (error) {
            fail('open', error);
            return;
          }
        }
        if (location === null) return;
        if (session && session.location === location) {
          notify({ kind: 'alreadyOpen', name: session.document.info.name });
          return;
        }
        if (!(await settleUnsaved())) return;
        let opened: ProjectSession;
        try {
          opened = await repository.open(location);
        } catch (error) {
          // A recent project that was moved or deleted leaves the list.
          if (isProjectError(error, 'NOT_FOUND')) recent.remove(location);
          fail('open', error, location);
          return;
        }
        // The previous project stays open until the new one is known to work.
        await closeCurrent();
        setSession(opened);
        notify({ kind: 'opened', name: opened.document.info.name, location });
      }),

    save: () =>
      exclusive(undefined, async () => {
        if (!session) {
          notify({ kind: 'noProject' });
          return;
        }
        try {
          await session.save();
          notify({ kind: 'saved', name: session.document.info.name, location: session.location });
        } catch (error) {
          fail('save', error, session.location);
        }
      }),

    saveAs: () =>
      exclusive(undefined, async () => {
        const current = session;
        if (!current) {
          notify({ kind: 'noProject' });
          return;
        }
        let location: string | null;
        try {
          location = await platform.chooseSaveAsLocation(current.location);
        } catch (error) {
          fail('saveAs', error);
          return;
        }
        if (location === null) return;
        try {
          // The storage deletes a file the user agreed to replace before copying.
          if (location === current.location) await current.save();
          else await current.saveAs(location);
          notify({ kind: 'saved', name: current.document.info.name, location: current.location });
        } catch (error) {
          fail('saveAs', error, location);
        }
      }),

    closeProject: () =>
      exclusive(false, async () => {
        if (!(await settleUnsaved())) return false;
        await closeCurrent();
        return true;
      }),

    clearRecent() {
      recent.clear();
    },
  };
}

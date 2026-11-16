import type { ProjectDocument, ProjectSession } from '@mateo/project';
import { useCallback, useSyncExternalStore } from 'react';
import { useProjectController, useProjectState } from '../project/store';

/** The open project session, or `null`. Re-renders when a project is opened or closed. */
export function useSession(): ProjectSession | null {
  const controller = useProjectController();
  useProjectState();
  return controller?.session ?? null;
}

const NOTHING = () => () => {};

/** The document of `session`, re-read after every edit, undo, redo and save. */
export function useDocument(session: ProjectSession | null): ProjectDocument | null {
  const subscribe = useCallback(
    (listener: () => void) => (session ? session.subscribe(listener) : NOTHING()),
    [session],
  );
  return useSyncExternalStore(subscribe, () => session?.document ?? null);
}

/** Whether the open project has changes that are not in its file yet. */
export function useIsDirty(session: ProjectSession | null): boolean {
  useDocument(session);
  return session?.isDirty ?? false;
}

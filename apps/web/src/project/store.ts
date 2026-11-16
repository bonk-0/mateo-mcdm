import { useCallback, useSyncExternalStore } from 'react';
import type { ProjectController, ProjectState } from './controller';

/**
 * The app's one project controller, set by `ProjectFiles` once the platform is loaded.
 * Screens read the open project through these hooks.
 */
let current: ProjectController | null = null;
const listeners = new Set<() => void>();

export function setProjectController(controller: ProjectController | null): void {
  if (controller === current) return;
  current = controller;
  for (const listener of [...listeners]) listener();
}

export function getProjectController(): ProjectController | null {
  return current;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useProjectController(): ProjectController | null {
  return useSyncExternalStore(subscribe, getProjectController);
}

const NO_PROJECT: ProjectState = { project: null, busy: false, recent: [] };

/** The open project, whether a file operation runs, and the recent projects. */
export function useProjectState(): ProjectState {
  const controller = useProjectController();
  const subscribeToController = useCallback(
    (listener: () => void) => controller?.subscribe(listener) ?? (() => {}),
    [controller],
  );
  return useSyncExternalStore(subscribeToController, () => controller?.getState() ?? NO_PROJECT);
}

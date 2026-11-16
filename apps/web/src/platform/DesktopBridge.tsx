import { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { runCommand } from '../commands/commands';
import { getProjectController, useProjectState } from '../project/store';
import { buildMenuModel } from './desktopMenu';
import { isMac } from './runtime';

/** Event the Rust side emits when the OS asks Mateo to open `.mateo` files. */
export const OPEN_FILES_EVENT = 'mateo://open-files';

/** The window title: the project name, a dot while it has unsaved changes, and the app. */
export function windowTitle(project: { name: string; isDirty: boolean } | null): string {
  return project ? `${project.name}${project.isDirty ? ' •' : ''} — Mateo` : 'Mateo';
}

/**
 * Connects the desktop shell to the UI: builds the translated native menu (rebuilt when
 * the language, the recent projects or whether a project is open change), forwards files
 * opened through the OS to `file.open`, keeps the window title on the open project and
 * asks about unsaved changes before the window closes. Rendered only inside Tauri; Tauri
 * modules are loaded lazily so the browser build never runs them.
 */
export function DesktopBridge() {
  const { t, i18n } = useTranslation('shell');
  const { project, recent } = useProjectState();
  const hasProject = project !== null;
  const recentKey = recent.map((item) => item.location).join('\n');
  const recentProjects = useMemo(() => (recentKey ? recentKey.split('\n') : []), [recentKey]);
  const title = windowTitle(project);

  useEffect(() => {
    const model = buildMenuModel({ t, mac: isMac(), recentProjects, hasProject });
    void import('./applyDesktopMenu')
      .then(({ applyDesktopMenu }) => applyDesktopMenu(model, __APP_VERSION__))
      .catch((error: unknown) => console.error('Could not build the native menu', error));
  }, [t, i18n.language, recentProjects, hasProject]);

  useEffect(() => {
    void import('@tauri-apps/api/window')
      .then(({ getCurrentWindow }) => getCurrentWindow().setTitle(title))
      .catch((error: unknown) => console.error('Could not set the window title', error));
  }, [title]);

  useEffect(() => {
    let unlisten: (() => void) | undefined;
    let cancelled = false;
    void (async () => {
      const { getCurrentWindow } = await import('@tauri-apps/api/window');
      const stop = await getCurrentWindow().onCloseRequested(async (event) => {
        // Unsaved changes get a chance to be saved; "cancel" keeps the window open.
        const controller = getProjectController();
        if (controller && !(await controller.closeProject())) event.preventDefault();
      });
      if (cancelled) stop();
      else unlisten = stop;
    })().catch((error: unknown) => console.error('Could not watch the window closing', error));
    return () => {
      cancelled = true;
      unlisten?.();
    };
  }, []);

  useEffect(() => {
    let unlisten: (() => void) | undefined;
    let cancelled = false;
    const open = (paths: readonly string[]) => {
      if (paths.length > 0) runCommand('file.open', { paths });
    };
    void (async () => {
      const [{ listen }, { invoke }] = await Promise.all([
        import('@tauri-apps/api/event'),
        import('@tauri-apps/api/core'),
      ]);
      const stop = await listen<string[]>(OPEN_FILES_EVENT, (event) => open(event.payload));
      if (cancelled) stop();
      else unlisten = stop;
      // Files passed on the command line at launch arrive before the listener exists.
      open(await invoke<string[]>('take_pending_open_files'));
    })().catch((error: unknown) => console.error('Could not listen for opened files', error));
    return () => {
      cancelled = true;
      unlisten?.();
    };
  }, []);

  return null;
}

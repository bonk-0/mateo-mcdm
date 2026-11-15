import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { runCommand } from '../commands/commands';
import { buildMenuModel } from './desktopMenu';
import { isMac } from './runtime';

/** Event the Rust side emits when the OS asks Mateo to open `.mateo` files. */
export const OPEN_FILES_EVENT = 'mateo://open-files';

/**
 * Connects the desktop shell to the UI: builds the translated native menu (rebuilt when
 * the language changes) and forwards files opened through the OS to `file.open`.
 * Rendered only inside Tauri; Tauri modules are loaded lazily so the browser build never
 * runs them.
 */
export function DesktopBridge() {
  const { t, i18n } = useTranslation('shell');

  useEffect(() => {
    const model = buildMenuModel({ t, mac: isMac(), recentProjects: [] });
    void import('./applyDesktopMenu')
      .then(({ applyDesktopMenu }) => applyDesktopMenu(model, __APP_VERSION__))
      .catch((error: unknown) => console.error('Could not build the native menu', error));
  }, [t, i18n.language]);

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

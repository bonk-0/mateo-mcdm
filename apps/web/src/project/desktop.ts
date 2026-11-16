import { createTauriStorage } from '@mateo/project';
import { invoke } from '@tauri-apps/api/core';
import { open, save } from '@tauri-apps/plugin-dialog';
import Database from '@tauri-apps/plugin-sql';
import { hasProjectExtension, PROJECT_EXTENSION, type ProjectPlatform } from './platform';

/** Translated texts of the native file dialogs. */
export interface DialogLabels {
  readonly newTitle: string;
  readonly openTitle: string;
  readonly saveAsTitle: string;
  /** Name of the `.mateo` filter, for example "Mateo project". */
  readonly filterName: string;
}

/**
 * Project files on the desktop: each project is a `.mateo` file on disk, read and written
 * through the Tauri SQL plugin, and chosen with the native open and save dialogs. This
 * module imports Tauri, so the browser build must only load it lazily.
 */
export function createDesktopPlatform(labels: () => DialogLabels): ProjectPlatform {
  // Paths the user explicitly accepted in a save dialog, which asks before replacing an
  // existing file. Only these may be deleted to make room for a new file.
  const replaceable = new Set<string>();

  const removeReplacedFile = async (location: string): Promise<void> => {
    if (!replaceable.delete(location)) return;
    await invoke('remove_project_file', { path: location });
  };

  async function chooseSaveLocation(title: string, defaultPath: string): Promise<string | null> {
    const filters = [{ name: labels().filterName, extensions: [PROJECT_EXTENSION] }];
    const chosen = await save({ title, defaultPath, filters });
    if (chosen === null) return null;
    replaceable.clear();
    // Some platforms (GTK on Linux) return the name as typed. The dialog did not ask about
    // replacing a file with the extension added, so that file must not be deleted.
    if (!hasProjectExtension(chosen)) return `${chosen}.${PROJECT_EXTENSION}`;
    replaceable.add(chosen);
    return chosen;
  }

  return {
    storage: createTauriStorage({
      load: (connection, options) => Database.load(connection, options),
      removeFile: removeReplacedFile,
    }),
    preferences: localStorage,
    chooseNewLocation: (suggestedName) =>
      chooseSaveLocation(labels().newTitle, `${suggestedName}.${PROJECT_EXTENSION}`),
    async chooseOpenLocation() {
      const chosen = await open({
        title: labels().openTitle,
        multiple: false,
        directory: false,
        filters: [{ name: labels().filterName, extensions: [PROJECT_EXTENSION] }],
      });
      return typeof chosen === 'string' ? chosen : null;
    },
    chooseSaveAsLocation: (current) => chooseSaveLocation(labels().saveAsTitle, current),
    removeReplacedFile,
  };
}

import type { KeyValueStore, StorageAdapter } from '@mateo/project';

/**
 * What the project controller needs from the platform it runs on: where project files are
 * stored, and how the user picks one. The desktop build implements it with the Tauri SQL
 * plugin and the native file dialogs (`desktop.ts`).
 */
export interface ProjectPlatform {
  readonly storage: StorageAdapter;
  /** Where the recent projects list is kept. */
  readonly preferences: KeyValueStore;
  /**
   * Asks where to create a new project. Resolves with the location, or `null` when the
   * user cancelled. `suggestedName` is a file name without extension.
   */
  chooseNewLocation(suggestedName: string): Promise<string | null>;
  /** Asks which project to open, or `null` when the user cancelled. */
  chooseOpenLocation(): Promise<string | null>;
  /** Asks where to save a copy of the project at `current`, or `null` when cancelled. */
  chooseSaveAsLocation(current: string): Promise<string | null>;
  /**
   * Deletes the file at `location` if the user agreed to replace it when choosing it
   * (through `chooseNewLocation` or `chooseSaveAsLocation`). Does nothing otherwise, so
   * that a file the user never saw cannot be lost.
   */
  removeReplacedFile(location: string): Promise<void>;
}

export const PROJECT_EXTENSION = 'mateo';

/** The file name of a location without folders, for example `Suppliers.mateo`. */
export function fileNameOf(location: string): string {
  return location.split(/[\\/]/).pop() ?? location;
}

/** The file name without the `.mateo` extension, used as the name of a new project. */
export function projectNameFromLocation(location: string): string {
  const name = fileNameOf(location);
  const stem = name.replace(/\.mateo$/i, '');
  return stem.length > 0 ? stem : name;
}

/** Whether a location ends in `.mateo`, in any case. */
export function hasProjectExtension(location: string): boolean {
  return /\.mateo$/i.test(location);
}

import type { KeyValueStore, StorageAdapter } from '@mateo/project';

/** A `.mateo` file from the user's computer, read into memory. */
export interface ProjectFileInput {
  /** The file name, for example `Suppliers.mateo`. */
  readonly name: string;
  readonly bytes: Uint8Array;
}

/**
 * What the project controller needs from the platform it runs on: where project files are
 * stored, how the user picks one, and how a project comes in from and goes out to the
 * user's computer. The app implements it in `browser.ts`; tests pass their own.
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
  /**
   * Checks that `bytes` are a project this version can open, throwing the `ProjectError`
   * that opening would throw (`NOT_A_PROJECT_FILE`, `NEWER_SCHEMA`, `CORRUPT_FILE`...).
   * Nothing is stored.
   */
  checkProjectFile(bytes: Uint8Array): Promise<void>;
  /**
   * Asks under which name to keep a project brought in from the computer, asking before
   * an existing one is replaced. `suggestedName` is a file name without extension.
   */
  chooseImportLocation(suggestedName: string): Promise<string | null>;
  /** Stores `bytes` at `location`, replacing what is there (`IN_USE` if it is open elsewhere). */
  writeProjectFile(location: string, bytes: Uint8Array): Promise<void>;
  /**
   * Gives the user the stored file at `location` as a `.mateo` file on their computer.
   * Resolves `false` when the user cancelled.
   */
  exportProjectFile(location: string): Promise<boolean>;
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

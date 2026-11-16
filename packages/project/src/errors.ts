/**
 * Errors raised by the project file layer.
 *
 * Every error has a stable machine `code` and an i18n `messageKey` (texts are in
 * `./messages`), so the UI can show a clear, translated message for each of them.
 */
export type ProjectErrorCode =
  /** The file is not an SQLite database, or an SQLite database that is not a Mateo project. */
  | 'NOT_A_PROJECT_FILE'
  /** The file was written by a newer version of Mateo. It was not modified. */
  | 'NEWER_SCHEMA'
  /** The file identifies as a Mateo project but its content breaks the format. */
  | 'CORRUPT_FILE'
  /** Upgrading an older file failed. The file was left as it was. */
  | 'MIGRATION_FAILED'
  /** A new project was requested at a location that already holds data. */
  | 'LOCATION_NOT_EMPTY'
  /** The file or the requested record does not exist. */
  | 'NOT_FOUND'
  /** The project was used after it was closed. */
  | 'PROJECT_CLOSED'
  /** A caller passed data that cannot be stored (programming error or invalid model). */
  | 'INVALID_ARGUMENT'
  /** The storage layer failed (disk, permissions, quota...). */
  | 'STORAGE_FAILED';

export type ProjectErrorDetails = Readonly<Record<string, string | number>>;

export class ProjectError extends Error {
  readonly code: ProjectErrorCode;
  /** Values for the ICU placeholders of the message, and context for logs. */
  readonly details: ProjectErrorDetails;

  constructor(
    code: ProjectErrorCode,
    message: string,
    details: ProjectErrorDetails = {},
    options?: { cause?: unknown },
  ) {
    super(message, options);
    this.name = 'ProjectError';
    this.code = code;
    this.details = details;
  }

  /** i18n key of the user-facing message (see `PROJECT_MESSAGES`). */
  get messageKey(): string {
    return `project.error.${this.code}`;
  }
}

export function isProjectError(error: unknown, code?: ProjectErrorCode): error is ProjectError {
  return error instanceof ProjectError && (code === undefined || error.code === code);
}

/** Text of any thrown value, for the technical part of an error message. */
export function describeCause(cause: unknown): string {
  if (cause instanceof Error) return cause.message;
  return typeof cause === 'string' ? cause : String(cause);
}

/**
 * `PRAGMA application_id` of every project file: the ASCII bytes of "MATE". It marks an
 * SQLite database as a Mateo project, for Mateo itself and for tools such as `file(1)`.
 */
export const APPLICATION_ID = 0x4d415445;

/** File extension of a project, without the dot. */
export const PROJECT_FILE_EXTENSION = 'mateo';

/** Format versions of JSON documents stored inside the file (see docs/project-file.md). */
export const SNAPSHOT_FORMAT_VERSION = 1;

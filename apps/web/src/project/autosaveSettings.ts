/**
 * How long after the last edit the open project is saved by itself, in milliseconds, or
 * `false` for no autosave. Read when a project controller is created; tests that exercise
 * the unsaved-changes questions turn it off.
 */
export const autosaveSettings: { delayMs: number | false } = { delayMs: 1500 };

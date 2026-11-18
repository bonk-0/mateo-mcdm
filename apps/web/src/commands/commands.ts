import type { ProjectFileInput } from '../project/platform';

/**
 * App-level commands that can be triggered from several places: the project menu, buttons
 * on screens, keyboard shortcuts and, later, a command palette.
 *
 * The File commands are handled by `project/ProjectFiles.tsx`. A command without a handler
 * goes to the fallback handler, which does nothing unless one is set.
 */
export type AppCommand =
  | 'file.new'
  | 'file.open'
  | 'file.save'
  | 'file.saveAs'
  | 'file.import'
  | 'file.export'
  | 'file.clearRecent';

export interface CommandPayload {
  /** `file.open`: the stored project to open, for example from the recent list. */
  readonly location?: string;
  /** `file.import`: a `.mateo` file already read, for example one dropped on the page. */
  readonly file?: ProjectFileInput;
}

export type CommandHandler = (payload: CommandPayload) => void;

const handlers = new Map<AppCommand, CommandHandler>();
let fallback: (command: AppCommand, payload: CommandPayload) => void = () => {};

/** Registers the handler for a command. Returns a function that removes it again. */
export function registerCommand(command: AppCommand, handler: CommandHandler): () => void {
  handlers.set(command, handler);
  return () => {
    if (handlers.get(command) === handler) handlers.delete(command);
  };
}

/** Sets what happens for commands that have no handler yet. */
export function setFallbackCommandHandler(
  handler: (command: AppCommand, payload: CommandPayload) => void,
): void {
  fallback = handler;
}

export function runCommand(command: AppCommand, payload: CommandPayload = {}): void {
  const handler = handlers.get(command);
  if (handler) handler(payload);
  else fallback(command, payload);
}

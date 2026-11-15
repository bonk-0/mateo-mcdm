/**
 * App-level commands that can be triggered from several places: the native desktop menu,
 * buttons on screens and, later, keyboard shortcuts and a command palette.
 *
 * P1.7 only provides the plumbing. Project file handling (P1.8) registers real handlers;
 * until then the default handler tells the user the feature is on its way.
 */
export type AppCommand =
  'file.new' | 'file.open' | 'file.save' | 'file.saveAs' | 'file.clearRecent';

export interface CommandPayload {
  /** File paths, for example from opening `.mateo` files through the OS. */
  readonly paths?: readonly string[];
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

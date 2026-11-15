import type { TextRef } from './text';

export interface Alternative {
  /** Stable id, unique within a model. Never shown to the user. */
  readonly id: string;
  readonly name: TextRef;
}

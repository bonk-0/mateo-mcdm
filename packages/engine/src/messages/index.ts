import { en } from './en';
import { tr } from './tr';

export type { EngineMessageKey } from './en';

/**
 * Texts for the i18n keys the engine emits, per language. Kept next to the code that
 * emits the keys until the app-wide catalogs of `@mateo/i18n` (P1.7) pick them up.
 */
export const ENGINE_MESSAGES = { en, tr } as const;

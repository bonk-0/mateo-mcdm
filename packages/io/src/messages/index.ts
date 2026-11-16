import { en } from './en';
import { tr } from './tr';

export type { ImportMessageKey } from './en';

/**
 * Texts for the i18n keys this package emits, per language. Kept next to the code that
 * emits the keys, like `ENGINE_MESSAGES` and `FUZZY_MESSAGES`, until the app-wide catalogs
 * pick them up.
 */
export const IO_MESSAGES = { en, tr } as const;

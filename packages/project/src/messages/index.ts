import { en } from './en';
import { tr } from './tr';

export type { ProjectMessageKey } from './en';

/**
 * Texts for the i18n keys this package emits, per language. Kept next to the code that
 * emits the keys, like `ENGINE_MESSAGES`, until the app catalogs pick them up.
 */
export const PROJECT_MESSAGES = { en, tr } as const;

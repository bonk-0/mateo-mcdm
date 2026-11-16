import { en } from './en';
import { tr } from './tr';

export type { MethodsMessageKey } from './en';

/**
 * Texts for the i18n keys the methods of this package emit, per language. Kept next to the
 * code that emits the keys, like `ENGINE_MESSAGES`, until the app-wide catalogs pick them up.
 */
export const METHODS_MESSAGES = { en, tr } as const;

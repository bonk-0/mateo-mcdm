/**
 * Bundled translation catalogs. English is the source language; every other language
 * must have exactly the same keys (checked by `pnpm i18n:check`).
 *
 * To add a namespace, add `<namespace>.json` to every language folder and register it
 * below. To add a language, add a folder and register it here and in `locales.ts`.
 */
import enHome from './en/home.json';
import enNav from './en/nav.json';
import enSettings from './en/settings.json';
import enShell from './en/shell.json';
import trHome from './tr/home.json';
import trNav from './tr/nav.json';
import trSettings from './tr/settings.json';
import trShell from './tr/shell.json';
import type { Language } from '../locales';

export const NAMESPACES = ['shell', 'nav', 'home', 'settings'] as const;
export type Namespace = (typeof NAMESPACES)[number];

export const DEFAULT_NAMESPACE = 'shell' satisfies Namespace;

export const resources = {
  en: { shell: enShell, nav: enNav, home: enHome, settings: enSettings },
  tr: { shell: trShell, nav: trNav, home: trHome, settings: trSettings },
} as const satisfies Record<Language, Record<Namespace, object>>;

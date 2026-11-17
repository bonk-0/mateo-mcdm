/**
 * Bundled translation catalogs. English is the source language; every other language
 * must have exactly the same keys (checked by `pnpm i18n:check`).
 *
 * To add a namespace, add `<namespace>.json` to every language folder and register it
 * below. To add a language, add a folder and register it here and in `locales.ts`.
 */
import enDataCenter from './en/dataCenter.json';
import enExplain from './en/explain.json';
import enHome from './en/home.json';
import enMatrix from './en/matrix.json';
import enNav from './en/nav.json';
import enProject from './en/project.json';
import enSettings from './en/settings.json';
import enShell from './en/shell.json';
import enWorkspace from './en/workspace.json';
import trDataCenter from './tr/dataCenter.json';
import trExplain from './tr/explain.json';
import trHome from './tr/home.json';
import trMatrix from './tr/matrix.json';
import trNav from './tr/nav.json';
import trProject from './tr/project.json';
import trSettings from './tr/settings.json';
import trShell from './tr/shell.json';
import trWorkspace from './tr/workspace.json';
import type { Language } from '../locales';

export const NAMESPACES = [
  'shell',
  'nav',
  'home',
  'settings',
  'project',
  'matrix',
  'workspace',
  'dataCenter',
  'explain',
] as const;
export type Namespace = (typeof NAMESPACES)[number];

export const DEFAULT_NAMESPACE = 'shell' satisfies Namespace;

export const resources = {
  en: {
    shell: enShell,
    nav: enNav,
    home: enHome,
    settings: enSettings,
    project: enProject,
    matrix: enMatrix,
    workspace: enWorkspace,
    dataCenter: enDataCenter,
    explain: enExplain,
  },
  tr: {
    shell: trShell,
    nav: trNav,
    home: trHome,
    settings: trSettings,
    project: trProject,
    matrix: trMatrix,
    workspace: trWorkspace,
    dataCenter: trDataCenter,
    explain: trExplain,
  },
} as const satisfies Record<Language, Record<Namespace, object>>;

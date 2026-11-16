import type { TFunction } from 'i18next';
import type { AppCommand } from '../commands/commands';

/**
 * Builds the native menu of the desktop app with translated labels. Kept free of Tauri
 * imports so the structure can be unit-tested; `applyDesktopMenu` turns it into a real
 * menu.
 */
export type MenuNode =
  | {
      readonly kind: 'command';
      readonly id: string;
      readonly text: string;
      readonly command: AppCommand;
      readonly accelerator?: string;
      readonly enabled?: boolean;
      readonly paths?: readonly string[];
    }
  | { readonly kind: 'info'; readonly id: string; readonly text: string }
  | {
      readonly kind: 'predefined';
      readonly item:
        | 'Separator'
        | 'Undo'
        | 'Redo'
        | 'Cut'
        | 'Copy'
        | 'Paste'
        | 'SelectAll'
        | 'Minimize'
        | 'Fullscreen'
        | 'CloseWindow'
        | 'Quit'
        | 'Hide'
        | 'HideOthers'
        | 'ShowAll'
        | 'Services';
      readonly text?: string;
    }
  | { readonly kind: 'about'; readonly text: string }
  | {
      readonly kind: 'submenu';
      readonly id: string;
      readonly text: string;
      readonly items: readonly MenuNode[];
    };

const separator: MenuNode = { kind: 'predefined', item: 'Separator' };

function fileName(path: string): string {
  return path.split(/[\\/]/).pop() ?? path;
}

export interface MenuModelOptions {
  readonly t: TFunction<'shell'>;
  readonly mac: boolean;
  readonly recentProjects: readonly string[];
  /** Whether a project is open: Save and Save As need one. */
  readonly hasProject?: boolean;
}

export function buildMenuModel({
  t,
  mac,
  recentProjects,
  hasProject = false,
}: MenuModelOptions): MenuNode[] {
  const recentItems: MenuNode[] =
    recentProjects.length === 0
      ? [{ kind: 'info', id: 'file.recent.empty', text: t('menu.recentEmpty') }]
      : [
          ...recentProjects.map((path, i): MenuNode => ({
            kind: 'command',
            id: `file.recent.${i}`,
            text: fileName(path),
            command: 'file.open',
            paths: [path],
          })),
          separator,
          {
            kind: 'command',
            id: 'file.clearRecent',
            text: t('menu.clearRecent'),
            command: 'file.clearRecent',
          },
        ];

  const file: MenuNode = {
    kind: 'submenu',
    id: 'file',
    text: t('menu.file'),
    items: [
      {
        kind: 'command',
        id: 'file.new',
        text: t('menu.new'),
        command: 'file.new',
        accelerator: 'CmdOrCtrl+N',
      },
      {
        kind: 'command',
        id: 'file.open',
        text: t('menu.open'),
        command: 'file.open',
        accelerator: 'CmdOrCtrl+O',
      },
      { kind: 'submenu', id: 'file.recent', text: t('menu.recent'), items: recentItems },
      separator,
      {
        kind: 'command',
        id: 'file.save',
        text: t('menu.save'),
        command: 'file.save',
        accelerator: 'CmdOrCtrl+S',
        enabled: hasProject,
      },
      {
        kind: 'command',
        id: 'file.saveAs',
        text: t('menu.saveAs'),
        command: 'file.saveAs',
        accelerator: 'CmdOrCtrl+Shift+S',
        enabled: hasProject,
      },
      ...(mac
        ? []
        : [
            separator,
            { kind: 'predefined', item: 'Quit', text: t('menu.quit') } satisfies MenuNode,
          ]),
    ],
  };

  const edit: MenuNode = {
    kind: 'submenu',
    id: 'edit',
    text: t('menu.edit'),
    items: [
      // Native undo/redo items only work on macOS; elsewhere the webview handles the keys.
      ...(mac
        ? [
            { kind: 'predefined', item: 'Undo', text: t('menu.undo') } satisfies MenuNode,
            { kind: 'predefined', item: 'Redo', text: t('menu.redo') } satisfies MenuNode,
            separator,
          ]
        : []),
      { kind: 'predefined', item: 'Cut', text: t('menu.cut') },
      { kind: 'predefined', item: 'Copy', text: t('menu.copy') },
      { kind: 'predefined', item: 'Paste', text: t('menu.paste') },
      { kind: 'predefined', item: 'SelectAll', text: t('menu.selectAll') },
    ],
  };

  const window: MenuNode = {
    kind: 'submenu',
    id: 'window',
    text: t('menu.window'),
    items: [
      { kind: 'predefined', item: 'Minimize', text: t('menu.minimize') },
      { kind: 'predefined', item: 'Fullscreen', text: t('menu.fullscreen') },
      separator,
      { kind: 'predefined', item: 'CloseWindow', text: t('menu.closeWindow') },
    ],
  };

  if (!mac) return [file, edit, window];

  // macOS shows the first submenu as the application menu, titled with the app name.
  const app: MenuNode = {
    kind: 'submenu',
    id: 'app',
    text: 'Mateo',
    items: [
      { kind: 'about', text: t('menu.about') },
      separator,
      { kind: 'predefined', item: 'Services', text: t('menu.services') },
      separator,
      { kind: 'predefined', item: 'Hide', text: t('menu.hide') },
      { kind: 'predefined', item: 'HideOthers', text: t('menu.hideOthers') },
      { kind: 'predefined', item: 'ShowAll', text: t('menu.showAll') },
      separator,
      { kind: 'predefined', item: 'Quit', text: t('menu.quit') },
    ],
  };
  return [app, file, edit, window];
}

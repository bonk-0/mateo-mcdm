import { Menu, MenuItem, PredefinedMenuItem, Submenu } from '@tauri-apps/api/menu';
import { runCommand } from '../commands/commands';
import type { MenuNode } from './desktopMenu';

type NativeItem = Submenu | MenuItem | PredefinedMenuItem;

async function toNative(node: MenuNode, version: string): Promise<NativeItem> {
  switch (node.kind) {
    case 'submenu':
      return Submenu.new({
        id: node.id,
        text: node.text,
        items: await Promise.all(node.items.map((child) => toNative(child, version))),
      });
    case 'command':
      return MenuItem.new({
        id: node.id,
        text: node.text,
        enabled: node.enabled ?? true,
        ...(node.accelerator ? { accelerator: node.accelerator } : {}),
        action: () => runCommand(node.command, node.paths ? { paths: node.paths } : {}),
      });
    case 'info':
      return MenuItem.new({ id: node.id, text: node.text, enabled: false });
    case 'predefined':
      return PredefinedMenuItem.new({ item: node.item, ...(node.text ? { text: node.text } : {}) });
    case 'about':
      return PredefinedMenuItem.new({
        item: { About: { name: 'Mateo', version } },
        text: node.text,
      });
  }
}

let current: Menu | undefined;

/** Replaces the app's native menu bar with one built from `model`. */
export async function applyDesktopMenu(model: readonly MenuNode[], version: string): Promise<void> {
  const items = await Promise.all(model.map((node) => toNative(node, version)));
  const menu = await Menu.new({ items });
  await menu.setAsAppMenu();
  const previous = current;
  current = menu;
  await previous?.close();
}

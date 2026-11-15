import { createI18n } from '@mateo/i18n';
import { describe, expect, it } from 'vitest';
import { buildMenuModel, type MenuNode } from './desktopMenu';

const labels = (nodes: readonly MenuNode[]): string[] =>
  nodes.flatMap((n) =>
    n.kind === 'submenu' ? [n.text, ...labels(n.items)] : 'text' in n && n.text ? [n.text] : [],
  );

describe('desktop menu', () => {
  const t = (language: 'en' | 'tr') => createI18n({ language }).getFixedT(language, 'shell');

  it('has File with New, Open, Open Recent, Save and Save As', () => {
    const [file] = buildMenuModel({ t: t('en'), mac: false, recentProjects: [] });
    expect(file?.kind === 'submenu' && file.text).toBe('File');
    const ids = file?.kind === 'submenu' ? file.items.map((i) => ('id' in i ? i.id : i.kind)) : [];
    expect(ids).toEqual([
      'file.new',
      'file.open',
      'file.recent',
      'predefined',
      'file.save',
      'file.saveAs',
      'predefined',
      'predefined',
    ]);
  });

  it('translates every label', () => {
    const en = labels(buildMenuModel({ t: t('en'), mac: true, recentProjects: [] }));
    const tr = labels(buildMenuModel({ t: t('tr'), mac: true, recentProjects: [] }));
    expect(tr).toContain('Dosya');
    expect(tr).toContain('Farklı Kaydet…');
    // Only the app name stays the same.
    const same = en.filter((label, i) => label === tr[i]);
    expect(same).toEqual(['Mateo']);
  });

  it('puts an application menu first on macOS', () => {
    const model = buildMenuModel({ t: t('en'), mac: true, recentProjects: [] });
    expect(model.map((n) => (n.kind === 'submenu' ? n.id : n.kind))).toEqual([
      'app',
      'file',
      'edit',
      'window',
    ]);
  });

  it('lists recent projects by file name and opens them', () => {
    const [file] = buildMenuModel({
      t: t('en'),
      mac: false,
      recentProjects: ['/home/a/Suppliers.mateo', 'C:\\work\\Energy.mateo'],
    });
    const recent =
      file?.kind === 'submenu'
        ? file.items.find((i) => 'id' in i && i.id === 'file.recent')
        : undefined;
    const items = recent?.kind === 'submenu' ? recent.items : [];
    expect(items[0]).toMatchObject({
      text: 'Suppliers.mateo',
      command: 'file.open',
      paths: ['/home/a/Suppliers.mateo'],
    });
    expect(items[1]).toMatchObject({ text: 'Energy.mateo' });
    expect(items.at(-1)).toMatchObject({ command: 'file.clearRecent' });
  });
});

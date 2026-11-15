import { describe, expect, it } from 'vitest';
import { resources } from './catalogs';
import { checkCatalogs, flattenCatalog, type CatalogSet } from './check';

const codes = (catalogs: CatalogSet) => checkCatalogs(catalogs, 'en').map((i) => i.code);

describe('checkCatalogs', () => {
  it('accepts the shipped catalogs', () => {
    expect(checkCatalogs(resources, 'en')).toEqual([]);
  });

  it('reports a key removed from tr', () => {
    const { shell, ...rest } = resources.tr;
    const { skipToContent: _removed, ...shellWithoutKey } = shell;
    const issues = checkCatalogs({ ...resources, tr: { ...rest, shell: shellWithoutKey } }, 'en');
    expect(issues).toEqual([
      expect.objectContaining({
        code: 'missing-key',
        language: 'tr',
        namespace: 'shell',
        key: 'skipToContent',
      }),
    ]);
  });

  it('reports keys and namespaces that only exist in a translation', () => {
    expect(
      codes({
        en: { a: { x: 'X' } },
        tr: { a: { x: 'X', y: 'Y' }, b: { z: 'Z' } },
      }),
    ).toEqual(['unused-key', 'unused-namespace']);
  });

  it('reports a missing namespace', () => {
    expect(codes({ en: { a: { x: 'X' }, b: { y: 'Y' } }, tr: { a: { x: 'X' } } })).toEqual([
      'missing-namespace',
    ]);
  });

  it('reports empty and invalid ICU messages', () => {
    expect(
      codes({
        en: { a: { empty: 'E', broken: 'B' } },
        tr: { a: { empty: ' ', broken: '{count, plural, one {x}' } },
      }),
    ).toEqual(['empty-message', 'invalid-message']);
  });

  it('reports arguments that differ from the source language', () => {
    const issues = checkCatalogs(
      {
        en: {
          a: { hello: 'Hello {name}', items: '{count, plural, one {# item} other {# items}}' },
        },
        tr: { a: { hello: 'Merhaba {isim}', items: '{count, plural, other {# öğe}}' } },
      },
      'en',
    );
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({ code: 'argument-mismatch', key: 'hello' });
  });

  it('flattens nested namespaces into dotted keys', () => {
    expect([...flattenCatalog({ a: { b: 'x', c: { d: 'y' } }, e: 'z' }).keys()]).toEqual([
      'a.b',
      'a.c.d',
      'e',
    ]);
  });
});

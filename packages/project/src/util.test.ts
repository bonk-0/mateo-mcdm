import { describe, expect, it } from 'vitest';
import { bytesToHex, hexToBytes, utf8Bytes } from './bytes';
import { ProjectError } from './errors';
import { sha256Hex, sha256HexOfText } from './hash';
import { decodeJson, encodeJson } from './json';
import { PROJECT_MESSAGES } from './messages';
import { decodeCell, encodeCell } from './model/cells';
import { assertValidId, isValidId, randomId } from './model/ids';
import { statement } from './sql/types';

describe('encodeJson', () => {
  it('round-trips every kind of double exactly, including -0', () => {
    const numbers = [
      0,
      -0,
      0.1 + 0.2,
      1 / 3,
      5e-324,
      1.7976931348623157e308,
      -1e21,
      123456789.12345679,
      2 ** 53,
    ];
    const back = decodeJson(encodeJson({ numbers, nested: [{ n: -0 }] }), 'test') as {
      numbers: number[];
      nested: { n: number }[];
    };
    numbers.forEach((value, index) => expect(Object.is(back.numbers[index], value)).toBe(true));
    expect(Object.is(back.nested[0]!.n, -0)).toBe(true);
    expect(encodeJson({ a: 1, b: undefined, c: 'ş"\n', d: null, e: [true] })).toBe(
      '{"a":1,"c":"ş\\"\\n","d":null,"e":[true]}',
    );
    expect(encodeJson({ a: -0, b: undefined, c: ['x'] })).toBe('{"a":-0,"c":["x"]}');
  });

  it('refuses values JSON would silently change', () => {
    const cyclic: Record<string, unknown> = {};
    cyclic['self'] = cyclic;
    for (const value of [
      NaN,
      Infinity,
      -Infinity,
      [undefined],
      { a: [1, { b: NaN }] },
      new Date(0),
      new Map(),
      () => 1,
      1n,
      cyclic,
      undefined,
    ]) {
      expect(() => encodeJson(value)).toThrow(ProjectError);
    }
    expect(() => encodeJson({ list: [1, { deep: Infinity }] })).toThrow(/\$\.list\[1\]\.deep/);
    // The same object twice is fine; only cycles are refused.
    const shared = { x: 1 };
    expect(encodeJson([shared, shared])).toBe('[{"x":1},{"x":1}]');
  });

  it('reports unparsable stored JSON as a corrupt file', () => {
    expect(() => decodeJson('{oops', 'a setting')).toThrow(/invalid JSON in a setting/);
  });
});

describe('bytes and hashes', () => {
  it('converts between bytes and hex', () => {
    const bytes = Uint8Array.from({ length: 20_000 }, (_, index) => index % 256);
    expect(hexToBytes(bytesToHex(bytes))).toEqual(bytes);
    expect(bytesToHex(Uint8Array.of(0, 15, 16, 255))).toBe('000f10ff');
    expect(hexToBytes('000F10fF')).toEqual(Uint8Array.of(0, 15, 16, 255));
    expect(() => hexToBytes('abc')).toThrow(ProjectError);
    expect(() => hexToBytes('zz')).toThrow(ProjectError);
  });

  it('encodes UTF-8, replacing lone surrogates with U+FFFD', () => {
    expect(utf8Bytes('')).toEqual(new Uint8Array());
    expect([...utf8Bytes('aİ€😀')]).toEqual([
      0x61, 0xc4, 0xb0, 0xe2, 0x82, 0xac, 0xf0, 0x9f, 0x98, 0x80,
    ]);
    const replacement = [0xef, 0xbf, 0xbd];
    expect([...utf8Bytes('\ud800x')]).toEqual([...replacement, 0x78]);
    expect([...utf8Bytes('\udc00')]).toEqual(replacement);
    expect([...utf8Bytes('x\ud83d')]).toEqual([0x78, ...replacement]);
  });

  it('computes SHA-256 (FIPS 180-4 test vectors)', () => {
    expect(sha256HexOfText('')).toBe(
      'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    );
    expect(sha256HexOfText('abc')).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    );
    expect(sha256HexOfText('abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq')).toBe(
      '248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1',
    );
    expect(sha256Hex(new Uint8Array(1_000_000).fill(97))).toBe(
      'cdc76e5c9914fb9281a1c7e284d73e67f1809a48a497200e046d39ccc7112cd0',
    );
    // Lengths around the padding boundary.
    expect(sha256HexOfText('a'.repeat(55))).toBe(
      '9f4390f8d30c2dd92ec9f095b65e2b9ae9b0a925a5258e241c9f1e910f734318',
    );
    expect(sha256HexOfText('a'.repeat(56))).toBe(
      'b35439a4ac6f0948b6d6f9e3c6af0f5f590ce20f1bde7090ef7970686ec6738a',
    );
    expect(sha256HexOfText('a'.repeat(64))).toBe(
      'ffe054fe7ae0cb6dc65c3af9b61d5209f439851db43d0ba5997337df154668eb',
    );
  });
});

describe('ids', () => {
  it('accepts UUIDs and simple names, rejects dangerous or empty ones', () => {
    for (const id of [
      'a',
      'c-1',
      'A_b.c:d-9',
      '0f8fad5b-d9cb-469f-a165-70867728950e',
      'constructor',
    ]) {
      expect(isValidId(id)).toBe(true);
    }
    for (const id of ['', '__proto__', '_a', 'a b', 'ş', 'a'.repeat(65), 1, null, undefined]) {
      expect(isValidId(id)).toBe(false);
    }
    expect(() => assertValidId('__proto__', 'criterion')).toThrow(/criterion/);
    expect(isValidId(randomId())).toBe(true);
    expect(randomId()).not.toBe(randomId());
  });
});

describe('cell encoding', () => {
  it('rejects stored cells that break the format', () => {
    expect(encodeCell({ kind: 'tfn', value: { l: 1, m: 2.5, u: 1e-7 } })).toEqual({
      kind: 'tfn',
      value: '[1,2.5,1e-7]',
    });
    expect(decodeCell('term', '"H"', 'x')).toEqual({ kind: 'term', termId: 'H' });
    for (const [kind, value] of [
      ['crisp', '"1"'],
      ['crisp', 'null'],
      ['tfn', '[1,2]'],
      ['tfn', '[1,2,"3"]'],
      ['tfn', '{"l":1}'],
      ['term', '5'],
      ['trapezoid', '[1,2,3,4]'],
      ['crisp', 'not json'],
    ] as const) {
      expect(() => decodeCell(kind, value, 'cell')).toThrow(
        expect.objectContaining({ code: 'CORRUPT_FILE' }),
      );
    }
    expect(() => encodeCell({ kind: 'crisp', value: NaN })).toThrow(ProjectError);
    expect(() => encodeCell({ kind: 'other' } as never)).toThrow(/Unknown cell kind/);
  });
});

describe('statement', () => {
  it('checks the number and type of bound values', () => {
    expect(statement('SELECT ?, ?;  ', ['a', 1])).toEqual({ sql: 'SELECT ?, ?', params: ['a', 1] });
    expect(() => statement('SELECT ?, ?', ['a'])).toThrow(/2 placeholders but 1 values/);
    expect(() => statement('SELECT ?', [0.5])).toThrow(/Only integers/);
  });
});

describe('messages', () => {
  it('has the same keys in English and Turkish, with the same placeholders', () => {
    const { en, tr } = PROJECT_MESSAGES;
    expect(Object.keys(tr).sort()).toEqual(Object.keys(en).sort());
    const placeholders = (text: string): string[] =>
      [...text.matchAll(/\{(\w+)/g)].map((m) => m[1]!).sort();
    for (const key of Object.keys(en) as (keyof typeof en)[]) {
      expect(tr[key].length).toBeGreaterThan(0);
      expect(placeholders(tr[key])).toEqual(placeholders(en[key]));
      expect(en[key] + tr[key]).not.toContain("'");
    }
  });

  it('has a message for every error code', () => {
    const codes = [
      'NOT_A_PROJECT_FILE',
      'NEWER_SCHEMA',
      'CORRUPT_FILE',
      'MIGRATION_FAILED',
      'LOCATION_NOT_EMPTY',
      'NOT_FOUND',
      'PROJECT_CLOSED',
      'INVALID_ARGUMENT',
      'STORAGE_FAILED',
    ] as const;
    for (const code of codes) {
      expect(PROJECT_MESSAGES.en).toHaveProperty([new ProjectError(code, 'x').messageKey]);
    }
  });
});

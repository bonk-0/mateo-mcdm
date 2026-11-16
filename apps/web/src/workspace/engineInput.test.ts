import type { Dataset, LinguisticScale } from '@mateo/project';
import { describe, expect, it } from 'vitest';
import { buildCrispMatrix, buildTfnMatrix } from './engineInput';

const scale: LinguisticScale = {
  id: 's',
  name: { text: 'Scale' },
  sourceId: null,
  numberType: 'tfn',
  terms: [
    { id: 'H', label: { text: 'High' }, abbreviation: 'H', value: { l: 0.5, m: 0.75, u: 1 } },
  ],
};

function dataset(cells: Dataset['matrices'][number]['cells'], criteria = 2): Dataset {
  return {
    id: 'd',
    name: 'D',
    description: '',
    createdAt: '2026-01-01T00:00:00Z',
    criteria: Array.from({ length: criteria }, (_, j) => ({
      id: `c${j + 1}`,
      code: `C${j + 1}`,
      name: `Criterion ${j + 1}`,
      description: '',
      direction: j === 1 ? ('cost' as const) : ('benefit' as const),
      unit: '',
      numberType: 'crisp' as const,
      scaleId: 's',
    })),
    alternatives: [1, 2].map((i) => ({
      id: `a${i}`,
      code: `A${i}`,
      name: `Alt ${i}`,
      description: '',
      group: '',
    })),
    matrices: [{ id: 'm', name: 'M', role: 'decision', cells }],
  };
}

const full = {
  a1: { c1: { kind: 'crisp', value: 1 }, c2: { kind: 'crisp', value: 2 } },
  a2: { c1: { kind: 'crisp', value: 3 }, c2: { kind: 'crisp', value: 4 } },
} as const;

describe('buildCrispMatrix', () => {
  it('maps ids, names, directions and values without reordering', () => {
    const built = buildCrispMatrix(dataset(full));
    expect(built.ok).toBe(true);
    if (!built.ok) return;
    expect(built.matrix.alternatives.map((a) => a.id)).toEqual(['a1', 'a2']);
    expect(built.matrix.criteria.map((c) => c.direction)).toEqual(['benefit', 'cost']);
    expect(built.matrix.criteria.every((c) => c.numberType === 'crisp')).toBe(true);
    expect(built.matrix.values).toEqual([
      [1, 2],
      [3, 4],
    ]);
  });

  it('reports every missing cell and never fills it', () => {
    const built = buildCrispMatrix(dataset({ a1: full.a1 }));
    expect(built).toEqual({
      ok: false,
      problems: [
        { code: 'missing', alternativeId: 'a2', criterionId: 'c1' },
        { code: 'missing', alternativeId: 'a2', criterionId: 'c2' },
      ],
    });
  });

  it('refuses fuzzy cells in the classical model', () => {
    const built = buildCrispMatrix(
      dataset({ ...full, a2: { ...full.a2, c1: { kind: 'term', termId: 'H' } } }),
    );
    expect(built.ok).toBe(false);
    if (!built.ok) expect(built.problems[0]!.code).toBe('fuzzy-in-classical');
  });

  it('needs two alternatives and two criteria', () => {
    expect(buildCrispMatrix(dataset(full, 1))).toEqual({
      ok: false,
      problems: [{ code: 'too-small' }],
    });
  });
});

describe('buildTfnMatrix', () => {
  it('converts numbers, TFNs and terms', () => {
    const built = buildTfnMatrix(
      dataset({
        a1: { c1: { kind: 'crisp', value: 2 }, c2: { kind: 'tfn', value: { l: 1, m: 2, u: 3 } } },
        a2: { c1: { kind: 'term', termId: 'H' }, c2: { kind: 'crisp', value: 4 } },
      }),
      [scale],
    );
    expect(built.ok).toBe(true);
    if (!built.ok) return;
    expect(built.matrix.criteria.every((c) => c.numberType === 'tfn')).toBe(true);
    expect(built.matrix.values).toEqual([
      [
        { l: 2, m: 2, u: 2 },
        { l: 1, m: 2, u: 3 },
      ],
      [
        { l: 0.5, m: 0.75, u: 1 },
        { l: 4, m: 4, u: 4 },
      ],
    ]);
  });

  it('reports a term without a scale and an unknown term', () => {
    const built = buildTfnMatrix(
      dataset({
        a1: { c1: { kind: 'term', termId: 'X' }, c2: { kind: 'crisp', value: 1 } },
        a2: { c1: { kind: 'term', termId: 'H' }, c2: { kind: 'crisp', value: 4 } },
      }),
      [],
    );
    expect(built.ok).toBe(false);
    if (built.ok) return;
    expect(built.problems.map((p) => p.code)).toEqual(['no-scale', 'no-scale']);
    const unknown = buildTfnMatrix(
      dataset({
        a1: { c1: { kind: 'term', termId: 'X' }, c2: { kind: 'crisp', value: 1 } },
        a2: { c1: { kind: 'crisp', value: 1 }, c2: { kind: 'crisp', value: 4 } },
      }),
      [scale],
    );
    expect(unknown.ok === false && unknown.problems[0]).toEqual({
      code: 'unknown-term',
      alternativeId: 'a1',
      criterionId: 'c1',
      term: 'X',
    });
  });
});

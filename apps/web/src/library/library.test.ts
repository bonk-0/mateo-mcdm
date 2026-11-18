import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { importFile } from '@mateo/io';
import { describe, expect, it } from 'vitest';
import { LIBRARY_PAGES } from './methods';
import {
  SAMPLE_IDS,
  runSample,
  sampleCsv,
  sampleFixture,
  samplePreset,
  sampleKind,
  sampleMethodId,
  type SampleId,
} from './samples';
import { fitsLesson, sequenceFor } from '@mateo/explain';
import { runLessonExample } from './lessonExamples';

const LABELS = {
  alternative: 'Alternative',
  weight: 'Weight',
  criterion: 'Criterion',
  assessment: 'Assessment',
};

/** Printed value → what the formulation gives, for the values the papers misprint. */
function expectedValue(id: SampleId, path: string, printed: number): number {
  return sampleFixture(id).deviations.find((item) => item.path === path)?.recomputed ?? printed;
}

function weightsOf(id: SampleId): number[] {
  const result = runSample(id).result as {
    weights: { entries: readonly { value: number }[] };
  };
  return result.weights.entries.map((entry) => entry.value);
}

describe('reference examples of the library', () => {
  it('has a sample for every page variant and no other', () => {
    const variants = LIBRARY_PAGES.flatMap((page) => page.variants.map((v) => v.sampleId));
    expect([...variants].sort()).toEqual([...SAMPLE_IDS].sort());
  });

  describe.each(['critic', 'merec', 'swara', 'fuzzy-swara'] as const)(
    '%s reproduces the printed weights',
    (id) => {
      it('to the printed precision', () => {
        const printed = sampleFixture(id).result['weights']!;
        const decimals = printed.decimals ?? 3;
        const computed = weightsOf(id);
        const expected = printed.values as number[];
        expect(computed).toHaveLength(expected.length);
        computed.forEach((value, index) => {
          expect(Math.abs(value - expected[index]!)).toBeLessThanOrEqual(
            0.5 * 10 ** -decimals + 1e-9,
          );
        });
      });
    },
  );

  it('MARCOS reproduces the printed ranks', () => {
    const run = runSample('marcos').result as {
      ranking: readonly { alternativeId: string; rank: number }[];
    };
    const printed = sampleFixture('marcos').result['ranking']!.values as number[];
    expect(run.ranking.map((entry) => entry.rank)).toEqual(printed);
  });

  it('Fuzzy MARCOS reproduces the ranks the paper prints, apart from its documented numbering', () => {
    const run = runSample('fuzzy-marcos').result as {
      ranking: readonly { alternativeId: string; rank: number }[];
    };
    const rankOf = (alternativeId: string) =>
      run.ranking.find((entry) => entry.alternativeId === alternativeId)!.rank;
    const fixture = sampleFixture('fuzzy-marcos');
    const table = fixture.result['ranking']!;
    const rows = (table as unknown as { rows: string[] }).rows;
    (table.values as number[]).forEach((printed, index) => {
      expect(rankOf(rows[index]!)).toBe(
        expectedValue('fuzzy-marcos', `result.ranking.values[${index}]`, printed),
      );
    });
    for (const [alternativeId, printed] of Object.entries(
      fixture.result['positionsInText']!.values as Record<string, number>,
    )) {
      expect(rankOf(alternativeId)).toBe(
        expectedValue('fuzzy-marcos', `result.positionsInText.values.${alternativeId}`, printed),
      );
    }
    expect(rankOf('A23')).toBe(1);
  });

  it('runs every example without validation problems', () => {
    for (const id of SAMPLE_IDS) expect(runSample(id).trace.steps.length).toBeGreaterThan(2);
  });
});

describe('references', () => {
  const DOCS: Record<string, string> = {
    marcos: 'marcos.md',
    'fuzzy-marcos': 'fuzzy-marcos.md',
    critic: 'critic.md',
    merec: 'merec.md',
    swara: 'swara.md',
  };
  const doc = (file: string) =>
    readFileSync(
      resolve(import.meta.dirname, '../../../../docs/methods', file),
      'utf8',
    ).toLowerCase();

  it.each(LIBRARY_PAGES.map((page) => [page.id, page] as const))(
    '%s cites only what docs/methods (P1.4) cites',
    (_id, page) => {
      const text = doc(DOCS[page.id]!);
      for (const variant of page.variants) {
        for (const reference of variant.references) {
          expect(text, reference.doi).toContain(reference.doi.toLowerCase());
        }
        // The source of the example is among the references.
        expect(variant.references.map((r) => r.doi)).toContain(
          sampleFixture(variant.sampleId).source.doi,
        );
        // The first reference is where the method was introduced.
        expect(variant.references[0]!.role).toBe('method');
      }
    },
  );

  it('names the method paper that P1.4 names as the reference', () => {
    const first = (file: string) =>
      /\*\*Reference[^*]*\*\*[^\n]*?DOI \[([^\]]+)\]/iu.exec(doc(file));
    for (const page of LIBRARY_PAGES.filter((p) => p.id !== 'swara')) {
      const documented = first(DOCS[page.id]!)?.[1];
      expect(page.variants[0]!.references[0]!.doi.toLowerCase()).toBe(documented);
    }
  });
});

describe('sample files', () => {
  it.each(SAMPLE_IDS.filter((id) => sampleKind(id) === 'matrix'))(
    '%s imports in the Data Center with its directions',
    (id) => {
      const fixture = sampleFixture(id);
      const result = importFile(new TextEncoder().encode(sampleCsv(id, LABELS)), {
        fileName: `${id}.csv`,
      });
      expect(result.validation.errors).toEqual([]);
      const criteria = fixture.input['criteria'] as { direction: string }[];
      expect(result.model?.criteria).toHaveLength(criteria.length);
      expect(result.model?.criteria.map((criterion) => criterion.direction)).toEqual(
        criteria.map((criterion) => criterion.direction),
      );
      expect(result.model?.alternatives).toHaveLength(
        (fixture.input['alternatives'] as string[]).length,
      );
    },
  );

  it('lists SWARA criteria in order with the assessments', () => {
    const lines = sampleCsv('swara', LABELS).trim().split('\r\n');
    expect(lines).toHaveLength(7);
    expect(lines[1]).toBe('Expedition of dispute resolution,');
    expect(lines[2]).toBe('Price of dispute resolution,0.15');
    expect(sampleCsv('fuzzy-swara', LABELS)).toContain(
      'Traffic accidents with material damage,WLS',
    );
  });

  it('presets follow the criteria order of the paper', () => {
    expect(samplePreset('swara').importance).toEqual([null, 0.15, 0.04, 0.29, 0.02, 0.04]);
    expect(samplePreset('fuzzy-swara').terms?.[0]).toBeNull();
    expect(
      samplePreset('fuzzy-swara')
        .terms?.slice(1)
        .every((term) => term !== null),
    ).toBe(true);
    expect(samplePreset('marcos').weights).toEqual([0.247, 0.247, 0.309, 0.197]);
  });
});

describe('lesson examples', () => {
  it('names every sample after its method, which the Learn home relies on', () => {
    for (const id of SAMPLE_IDS) expect(sampleMethodId(id)).toBe(id);
  });

  it.each(SAMPLE_IDS.map((id) => [id] as const))(
    'the phone example of %s runs and fits its lesson',
    (id) => {
      const record = runLessonExample(id);
      const sequence = sequenceFor(record.trace.methodId)!;
      expect(record.warnings).toEqual([]);
      expect(fitsLesson(record.trace, sequence)).toBe(true);
    },
  );
});

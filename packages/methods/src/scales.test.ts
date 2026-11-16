/**
 * The scales of the reference papers exist twice: in the fixtures of P1.4, copied from the
 * papers, and as predefined scales in `@mateo/fuzzy`, which the app offers to users. This
 * test keeps the two transcriptions identical.
 */
import type { LinguisticScale } from '@mateo/fuzzy';
import { FUZZY_MARCOS_SCALE, IMF_SWARA_SCALE, findTerm, toTuple } from '@mateo/fuzzy';
import { describe, expect, it } from 'vitest';
import fuzzyMarcos from '../fuzzy-marcos/fixtures/stankovic-2020.json';
import imfSwaraS1 from '../swara/fixtures/imf-swara-damjanovic-2022-s1.json';
import imfSwaraS2 from '../swara/fixtures/imf-swara-damjanovic-2022-s2.json';
import imfSwaraS3 from '../swara/fixtures/imf-swara-damjanovic-2022-s3.json';
import imfSwaraS6 from '../swara/fixtures/imf-swara-damjanovic-2022-s6.json';

interface FixtureTerm {
  readonly abbreviation: string;
  readonly term: string;
  readonly tfn: readonly number[];
}

function expectSameScale(scale: LinguisticScale, fixture: readonly FixtureTerm[]): void {
  expect(fixture.length).toBe(scale.terms.length);
  for (const entry of fixture) {
    const term = findTerm(scale, entry.abbreviation);
    expect(term?.abbreviation, entry.abbreviation).toBe(entry.abbreviation);
    expect(term === undefined ? undefined : toTuple(term.value), entry.abbreviation).toEqual(
      entry.tfn,
    );
    // Term ids are the kebab-case English names of the papers.
    expect(term?.id, entry.abbreviation).toBe(entry.term.toLowerCase().replaceAll(' ', '-'));
  }
}

describe('predefined scales and fixtures agree', () => {
  it('Fuzzy MARCOS scale (Stanković et al. 2020)', () => {
    expectSameScale(FUZZY_MARCOS_SCALE, fuzzyMarcos.input.scale);
    // Same order: the paper lists the scale from the lowest term.
    expect(FUZZY_MARCOS_SCALE.terms.map((term) => term.abbreviation)).toEqual(
      fuzzyMarcos.input.scale.map((entry) => entry.abbreviation),
    );
  });

  it('every rating of the Fuzzy MARCOS example is a term of the scale', () => {
    const cells = fuzzyMarcos.input.linguisticMatrix.flat();
    expect(cells.length).toBeGreaterThan(0);
    expect(cells.filter((cell) => findTerm(FUZZY_MARCOS_SCALE, cell) === undefined)).toEqual([]);
  });

  it.each([
    ['S1', imfSwaraS1],
    ['S2', imfSwaraS2],
    ['S3', imfSwaraS3],
    ['S6', imfSwaraS6],
  ])('IMF SWARA scale, scenario %s (Damjanović et al. 2022)', (_name, fixture) => {
    expectSameScale(IMF_SWARA_SCALE, fixture.input.scale);
    // The papers print this scale from the highest term; Mateo stores it lowest first.
    expect(IMF_SWARA_SCALE.terms.map((term) => term.abbreviation)).toEqual(
      fixture.input.scale.map((entry) => entry.abbreviation).reverse(),
    );
    for (const assessment of fixture.input.assessments) {
      if (assessment !== null) expect(findTerm(IMF_SWARA_SCALE, assessment)).toBeDefined();
    }
  });
});

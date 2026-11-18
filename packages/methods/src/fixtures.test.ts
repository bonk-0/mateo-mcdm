/**
 * Structural checks for the reference fixtures (docs/methods/fixtures.md), written in
 * P1.4 and extended with the Phase 2 methods in P2.1.
 *
 * These tests do not compute any method. They make sure every fixture is well formed,
 * so the golden tests can rely on its shape. The numerical cross-check lives in
 * docs/methods/verification/verify_fixtures.py.
 *
 * Every method in METHODS must have at least one fixture listed in FIXTURES.
 */
import { describe, expect, it } from 'vitest';
import arasZavadskas2010 from '../aras/fixtures/zavadskas-2010.json';
import bwmRezaeiCar from '../bwm/fixtures/rezaei-car.json';
import codasKeshavarzGhorabaee2016 from '../codas/fixtures/keshavarz-ghorabaee-2016.json';
import coprasPodvezko2011 from '../copras/fixtures/podvezko-2011.json';
import coprasYazdani2011Fuzzy from '../copras/fixtures/yazdani-2011-fuzzy.json';
import criticDiakoulaki1995 from '../critic/fixtures/diakoulaki-1995.json';
import dematelChen2018 from '../dematel/fixtures/chen-2018.json';
import edasKeshavarzGhorabaee2015 from '../edas/fixtures/keshavarz-ghorabaee-2015.json';
import fucomPamucar2018Example1 from '../fucom/fixtures/pamucar-2018-example-1.json';
import fucomPamucar2018Example2 from '../fucom/fixtures/pamucar-2018-example-2.json';
import fuzzyMarcosStankovic2020 from '../fuzzy-marcos/fixtures/stankovic-2020.json';
import lopcowBiswas2024 from '../lopcow/fixtures/biswas-2024.json';
import marcosDamjanovic2022S1 from '../marcos/fixtures/damjanovic-2022-s1.json';
import merecKeshavarzGhorabaee2021 from '../merec/fixtures/keshavarz-ghorabaee-2021.json';
import mooraBrauers2006 from '../moora/fixtures/brauers-2006.json';
import swaraImfSwaraDamjanovic2022S1 from '../swara/fixtures/imf-swara-damjanovic-2022-s1.json';
import swaraImfSwaraDamjanovic2022S2 from '../swara/fixtures/imf-swara-damjanovic-2022-s2.json';
import swaraImfSwaraDamjanovic2022S3 from '../swara/fixtures/imf-swara-damjanovic-2022-s3.json';
import swaraImfSwaraDamjanovic2022S6 from '../swara/fixtures/imf-swara-damjanovic-2022-s6.json';
import swaraKersuliene2010 from '../swara/fixtures/kersuliene-2010.json';
import vikorOpricovic2008W1 from '../vikor/fixtures/opricovic-2008-w1.json';
import vikorOpricovic2008W5 from '../vikor/fixtures/opricovic-2008-w5.json';
import waspasTurskis2015Fuzzy from '../waspas/fixtures/turskis-2015-fuzzy.json';
import waspasZavadskas2012 from '../waspas/fixtures/zavadskas-2012.json';

type Json = null | boolean | number | string | Json[] | { [key: string]: Json };
type JsonObject = { [key: string]: Json };

const METHODS = [
  'critic',
  'merec',
  'swara',
  'marcos',
  'fuzzy-marcos',
  'lopcow',
  'fucom',
  'bwm',
  'dematel',
  'vikor',
  'edas',
  'codas',
  'waspas',
  'copras',
  'moora',
  'aras',
];

/** Every `<method>/fixtures/*.json`, keyed `<method>/<file name>`. A new fixture must be added here. */
const FIXTURES: Record<string, unknown> = {
  'aras/zavadskas-2010': arasZavadskas2010,
  'bwm/rezaei-car': bwmRezaeiCar,
  'codas/keshavarz-ghorabaee-2016': codasKeshavarzGhorabaee2016,
  'copras/podvezko-2011': coprasPodvezko2011,
  'copras/yazdani-2011-fuzzy': coprasYazdani2011Fuzzy,
  'critic/diakoulaki-1995': criticDiakoulaki1995,
  'dematel/chen-2018': dematelChen2018,
  'edas/keshavarz-ghorabaee-2015': edasKeshavarzGhorabaee2015,
  'fucom/pamucar-2018-example-1': fucomPamucar2018Example1,
  'fucom/pamucar-2018-example-2': fucomPamucar2018Example2,
  'fuzzy-marcos/stankovic-2020': fuzzyMarcosStankovic2020,
  'lopcow/biswas-2024': lopcowBiswas2024,
  'marcos/damjanovic-2022-s1': marcosDamjanovic2022S1,
  'merec/keshavarz-ghorabaee-2021': merecKeshavarzGhorabaee2021,
  'moora/brauers-2006': mooraBrauers2006,
  'swara/imf-swara-damjanovic-2022-s1': swaraImfSwaraDamjanovic2022S1,
  'swara/imf-swara-damjanovic-2022-s2': swaraImfSwaraDamjanovic2022S2,
  'swara/imf-swara-damjanovic-2022-s3': swaraImfSwaraDamjanovic2022S3,
  'swara/imf-swara-damjanovic-2022-s6': swaraImfSwaraDamjanovic2022S6,
  'swara/kersuliene-2010': swaraKersuliene2010,
  'vikor/opricovic-2008-w1': vikorOpricovic2008W1,
  'vikor/opricovic-2008-w5': vikorOpricovic2008W5,
  'waspas/turskis-2015-fuzzy': waspasTurskis2015Fuzzy,
  'waspas/zavadskas-2012': waspasZavadskas2012,
};

it('finds the fixtures of every method', () => {
  const methods = new Set(Object.keys(FIXTURES).map((k) => k.split('/')[0]));
  expect([...methods].sort()).toEqual([...METHODS].sort());
});

function isObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function obj(value: unknown, what: string): JsonObject {
  if (!isObject(value)) throw new Error(`${what} must be an object`);
  return value;
}

function str(value: unknown, what: string): string {
  if (typeof value !== 'string') throw new Error(`${what} must be a string`);
  return value;
}

function isTfn(value: unknown): value is [number, number, number] {
  return (
    Array.isArray(value) &&
    value.length === 3 &&
    value.every((v) => typeof v === 'number' && Number.isFinite(v))
  );
}

/** Every number in a value tree (TFNs are arrays of three numbers). */
function numbers(value: unknown): number[] {
  if (typeof value === 'number') return [value];
  if (Array.isArray(value)) return value.flatMap(numbers);
  if (isObject(value)) return Object.values(value).flatMap(numbers);
  return [];
}

/** Every TFN-shaped leaf in a value tree. */
function tfns(value: unknown): [number, number, number][] {
  if (isTfn(value)) return [value];
  if (Array.isArray(value)) return value.flatMap(tfns);
  return [];
}

/** Resolves a deviation path such as `steps.sums.values[3][2]`. */
function resolve(root: unknown, path: string): unknown {
  const parts = path.match(/[^.[\]]+/g) ?? [];
  let node: unknown = root;
  for (const part of parts) {
    if (Array.isArray(node)) node = node[Number(part)];
    else if (isObject(node)) node = node[part];
    else return undefined;
  }
  return node;
}

describe.each(Object.entries(FIXTURES))('fixture %s', (name, raw) => {
  const fx = obj(raw, name);
  const input = obj(fx['input'], 'input');
  const steps = obj(fx['steps'], 'steps');
  const result = obj(fx['result'], 'result');

  it('declares method, variant, number type and schema version', () => {
    expect(fx['schemaVersion']).toBe(1);
    expect(METHODS).toContain(fx['method']);
    expect(name.startsWith(`${str(fx['method'], 'method')}/`)).toBe(true);
    expect(typeof fx['variant']).toBe('string');
    expect(['crisp', 'tfn']).toContain(fx['numberType']);
  });

  it('cites a source with a DOI (or a stable URL where none exists) and a location', () => {
    const source = obj(fx['source'], 'source');
    expect(['original', 'substitute']).toContain(source['role']);
    expect(str(source['citation'], 'citation').length).toBeGreaterThan(20);
    if ('doi' in source) expect(str(source['doi'], 'doi')).toMatch(/^10\.\d{4,9}\/\S+$/);
    else expect(str(source['url'], 'url')).toMatch(/^https:\/\/\S+$/);
    expect(str(source['location'], 'location').length).toBeGreaterThan(0);
  });

  it('states the printed precision of every table', () => {
    const precision = obj(fx['precision'], 'precision');
    expect(Number.isInteger(precision['decimals'])).toBe(true);
    for (const block of [...Object.values(steps), ...Object.values(result)]) {
      const b = obj(block, 'step');
      expect(str(b['printedIn'], 'printedIn').length).toBeGreaterThan(0);
      expect(b['values']).toBeDefined();
      if (b['decimals'] !== undefined) expect(Number.isInteger(b['decimals'])).toBe(true);
      expect(numbers(b['values']).every(Number.isFinite)).toBe(true);
    }
  });

  it('has at least one final result', () => {
    expect(Object.keys(result).length).toBeGreaterThan(0);
  });

  it('lists alternatives in non-numeric results', () => {
    // For example a VIKOR compromise set: the names of the alternatives in it.
    const alternatives = (input['alternatives'] ?? []) as Json[];
    for (const block of Object.values(result)) {
      const values = obj(block, 'result')['values'];
      if (!Array.isArray(values) || values.some((v) => typeof v !== 'string')) continue;
      expect(values.length).toBeGreaterThan(0);
      for (const v of values) expect(alternatives).toContain(v);
    }
  });

  it('has inputs consistent with its criteria list', () => {
    if ('directRelation' in input) {
      // DEMATEL: a square matrix over the factors instead of criteria.
      const n = (input['factors'] as Json[]).length;
      expect(input['directRelation']).toHaveLength(n);
      for (const row of input['directRelation'] as Json[][]) expect(row).toHaveLength(n);
      return;
    }
    const criteria = input['criteria'];
    expect(Array.isArray(criteria)).toBe(true);
    const ids = (criteria as Json[]).map((c) => obj(c, 'criterion')['id']);
    const nCriteria = ids.length;
    if ('matrix' in input) {
      const alternatives = input['alternatives'] as Json[];
      const matrix = input['matrix'] as Json[][];
      expect(matrix).toHaveLength(alternatives.length);
      for (const row of matrix) expect(row).toHaveLength(nCriteria);
      for (const c of criteria as Json[]) {
        expect(['benefit', 'cost']).toContain(obj(c, 'criterion')['direction']);
      }
    }
    if ('optimal' in input) expect(input['optimal']).toHaveLength(nCriteria);
    if ('weights' in input) expect(input['weights']).toHaveLength(nCriteria);
    if ('comparativeImportance' in input) {
      expect(input['comparativeImportance']).toHaveLength(nCriteria);
    }
    if ('assessments' in input) expect(input['assessments']).toHaveLength(nCriteria);
    if ('ranking' in input) {
      // FUCOM: a permutation of the criteria plus significance values or priorities.
      expect([...(input['ranking'] as Json[])].sort()).toEqual([...ids].sort());
      if ('significance' in input) expect(input['significance']).toHaveLength(nCriteria);
      else expect(input['comparativePriorities']).toHaveLength(nCriteria - 1);
    }
    if ('bestToOthers' in input) {
      expect(ids).toContain(input['best']);
      expect(ids).toContain(input['worst']);
      expect(input['bestToOthers']).toHaveLength(nCriteria);
      expect(input['othersToWorst']).toHaveLength(nCriteria);
      expect((input['bestToOthers'] as number[])[ids.indexOf(input['best'])]).toBe(1);
      expect((input['othersToWorst'] as number[])[ids.indexOf(input['worst'])]).toBe(1);
    }
  });

  it('uses valid triangular fuzzy numbers (l <= m <= u) for TFN inputs', () => {
    if (fx['numberType'] !== 'tfn') return;
    const values = 'matrix' in input ? [input['matrix'], input['weights']] : [input['scale']];
    const all = values.flatMap((v) =>
      Array.isArray(v) ? v.flatMap((x) => tfns(isObject(x) ? x['tfn'] : x)) : [],
    );
    expect(all.length).toBeGreaterThan(0);
    for (const [l, m, u] of all) {
      expect(l).toBeLessThanOrEqual(m);
      expect(m).toBeLessThanOrEqual(u);
    }
  });

  it('documents each deviation at a path that holds the printed value', () => {
    const deviations = fx['deviations'];
    expect(Array.isArray(deviations)).toBe(true);
    for (const d of deviations as Json[]) {
      const dev = obj(d, 'deviation');
      expect(resolve(fx, str(dev['path'], 'path'))).toBe(dev['printed']);
      expect(typeof dev['recomputed']).toBe('number');
      expect(str(dev['note'], 'note').length).toBeGreaterThan(0);
    }
  });
});

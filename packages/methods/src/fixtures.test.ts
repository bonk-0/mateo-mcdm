/**
 * Structural checks for the reference fixtures of P1.4 (docs/methods/fixtures.md).
 *
 * These tests do not compute any method. They make sure every fixture is well formed,
 * so the golden tests of P1.5 and P1.6 can rely on its shape. The numerical cross-check
 * lives in docs/methods/verification/verify_fixtures.py.
 */
import { describe, expect, it } from 'vitest';
import critic from '../critic/fixtures/diakoulaki-1995.json';
import fuzzyMarcos from '../fuzzy-marcos/fixtures/stankovic-2020.json';
import marcos from '../marcos/fixtures/damjanovic-2022-s1.json';
import merec from '../merec/fixtures/keshavarz-ghorabaee-2021.json';
import imfSwaraS1 from '../swara/fixtures/imf-swara-damjanovic-2022-s1.json';
import imfSwaraS2 from '../swara/fixtures/imf-swara-damjanovic-2022-s2.json';
import imfSwaraS3 from '../swara/fixtures/imf-swara-damjanovic-2022-s3.json';
import imfSwaraS6 from '../swara/fixtures/imf-swara-damjanovic-2022-s6.json';
import swara from '../swara/fixtures/kersuliene-2010.json';

type Json = null | boolean | number | string | Json[] | { [key: string]: Json };
type JsonObject = { [key: string]: Json };

const FIXTURES: Record<string, unknown> = {
  'critic/diakoulaki-1995': critic,
  'merec/keshavarz-ghorabaee-2021': merec,
  'swara/kersuliene-2010': swara,
  'swara/imf-swara-damjanovic-2022-s1': imfSwaraS1,
  'swara/imf-swara-damjanovic-2022-s2': imfSwaraS2,
  'swara/imf-swara-damjanovic-2022-s3': imfSwaraS3,
  'swara/imf-swara-damjanovic-2022-s6': imfSwaraS6,
  'marcos/damjanovic-2022-s1': marcos,
  'fuzzy-marcos/stankovic-2020': fuzzyMarcos,
};

const METHODS = ['critic', 'merec', 'swara', 'marcos', 'fuzzy-marcos'];

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

  it('cites a source with a DOI and a location in the paper', () => {
    const source = obj(fx['source'], 'source');
    expect(['original', 'substitute']).toContain(source['role']);
    expect(str(source['citation'], 'citation').length).toBeGreaterThan(20);
    expect(str(source['doi'], 'doi')).toMatch(/^10\.\d{4,9}\/\S+$/);
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

  it('has a decision matrix or ordered criteria consistent with its criteria list', () => {
    const criteria = input['criteria'];
    expect(Array.isArray(criteria)).toBe(true);
    const nCriteria = (criteria as Json[]).length;
    if ('matrix' in input) {
      const alternatives = input['alternatives'] as Json[];
      const matrix = input['matrix'] as Json[][];
      expect(matrix).toHaveLength(alternatives.length);
      for (const row of matrix) expect(row).toHaveLength(nCriteria);
      for (const c of criteria as Json[]) {
        expect(['benefit', 'cost']).toContain(obj(c, 'criterion')['direction']);
      }
    }
    if ('weights' in input) expect(input['weights']).toHaveLength(nCriteria);
    if ('comparativeImportance' in input) {
      expect(input['comparativeImportance']).toHaveLength(nCriteria);
    }
    if ('assessments' in input) expect(input['assessments']).toHaveLength(nCriteria);
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

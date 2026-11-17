import { describe, expect, expectTypeOf, it } from 'vitest';
import { sampleInput } from '../__fixtures__/sample';
import { weightedSumMethod } from '../__fixtures__/weighted-sum';
import { EngineError } from '../errors';
import { createTraceBuilder } from '../trace/builder';
import { constant } from '../trace/tracked';
import { ISSUE_CODES } from '../validation/codes';
import { VALID, createValidation } from '../validation/collector';
import type { AnyMethod } from './method';
import { defineMethod } from './method';
import type { ParameterValuesOf } from './parameters';
import {
  NO_PARAMETERS,
  defaultParameters,
  defineParameters,
  parameterSchemaProblems,
  resolveParameters,
} from './parameters';
import { createMethodRegistry, methodDescriptorProblems } from './registry';
import { MethodValidationError, runMethod, validateMethodRun } from './run';

const schema = defineParameters({
  lambda: { type: 'number', labelKey: 'p.lambda', default: 0.5, min: 0, max: 1 },
  open: {
    type: 'number',
    labelKey: 'p.open',
    default: 0.5,
    min: 0,
    max: 1,
    exclusiveMin: true,
    exclusiveMax: true,
  },
  count: { type: 'integer', labelKey: 'p.count', default: 3, min: 1 },
  strict: { type: 'boolean', labelKey: 'p.strict', default: false },
  mode: {
    type: 'enum',
    labelKey: 'p.mode',
    default: 'a',
    options: [
      { value: 'a', labelKey: 'p.mode.a' },
      { value: 'b', labelKey: 'p.mode.b' },
    ],
  },
});

const errorCodes = (given: unknown) =>
  resolveParameters(schema, given).validation.errors.map((issue) => issue.code);

describe('parameters', () => {
  it('derives the value type from the schema', () => {
    expectTypeOf<ParameterValuesOf<typeof schema>>().toEqualTypeOf<{
      readonly lambda: number;
      readonly open: number;
      readonly count: number;
      readonly strict: boolean;
      readonly mode: 'a' | 'b';
    }>();
  });

  it('fills in defaults', () => {
    const defaults = { lambda: 0.5, open: 0.5, count: 3, strict: false, mode: 'a' };
    expect(defaultParameters(schema)).toEqual(defaults);
    expect(resolveParameters(schema)).toEqual({ values: defaults, validation: VALID });
    expect(resolveParameters(schema, { lambda: undefined }).values).toEqual(defaults);
    expect(defaultParameters(NO_PARAMETERS)).toEqual({});
  });

  it('accepts valid values, including inclusive bounds', () => {
    const resolved = resolveParameters(schema, { lambda: 1, count: 1, strict: true, mode: 'b' });
    expect(resolved.validation.ok).toBe(true);
    expect(resolved.values).toEqual({ lambda: 1, open: 0.5, count: 1, strict: true, mode: 'b' });
    expect(errorCodes({ lambda: 0 })).toEqual([]);
  });

  it('rejects unknown names, wrong types, ranges, non-integers and unknown options', () => {
    expect(errorCodes({ lamda: 0.3 })).toEqual([ISSUE_CODES.parameterUnknown]);
    expect(errorCodes({ toString: 1 })).toEqual([ISSUE_CODES.parameterUnknown]);
    expect(errorCodes({ lambda: '0.3' })).toEqual([ISSUE_CODES.parameterInvalidType]);
    expect(errorCodes({ lambda: Number.NaN })).toEqual([ISSUE_CODES.parameterInvalidType]);
    expect(errorCodes({ strict: 1 })).toEqual([ISSUE_CODES.parameterInvalidType]);
    expect(errorCodes({ mode: 2 })).toEqual([ISSUE_CODES.parameterInvalidType]);
    expect(errorCodes({ lambda: 1.01 })).toEqual([ISSUE_CODES.parameterOutOfRange]);
    expect(errorCodes({ lambda: -0.01 })).toEqual([ISSUE_CODES.parameterOutOfRange]);
    expect(errorCodes({ open: 0 })).toEqual([ISSUE_CODES.parameterOutOfRange]);
    expect(errorCodes({ open: 1 })).toEqual([ISSUE_CODES.parameterOutOfRange]);
    expect(errorCodes({ count: 0 })).toEqual([ISSUE_CODES.parameterOutOfRange]);
    expect(errorCodes({ count: 2.5 })).toEqual([ISSUE_CODES.parameterNotInteger]);
    expect(errorCodes({ mode: 'c' })).toEqual([ISSUE_CODES.parameterInvalidOption]);
    expect(errorCodes([])).toEqual([ISSUE_CODES.inputMalformed]);
    expect(errorCodes(null)).toEqual([ISSUE_CODES.inputMalformed]);
    expect(errorCodes('x')).toEqual([ISSUE_CODES.inputMalformed]);
  });

  it('locates the issue and keeps the default for a rejected value', () => {
    const resolved = resolveParameters(schema, { lambda: 7, count: 9 });
    expect(resolved.values.lambda).toBe(0.5);
    expect(resolved.values.count).toBe(9);
    expect(resolved.validation.errors[0]).toMatchObject({
      severity: 'error',
      location: { parameter: 'lambda' },
      params: { name: 'lambda', value: 7, min: 0, max: 1 },
    });
    expect(resolveParameters(schema, { count: 0 }).validation.errors[0]?.params).toEqual({
      name: 'count',
      value: 0,
      min: 1,
    });
  });

  it('finds problems in schema definitions', () => {
    expect(parameterSchemaProblems(schema)).toEqual([]);
    expect(
      parameterSchemaProblems({
        a: { type: 'number', labelKey: 'a', default: 5, min: 0, max: 1 },
        b: { type: 'integer', labelKey: 'b', default: 1, min: 3, max: 2 },
        c: { type: 'enum', labelKey: 'c', default: 'x', options: [] },
        d: {
          type: 'enum',
          labelKey: 'd',
          default: 'x',
          options: [
            { value: 'x', labelKey: 'x' },
            { value: 'x', labelKey: 'x' },
          ],
        },
      }),
    ).toEqual([
      'the default of parameter "a" is not a valid value',
      'parameter "b" has min greater than max',
      'the default of parameter "b" is not a valid value',
      'parameter "c" has no options',
      'the default of parameter "c" is not a valid value',
      'parameter "d" has duplicate options',
    ]);
  });
});

const tinyMethod = (overrides: Partial<AnyMethod> = {}): AnyMethod => ({
  id: 'tiny',
  version: '1.2.3',
  category: 'weighting',
  nameKey: 'methods.tiny.name',
  supportedNumberTypes: ['crisp', 'tfn'],
  inputSchema: [],
  outputSchema: [],
  parameters: NO_PARAMETERS,
  references: [],
  validate: () => VALID,
  run: () => {
    const tb = createTraceBuilder({ methodId: 'tiny', methodVersion: '1.2.3' });
    tb.scalar({ id: 'one', nameKey: 'n', explanationKey: 'e', value: constant(1) });
    return { result: 1, trace: tb.build() };
  },
  ...overrides,
});

describe('method registry', () => {
  it('registers, finds and lists methods in registration order', () => {
    const registry = createMethodRegistry([tinyMethod()]);
    registry.register(weightedSumMethod);
    expect(registry.has('tiny')).toBe(true);
    expect(registry.has('nope')).toBe(false);
    expect(registry.get('weighted-sum')).toBe(weightedSumMethod);
    expect(registry.find('nope')).toBeUndefined();
    expect(registry.list().map((method) => method.id)).toEqual(['tiny', 'weighted-sum']);
    expect(registry.list({ category: 'ranking' }).map((method) => method.id)).toEqual([
      'weighted-sum',
    ]);
    expect(registry.list({ numberType: 'tfn' }).map((method) => method.id)).toEqual(['tiny']);
    expect(registry.list({ category: 'risk' })).toEqual([]);
    expect(registry.list({ category: 'weighting', numberType: 'crisp' })).toHaveLength(1);
  });

  it('keeps registries independent of each other', () => {
    const a = createMethodRegistry([tinyMethod()]);
    const b = createMethodRegistry();
    expect(a.list()).toHaveLength(1);
    expect(b.list()).toHaveLength(0);
  });

  it('rejects duplicates and unknown ids with typed errors', () => {
    const registry = createMethodRegistry([tinyMethod()]);
    expect(() => registry.register(tinyMethod())).toThrow(
      expect.objectContaining({ code: 'DUPLICATE_ID' }) as Error,
    );
    expect(() => registry.get('nope')).toThrow(
      expect.objectContaining({ code: 'UNKNOWN_METHOD' }) as Error,
    );
  });

  it('rejects invalid descriptors', () => {
    expect(methodDescriptorProblems(tinyMethod())).toEqual([]);
    expect(methodDescriptorProblems(weightedSumMethod as AnyMethod)).toEqual([]);
    expect(methodDescriptorProblems(tinyMethod({ version: '1.0.0-beta.1' }))).toEqual([]);
    const slot = { name: 'm', kind: 'decision-matrix', required: true, numberTypes: ['crisp'] };
    const broken = tinyMethod({
      id: 'Tiny Method',
      version: 'v1',
      category: 'other' as never,
      nameKey: '',
      supportedNumberTypes: [],
      inputSchema: [slot, slot],
      outputSchema: undefined as never,
      parameters: { a: { type: 'number', labelKey: 'a', default: 5, max: 1 } },
      references: undefined as never,
      run: undefined as never,
    });
    expect(methodDescriptorProblems(broken)).toHaveLength(10);
    expect(methodDescriptorProblems(tinyMethod({ parameters: null as never }))).toEqual([
      'the parameter schema is missing',
    ]);
    expect(() => createMethodRegistry([broken])).toThrow(
      expect.objectContaining({ code: 'INVALID_METHOD' }) as Error,
    );
  });
});

describe('runMethod', () => {
  it('returns the full run record with resolved parameters', () => {
    const record = runMethod(weightedSumMethod, sampleInput());
    expect(record.methodId).toBe('weighted-sum');
    expect(record.methodVersion).toBe('1.0.0');
    expect(record.parameters).toEqual({ normalization: 'max' });
    expect(record.warnings).toEqual([]);
    expect(record.trace.methodId).toBe('weighted-sum');
    expect(record.result.ranking.map((item) => item.rank)).toEqual([2, 1, 3]);
    expectTypeOf(record.parameters.normalization).toEqualTypeOf<'max' | 'sum'>();
  });

  it('carries warnings into the record and still runs', () => {
    const input = sampleInput();
    const record = runMethod(weightedSumMethod, {
      ...input,
      weights: {
        ...input.weights,
        entries: [
          { criterionId: 'c1', value: 3 },
          { criterionId: 'c2', value: 2 },
        ],
      },
    });
    expect(record.warnings.map((issue) => issue.code)).toEqual([ISSUE_CODES.weightsNotNormalized]);
    expect(record.result.scores).toHaveLength(3);
  });

  it('throws MethodValidationError and never calls run on invalid input', () => {
    let ran = false;
    const method = tinyMethod({
      validate: () => {
        const v = createValidation();
        v.error('tiny.bad');
        v.warning('tiny.meh');
        return v.result();
      },
      run: () => {
        ran = true;
        throw new Error('must not run');
      },
    });
    try {
      runMethod(method, {});
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(MethodValidationError);
      expect(error).toBeInstanceOf(EngineError);
      const failure = error as MethodValidationError;
      expect(failure.code).toBe('VALIDATION_FAILED');
      expect(failure.validation.errors.map((issue) => issue.code)).toEqual(['tiny.bad']);
      expect(failure.validation.warnings.map((issue) => issue.code)).toEqual(['tiny.meh']);
      expect(failure.message).toContain('tiny.bad');
    }
    expect(ran).toBe(false);
  });

  it('rejects invalid parameters before the method sees them', () => {
    let validated = false;
    const method = defineMethod({
      ...tinyMethod(),
      parameters: schema,
      validate: () => {
        validated = true;
        return VALID;
      },
    });
    expect(() => runMethod(method, {}, { lambda: 3 })).toThrow(MethodValidationError);
    expect(validateMethodRun(method, {}, { lambda: 3 }).errors.map((issue) => issue.code)).toEqual([
      ISSUE_CODES.parameterOutOfRange,
    ]);
    expect(validated).toBe(false);
    expect(validateMethodRun(method, {}, { lambda: 0.25 })).toEqual(VALID);
    expect(validated).toBe(true);
  });

  it('reports input problems through validateMethodRun without throwing', () => {
    const input = sampleInput();
    const result = validateMethodRun(weightedSumMethod, {
      ...input,
      matrix: {
        ...input.matrix,
        values: [
          [10, 0],
          [20, 2],
          [5, 8],
        ],
      },
    });
    expect(result.ok).toBe(false);
    expect(result.errors.map((issue) => issue.code)).toEqual([ISSUE_CODES.matrixNonPositiveValue]);
    expect(
      validateMethodRun(weightedSumMethod, undefined as never).errors.map((issue) => issue.code),
    ).toEqual([ISSUE_CODES.inputMalformed]);
  });

  it('rejects a trace labelled with another method or version', () => {
    const method = tinyMethod({ version: '9.9.9' });
    expect(() => runMethod(method, {})).toThrow(
      expect.objectContaining({ code: 'INVALID_TRACE' }) as Error,
    );
  });

  it('skips the trace with recordTrace: false and keeps the result', () => {
    const traced = runMethod(weightedSumMethod, sampleInput());
    const untraced = runMethod(weightedSumMethod, sampleInput(), {}, { recordTrace: false });
    expect(traced.trace.steps.length).toBeGreaterThan(0);
    expect(untraced.trace.steps).toEqual([]);
    expect(untraced.trace.methodId).toBe(traced.trace.methodId);
    expect(untraced.result).toStrictEqual(traced.result);
    // The mode ends with the run: the next run records again.
    expect(runMethod(weightedSumMethod, sampleInput()).trace.steps).toEqual(traced.trace.steps);
    expect(() =>
      runMethod(weightedSumMethod, sampleInput(), {}, { recordTrace: false, verifyTrace: true }),
    ).toThrow(expect.objectContaining({ code: 'INVALID_ARGUMENT' }) as Error);
  });

  it('can audit the trace it returns', () => {
    expect(() =>
      runMethod(weightedSumMethod, sampleInput(), {}, { verifyTrace: true }),
    ).not.toThrow();
    expect(() =>
      runMethod(
        weightedSumMethod,
        sampleInput(),
        {},
        { verifyTrace: { requireKnownOperations: true } },
      ),
    ).not.toThrow();
    expect(() =>
      runMethod(weightedSumMethod, sampleInput(), {}, { verifyTrace: false }),
    ).not.toThrow();
    const lying = tinyMethod({
      run: () => {
        const trace = tinyMethod().run({}, {}).trace;
        const cell = trace.steps[0]?.output.cells[0]?.[0] as { value: number };
        cell.value = 2;
        return { result: 2, trace };
      },
    });
    expect(() => runMethod(lying, {})).not.toThrow();
    expect(() => runMethod(lying, {}, {}, { verifyTrace: true })).toThrow(
      expect.objectContaining({ code: 'INVALID_TRACE' }) as Error,
    );
  });
});

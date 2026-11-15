import { ISSUE_CODES } from '../validation/codes';
import { createValidation } from '../validation/collector';
import type { ValidationResult } from '../validation/types';

interface ParameterBase {
  /** i18n key of the parameter name. */
  readonly labelKey: string;
  readonly descriptionKey?: string;
}

export interface NumberParameter extends ParameterBase {
  readonly type: 'number';
  readonly default: number;
  readonly min?: number;
  readonly max?: number;
  /** When true, `min` itself is not allowed. */
  readonly exclusiveMin?: boolean;
  /** When true, `max` itself is not allowed. */
  readonly exclusiveMax?: boolean;
  /** Suggested slider or spinner step, for the UI only. */
  readonly step?: number;
}

export interface IntegerParameter extends ParameterBase {
  readonly type: 'integer';
  readonly default: number;
  readonly min?: number;
  readonly max?: number;
}

export interface BooleanParameter extends ParameterBase {
  readonly type: 'boolean';
  readonly default: boolean;
}

export interface EnumOption<O extends string = string> {
  readonly value: O;
  readonly labelKey: string;
}

export interface EnumParameter<O extends string = string> extends ParameterBase {
  readonly type: 'enum';
  readonly default: O;
  readonly options: readonly EnumOption<O>[];
}

export type ParameterDefinition =
  NumberParameter | IntegerParameter | BooleanParameter | EnumParameter;

/** The options of a method, keyed by parameter name. */
export type ParameterSchema = Readonly<Record<string, ParameterDefinition>>;

export type ParameterValue = number | boolean | string;

type ValueOfDefinition<D> =
  D extends EnumParameter<infer O> ? O : D extends BooleanParameter ? boolean : number;

/** The value object a schema describes: `{ lambda: number; mode: 'a' | 'b' }`. */
export type ParameterValuesOf<S extends ParameterSchema> = {
  readonly [K in keyof S]: ValueOfDefinition<S[K]>;
};

/**
 * Declares a parameter schema and keeps its literal types, so `ParameterValuesOf` can
 * derive the exact value type (including enum unions).
 */
export function defineParameters<const S extends ParameterSchema>(schema: S): S {
  return schema;
}

/** No parameters. */
export const NO_PARAMETERS = defineParameters({});

/** The default value of every parameter. */
export function defaultParameters<S extends ParameterSchema>(schema: S): ParameterValuesOf<S> {
  return Object.fromEntries(
    Object.entries(schema).map(([name, definition]) => [name, definition.default]),
  ) as ParameterValuesOf<S>;
}

type Verdict = { readonly code: string; readonly params?: Record<string, string | number> } | null;

function checkValue(definition: ParameterDefinition, value: unknown): Verdict {
  switch (definition.type) {
    case 'boolean':
      return typeof value === 'boolean' ? null : { code: ISSUE_CODES.parameterInvalidType };
    case 'enum':
      return typeof value !== 'string'
        ? { code: ISSUE_CODES.parameterInvalidType }
        : definition.options.some((option) => option.value === value)
          ? null
          : { code: ISSUE_CODES.parameterInvalidOption, params: { value } };
    case 'integer':
    case 'number': {
      if (typeof value !== 'number' || !Number.isFinite(value)) {
        return { code: ISSUE_CODES.parameterInvalidType };
      }
      if (definition.type === 'integer' && !Number.isInteger(value)) {
        return { code: ISSUE_CODES.parameterNotInteger, params: { value } };
      }
      const exclusiveMin = definition.type === 'number' && definition.exclusiveMin === true;
      const exclusiveMax = definition.type === 'number' && definition.exclusiveMax === true;
      const { min, max } = definition;
      const belowMin = min !== undefined && (exclusiveMin ? value <= min : value < min);
      const aboveMax = max !== undefined && (exclusiveMax ? value >= max : value > max);
      if (belowMin || aboveMax) {
        return {
          code: ISSUE_CODES.parameterOutOfRange,
          params: {
            value,
            ...(min === undefined ? {} : { min }),
            ...(max === undefined ? {} : { max }),
          },
        };
      }
      return null;
    }
  }
}

export interface ResolvedParameters<S extends ParameterSchema> {
  /**
   * A value for every parameter: the given one when it is valid, otherwise the default.
   * Only use it when `validation.ok` is true.
   */
  readonly values: ParameterValuesOf<S>;
  readonly validation: ValidationResult;
}

/**
 * Fills in defaults and checks the given values against the schema. Unknown names, wrong
 * types and out-of-range values are errors: a typo must never silently run with a default.
 */
export function resolveParameters<S extends ParameterSchema>(
  schema: S,
  given: unknown = {},
): ResolvedParameters<S> {
  const v = createValidation();
  const values: Record<string, ParameterValue> = { ...defaultParameters(schema) };
  if (typeof given !== 'object' || given === null || Array.isArray(given)) {
    v.error(ISSUE_CODES.inputMalformed, { params: { input: 'parameters' } });
    return { values: values as ParameterValuesOf<S>, validation: v.result() };
  }
  for (const [name, value] of Object.entries(given)) {
    if (value === undefined) continue;
    const definition = Object.hasOwn(schema, name) ? schema[name] : undefined;
    if (definition === undefined) {
      v.error(ISSUE_CODES.parameterUnknown, { params: { name }, location: { parameter: name } });
      continue;
    }
    const verdict = checkValue(definition, value);
    if (verdict === null) {
      values[name] = value as ParameterValue;
    } else {
      v.error(verdict.code, {
        params: { name, ...verdict.params },
        location: { parameter: name },
      });
    }
  }
  return { values: values as ParameterValuesOf<S>, validation: v.result() };
}

/** Problems of a schema definition itself (a default outside its own range...). */
export function parameterSchemaProblems(schema: ParameterSchema): string[] {
  const problems: string[] = [];
  for (const [name, definition] of Object.entries(schema)) {
    if (definition.type === 'enum') {
      const values = definition.options.map((option) => option.value);
      if (values.length === 0) problems.push(`parameter "${name}" has no options`);
      if (new Set(values).size !== values.length) {
        problems.push(`parameter "${name}" has duplicate options`);
      }
    }
    if (
      (definition.type === 'number' || definition.type === 'integer') &&
      definition.min !== undefined &&
      definition.max !== undefined &&
      definition.min > definition.max
    ) {
      problems.push(`parameter "${name}" has min greater than max`);
    }
    if (checkValue(definition, definition.default) !== null) {
      problems.push(`the default of parameter "${name}" is not a valid value`);
    }
  }
  return problems;
}

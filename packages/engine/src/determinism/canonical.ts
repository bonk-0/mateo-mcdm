import { EngineError } from '../errors';

/**
 * A canonical text form of plain data: object keys sorted, `-0`, `NaN` and infinities
 * spelled out (JSON would turn them into `0` and `null`), `undefined` properties skipped.
 * Two values have the same canonical form exactly when they are structurally identical,
 * which makes it a cheap, order-independent equality check for results and traces.
 */
export function canonicalJson(value: unknown): string {
  return write(value, new Set());
}

function write(value: unknown, ancestors: Set<object>): string {
  if (value === null) return 'null';
  switch (typeof value) {
    case 'number':
      if (Object.is(value, -0)) return '-0';
      return Number.isFinite(value) ? JSON.stringify(value) : String(value);
    case 'string':
    case 'boolean':
      return JSON.stringify(value);
    case 'undefined':
      return 'undefined';
    case 'object':
      break;
    default:
      throw new EngineError('INVALID_ARGUMENT', `Cannot canonicalize a ${typeof value}.`);
  }
  if (ancestors.has(value)) {
    throw new EngineError('INVALID_ARGUMENT', 'Cannot canonicalize a cyclic structure.');
  }
  ancestors.add(value);
  let text: string;
  if (Array.isArray(value)) {
    text = `[${value.map((item) => write(item, ancestors)).join(',')}]`;
  } else {
    const record = value as Record<string, unknown>;
    const members = Object.keys(record)
      .filter((key) => record[key] !== undefined)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${write(record[key], ancestors)}`);
    text = `{${members.join(',')}}`;
  }
  ancestors.delete(value);
  return text;
}

/** Recursively freezes plain data and returns it. */
export function deepFreeze<T>(value: T): T {
  if (typeof value === 'object' && value !== null && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const member of Object.values(value)) deepFreeze(member);
  }
  return value;
}

/** A deep copy of plain data (objects, arrays and primitives). */
export function deepClone<T>(value: T): T {
  if (typeof value !== 'object' || value === null) return value;
  if (Array.isArray(value)) return value.map((item: unknown) => deepClone(item)) as T;
  return Object.fromEntries(
    Object.entries(value).map(([key, member]) => [key, deepClone(member)]),
  ) as T;
}

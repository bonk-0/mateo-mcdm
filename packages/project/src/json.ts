import { ProjectError } from './errors';

/** Plain JSON data. */
export type JsonValue =
  null | boolean | number | string | readonly JsonValue[] | { readonly [key: string]: JsonValue };

export type JsonObject = { readonly [key: string]: JsonValue };

/**
 * Serializes plain data for storage without losing or inventing anything.
 *
 * `JSON.stringify` silently turns `NaN` and infinities into `null` and `-0` into `0`. A
 * project file must never hold a value that differs from the one in memory, so:
 *
 * - non-finite numbers, `undefined` array items, functions, symbols, bigints and objects
 *   that are not plain (dates, maps, typed arrays...) are rejected;
 * - `-0` is written as `-0`, which `JSON.parse` reads back as `-0`;
 * - `undefined` properties are skipped, as in `JSON.stringify`.
 *
 * Every finite double survives `decodeJson(encodeJson(x))` bit for bit, because both
 * directions are done by the JavaScript engine (shortest round-trip representation) and
 * the text is stored as-is.
 */
export function encodeJson(value: unknown): string {
  // Validation pass first; the common case (no -0 anywhere) can then use the fast
  // built-in serializer.
  const needsExactWriter = inspect(value, '$', new Set());
  return needsExactWriter ? write(value) : JSON.stringify(value);
}

/** Parses stored JSON. A syntax error means the file is damaged. */
export function decodeJson(text: string, what: string): unknown {
  try {
    return JSON.parse(text) as unknown;
  } catch (cause) {
    throw new ProjectError(
      'CORRUPT_FILE',
      `The project file holds invalid JSON in ${what}.`,
      { what },
      { cause },
    );
  }
}

function isPlainObject(value: object): boolean {
  const prototype: unknown = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

/** Throws on anything that cannot be stored exactly. Returns true when `-0` occurs. */
function inspect(value: unknown, path: string, ancestors: Set<object>): boolean {
  switch (typeof value) {
    case 'string':
    case 'boolean':
      return false;
    case 'number':
      if (!Number.isFinite(value)) {
        throw new ProjectError(
          'INVALID_ARGUMENT',
          `Cannot store the non-finite number ${String(value)} at ${path}.`,
          { path },
        );
      }
      return Object.is(value, -0);
    case 'object':
      break;
    default:
      throw new ProjectError('INVALID_ARGUMENT', `Cannot store a ${typeof value} at ${path}.`, {
        path,
      });
  }
  if (value === null) return false;
  if (ancestors.has(value)) {
    throw new ProjectError('INVALID_ARGUMENT', `Cannot store a cyclic structure at ${path}.`, {
      path,
    });
  }
  ancestors.add(value);
  let negativeZero = false;
  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index += 1) {
      if (inspect(value[index], `${path}[${index}]`, ancestors)) negativeZero = true;
    }
  } else {
    if (!isPlainObject(value)) {
      throw new ProjectError('INVALID_ARGUMENT', `Cannot store a non-plain object at ${path}.`, {
        path,
      });
    }
    const record = value as Record<string, unknown>;
    for (const key of Object.keys(record)) {
      const member = record[key];
      if (member === undefined) continue;
      if (inspect(member, `${path}.${key}`, ancestors)) negativeZero = true;
    }
  }
  ancestors.delete(value);
  return negativeZero;
}

/** JSON writer that keeps `-0`. Only called on values `inspect` accepted. */
function write(value: unknown): string {
  if (typeof value === 'number') return Object.is(value, -0) ? '-0' : JSON.stringify(value);
  if (typeof value !== 'object' || value === null) return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map((item) => write(item)).join(',')}]`;
  const record = value as Record<string, unknown>;
  const members: string[] = [];
  for (const key of Object.keys(record)) {
    const member = record[key];
    if (member !== undefined) members.push(`${JSON.stringify(key)}:${write(member)}`);
  }
  return `{${members.join(',')}}`;
}

import { ProjectError } from '../errors';

/**
 * Ids are used as object keys and as primary keys, and files come from anywhere, so their
 * form is restricted: 1 to 64 characters, starting with a letter or digit, then letters,
 * digits, `.`, `_`, `:` or `-`. This excludes `__proto__` and the empty string.
 */
const ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,63}$/;

export function isValidId(value: unknown): value is string {
  return typeof value === 'string' && ID_PATTERN.test(value);
}

export function assertValidId(value: unknown, what: string): asserts value is string {
  if (!isValidId(value)) {
    throw new ProjectError(
      'INVALID_ARGUMENT',
      `Invalid id for ${what}: ${JSON.stringify(value)}.`,
      {
        what,
      },
    );
  }
}

/** A new random id (UUID v4) from the platform's `crypto.randomUUID`. */
export function randomId(): string {
  const platform = globalThis as { crypto?: { randomUUID?: () => string } };
  const id = platform.crypto?.randomUUID?.();
  if (id === undefined) {
    throw new ProjectError(
      'INVALID_ARGUMENT',
      'crypto.randomUUID is not available; pass an id generator to the repository.',
    );
  }
  return id;
}

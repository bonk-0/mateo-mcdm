import { messageArguments } from '@mateo/i18n';
import { describe, expect, it } from 'vitest';
import * as io from '../index';
import { IMPORT_ISSUE_CODES } from '../import/codes';
import { IO_MESSAGES } from './index';

const placeholders = (message: string): string[] => {
  const parsed = messageArguments(message);
  if ('error' in parsed) throw new Error(`${message}: ${parsed.error}`);
  return [...parsed.args].sort();
};

describe('import messages', () => {
  it('has an English and a Turkish text for every issue code', () => {
    for (const code of Object.values(IMPORT_ISSUE_CODES)) {
      const key = `validation.${code}` as const;
      expect(IO_MESSAGES.en[key], key).toBeTruthy();
      expect(IO_MESSAGES.tr[key], key).toBeTruthy();
    }
    expect(Object.keys(IO_MESSAGES.en).sort()).toEqual(
      Object.values(IMPORT_ISSUE_CODES)
        .map((code) => `validation.${code}`)
        .sort(),
    );
  });

  it('uses the same arguments in both languages', () => {
    expect(Object.keys(IO_MESSAGES.tr).sort()).toEqual(Object.keys(IO_MESSAGES.en).sort());
    for (const key of Object.keys(IO_MESSAGES.en) as (keyof typeof IO_MESSAGES.en)[]) {
      expect(placeholders(IO_MESSAGES.tr[key]), key).toEqual(placeholders(IO_MESSAGES.en[key]));
    }
  });

  it('is exported from the package', () => {
    expect(io.PACKAGE_NAME).toBe('@mateo/io');
    expect(io.IO_MESSAGES).toBe(IO_MESSAGES);
    expect(typeof io.importFile).toBe('function');
  });
});

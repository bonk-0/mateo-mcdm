import type { ValidationIssue } from '@mateo/engine';
import * as XLSX from 'xlsx';
import type { ImportResult } from '../import/model';

type TextEncoderConstructor = new () => { encode(text: string): Uint8Array };

/** UTF-8 bytes of a text, for CSV written inline in a test. */
export function utf8(text: string): Uint8Array {
  const ctor = (globalThis as unknown as { TextEncoder: TextEncoderConstructor }).TextEncoder;
  return new ctor().encode(text);
}

/** Bytes of a one-sheet workbook written inline in a test. */
export function xlsxBytes(
  rows: readonly (readonly unknown[])[],
  bookType: XLSX.BookType = 'xlsx',
): Uint8Array {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows as unknown[][]), 'Sheet1');
  return new Uint8Array(XLSX.write(wb, { type: 'array', bookType }) as ArrayBuffer);
}

/** `code` or `code@cell` for each issue, for compact assertions. */
export function issueKeys(issues: readonly ValidationIssue[]): string[] {
  return issues.map((issue) => {
    const cell = issue.params?.['cell'];
    return cell === undefined ? issue.code : `${issue.code}@${String(cell)}`;
  });
}

export function errorKeys(result: ImportResult): string[] {
  return issueKeys(result.validation.errors);
}

export function warningKeys(result: ImportResult): string[] {
  return issueKeys(result.validation.warnings);
}

export function names(result: ImportResult): { alternatives: string[]; criteria: string[] } {
  return {
    alternatives: (result.model?.alternatives ?? []).map((item) =>
      'text' in item.name ? item.name.text : item.name.key,
    ),
    criteria: (result.model?.criteria ?? []).map((item) => item.name.text),
  };
}

/** The value of the first decision of a kind. */
export function decision<K extends ImportResult['decisions'][number]['kind']>(
  result: ImportResult,
  kind: K,
): Extract<ImportResult['decisions'][number], { kind: K }> | undefined {
  return result.decisions.find((item) => item.kind === kind) as
    Extract<ImportResult['decisions'][number], { kind: K }> | undefined;
}

/**
 * The import engine: file bytes → proposed model, structure decisions and validation.
 *
 * ```ts
 * const result = importFile(bytes, { fileName: 'veri.xlsx' });
 * result.decisions;   // what was detected, for the wizard to show
 * result.validation;  // errors block the import, warnings are stored with the dataset
 * result.model;       // the proposed model; missing cells are null and reported
 *
 * // The user changes a decision: import again with an override.
 * importFile(bytes, { fileName: 'veri.xlsx', overrides: { numberFormat: 'comma' } });
 * ```
 */
import type { ValidationIssue, ValidationResult } from '@mateo/engine';
import { createValidation } from '@mateo/engine';
import type { LinguisticScale } from '@mateo/fuzzy';
import { buildModel } from './build';
import { isValueKind } from './cells';
import { IMPORT_ISSUE_CODES as CODES } from './codes';
import type { ImportDecision } from './decisions';
import { detectLayout } from './detect';
import type { ImportResult, ImportSourceSummary } from './model';
import type { ImportOverrides } from './overrides';
import { readSource } from './read';
import type { SheetView } from './sheet-view';
import { createSheetView } from './sheet-view';
import type { LabelTexts, TermIndex } from './terms';
import { DEFAULT_IMPORT_SCALES, buildTermIndex } from './terms';
import { fold } from './text';
import type { SourceWorkbook } from './types';

export interface ImportOptions {
  /** Original file name: tells `.xlsm` from `.xlsx` and `.tsv` from `.csv`. */
  readonly fileName?: string;
  /** Decisions set by the user or an import profile instead of detected. */
  readonly overrides?: ImportOverrides;
  /** Linguistic scales to match text cells against. Default: the predefined rating scales. */
  readonly scales?: readonly LinguisticScale[];
  /** Texts of i18n-keyed term labels. Default: the English and Turkish texts of `@mateo/fuzzy`. */
  readonly labelTexts?: LabelTexts;
}

function toResult(issues: readonly ValidationIssue[]): ValidationResult {
  const v = createValidation();
  v.add(issues);
  return v.result();
}

/** Imports a file. Never throws for bad input: problems are in `validation`. */
export function importFile(bytes: Uint8Array, options: ImportOptions = {}): ImportResult {
  const overrides = options.overrides ?? {};
  const read = readSource(bytes, {
    ...(options.fileName === undefined ? {} : { fileName: options.fileName }),
    ...(overrides.encoding === undefined ? {} : { encoding: overrides.encoding }),
    ...(overrides.delimiter === undefined ? {} : { delimiter: overrides.delimiter }),
  });
  if (read.source === undefined) {
    return { decisions: read.decisions, validation: toResult(read.issues) };
  }
  const imported = importWorkbook(read.source, options);
  const v = createValidation();
  v.add(read.issues);
  v.add(imported.validation);
  return {
    ...imported,
    decisions: [...read.decisions, ...imported.decisions],
    validation: v.result(),
  };
}

function valueCount(view: SheetView): number {
  let count = 0;
  for (let row = 0; row < view.height; row += 1) {
    for (let column = 0; column < view.width; column += 1) {
      if (isValueKind(view.kind(row, column))) count += 1;
    }
  }
  return count;
}

/**
 * Imports an already read workbook. The wizard keeps the {@link SourceWorkbook} and calls
 * this again whenever the user changes a decision that does not need the file re-read
 * (everything except the encoding and the delimiter).
 */
export function importWorkbook(source: SourceWorkbook, options: ImportOptions = {}): ImportResult {
  const overrides = options.overrides ?? {};
  const v = createValidation();
  const decisions: ImportDecision[] = [];
  const terms: TermIndex = buildTermIndex(
    options.scales ?? DEFAULT_IMPORT_SCALES,
    ...(options.labelTexts === undefined ? [] : [options.labelTexts]),
  );
  const summary: ImportSourceSummary = {
    format: source.format,
    sheetNames: source.sheets.map((sheet) => sheet.name),
    ...(source.encoding === undefined ? {} : { encoding: source.encoding }),
    ...(source.delimiter === undefined ? {} : { delimiter: source.delimiter }),
  };

  // Sheet: the override, or the visible sheet with the most values.
  const views = source.sheets.map((sheet) => createSheetView(sheet, terms));
  const scored = views.map((view) => ({ view, score: valueCount(view) }));
  let chosen: SheetView | undefined;
  if (overrides.sheet !== undefined) {
    const wanted = overrides.sheet;
    chosen =
      typeof wanted === 'number'
        ? views[wanted]
        : (views.find((view) => view.sheet.name === wanted) ??
          views.find((view) => fold(view.sheet.name) === fold(wanted)));
    if (chosen === undefined) {
      v.error(CODES.sheetNotFound, { params: { sheet: String(wanted) } });
      return { source: summary, decisions, validation: v.result() };
    }
  } else {
    const ranked = [...scored].sort(
      (a, b) =>
        Number(a.view.sheet.hidden) - Number(b.view.sheet.hidden) ||
        b.score - a.score ||
        a.view.sheet.index - b.view.sheet.index,
    );
    chosen = ranked[0]?.view;
  }
  if (chosen === undefined) {
    v.error(CODES.fileNoData);
    return { source: summary, decisions, validation: v.result() };
  }
  const sheetRef = { name: chosen.sheet.name, index: chosen.sheet.index };
  if (source.format !== 'csv' && source.format !== 'tsv') {
    decisions.push({
      kind: 'sheet',
      status: overrides.sheet === undefined ? 'detected' : 'override',
      value: sheetRef,
      candidates: scored
        .filter((item) => item.score > 0)
        .map((item) => ({ name: item.view.sheet.name, index: item.view.sheet.index })),
    });
  }
  const withSheet: ImportSourceSummary = { ...summary, sheet: sheetRef };
  if (valueCount(chosen) === 0) {
    v.error(CODES.fileNoData, { params: { sheet: chosen.sheet.name } });
    return { source: withSheet, decisions, validation: v.result() };
  }

  const layout = detectLayout(chosen, overrides, v, decisions);
  const model = buildModel(chosen, layout, overrides, v, decisions);
  return { source: withSheet, model, decisions, validation: v.result() };
}

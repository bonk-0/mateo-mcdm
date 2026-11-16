import {
  importFile,
  type ColumnRef,
  type CriterionDecision,
  type Delimiter,
  type IgnoredColumnDecision,
  type ImportDecision,
  type ImportOverrides,
  type ImportResult,
  type NumberFormatId,
  type TextEncodingId,
} from '@mateo/io';
import type { CriterionDirection, ValidationIssue } from '@mateo/engine';

/** The steps of the import wizard, in order (docs: base-plan.md §6.4). */
export const WIZARD_STEPS = [
  'upload',
  'sheet',
  'structure',
  'columns',
  'types',
  'missing',
  'validation',
  'preview',
  'confirm',
] as const;
export type WizardStep = (typeof WIZARD_STEPS)[number];

/** The file (or pasted text) being imported. */
export interface ImportInput {
  /** Name shown to the user and stored with the file. */
  readonly name: string;
  readonly bytes: Uint8Array;
  readonly mediaType: string;
  /** Text pasted from the clipboard instead of a file. */
  readonly pasted: boolean;
}

export function isTextFormat(result: ImportResult | undefined): boolean {
  const format = result?.source?.format;
  return format === 'csv' || format === 'tsv';
}

/** Steps the wizard walks through for this file: a text file has no sheet to choose. */
export function stepsFor(result: ImportResult | undefined): readonly WizardStep[] {
  const skipSheet = result?.source !== undefined && isTextFormat(result);
  return WIZARD_STEPS.filter((step) => !(skipSheet && step === 'sheet'));
}

export function runImport(input: ImportInput, overrides: ImportOverrides): ImportResult {
  return importFile(input.bytes, { fileName: input.name, overrides });
}

/** Wizard-level problems that block the import in addition to the validation errors. */
export type BlockReason = 'noData' | 'errors' | 'directions';

export interface Readiness {
  readonly ok: boolean;
  readonly reasons: readonly BlockReason[];
  /** Criteria (by index) whose direction the file does not give and the user has not chosen. */
  readonly directionsMissing: readonly number[];
}

export function criteriaOf(result: ImportResult): readonly CriterionDecision[] {
  return result.decisions.filter((d): d is CriterionDecision => d.kind === 'criterion');
}

export function ignoredColumnsOf(result: ImportResult): readonly IgnoredColumnDecision[] {
  return result.decisions.filter((d): d is IgnoredColumnDecision => d.kind === 'ignored-column');
}

export function decisionOf<K extends ImportDecision['kind']>(
  result: ImportResult,
  kind: K,
): Extract<ImportDecision, { kind: K }> | undefined {
  return result.decisions.find((d): d is Extract<ImportDecision, { kind: K }> => d.kind === kind);
}

/**
 * Directions are never assumed: a criterion without one blocks the import until the user
 * picks benefit or cost.
 */
export function directionsMissing(result: ImportResult): readonly number[] {
  const missing: number[] = [];
  const model = result.model;
  if (!model) return missing;
  model.criteria.forEach((criterion, index) => {
    if (criterion.direction === null) missing.push(index);
  });
  return missing;
}

export function readiness(result: ImportResult): Readiness {
  const reasons: BlockReason[] = [];
  if (!result.model) reasons.push('noData');
  if (!result.validation.ok) reasons.push('errors');
  const missing = directionsMissing(result);
  if (result.model && missing.length > 0) reasons.push('directions');
  return { ok: reasons.length === 0, reasons, directionsMissing: missing };
}

/** The chosen direction of each criterion, once none is missing. */
export function chosenDirections(result: ImportResult): CriterionDirection[] {
  return (result.model?.criteria ?? []).map((criterion) => criterion.direction ?? 'benefit');
}

// --- Changing a decision: each helper returns new overrides ---------------------------

export function withSheet(overrides: ImportOverrides, sheet: string): ImportOverrides {
  // A different sheet has different columns: the structure decisions start over.
  return { ...pickFileLevel(overrides), sheet };
}

/** Decisions about the file itself, kept when the sheet or the file changes. */
function pickFileLevel(overrides: ImportOverrides): ImportOverrides {
  const kept: { -readonly [K in keyof ImportOverrides]: ImportOverrides[K] } = {};
  if (overrides.encoding !== undefined) kept.encoding = overrides.encoding;
  if (overrides.delimiter !== undefined) kept.delimiter = overrides.delimiter;
  if (overrides.numberFormat !== undefined) kept.numberFormat = overrides.numberFormat;
  return kept;
}

export function withEncoding(overrides: ImportOverrides, encoding: TextEncodingId | null) {
  const { encoding: _old, ...rest } = overrides;
  void _old;
  return encoding === null ? rest : { ...rest, encoding };
}

export function withDelimiter(overrides: ImportOverrides, delimiter: Delimiter | null) {
  const { delimiter: _old, ...rest } = overrides;
  void _old;
  return delimiter === null ? rest : { ...rest, delimiter };
}

export function withNumberFormat(overrides: ImportOverrides, format: NumberFormatId | null) {
  const { numberFormat: _old, ...rest } = overrides;
  void _old;
  return format === null ? rest : { ...rest, numberFormat: format };
}

export function withScale(overrides: ImportOverrides, scaleId: string | null) {
  const { scaleId: _old, ...rest } = overrides;
  void _old;
  return scaleId === null ? rest : { ...rest, scaleId };
}

/** `rows` is `null` when the file has no header row. */
export function withHeaderRows(overrides: ImportOverrides, rows: readonly number[] | null) {
  return { ...overrides, headerRows: rows };
}

export function withIdColumn(overrides: ImportOverrides, column: number | null) {
  return { ...overrides, idColumn: column === null ? null : { column } };
}

export function withDirectionRow(overrides: ImportOverrides, row: number | null) {
  return { ...overrides, directionRow: row };
}

export function withDirection(
  overrides: ImportOverrides,
  criterionName: string,
  direction: CriterionDirection,
): ImportOverrides {
  return { ...overrides, directions: { ...overrides.directions, [criterionName]: direction } };
}

function sameRef(a: ColumnRef, column: number): boolean {
  return 'column' in a && a.column === column;
}

/** Leaves the columns out of the import, or takes them back in. */
export function withColumnsIgnored(
  overrides: ImportOverrides,
  columns: readonly number[],
  ignored: boolean,
): ImportOverrides {
  const rest = (overrides.ignoreColumns ?? []).filter(
    (ref) => !columns.some((column) => sameRef(ref, column)),
  );
  const next = ignored ? [...rest, ...columns.map((column): ColumnRef => ({ column }))] : rest;
  const { ignoreColumns: _old, ...others } = overrides;
  void _old;
  return next.length === 0 ? others : { ...others, ignoreColumns: next };
}

/** Whether the user (not the detection) left the column out. */
export function isColumnIgnoredByUser(overrides: ImportOverrides, column: number): boolean {
  return (overrides.ignoreColumns ?? []).some((ref) => sameRef(ref, column));
}

// --- Issues ------------------------------------------------------------------------------

export const MISSING_CODE = 'import.cell.missing';

export function issuesOf(result: ImportResult): readonly ValidationIssue[] {
  return [...result.validation.errors, ...result.validation.warnings];
}

/** Missing cells, listed on their own step: they are never filled in. */
export function missingCellIssues(result: ImportResult): readonly ValidationIssue[] {
  return issuesOf(result).filter((issue) => issue.code === MISSING_CODE);
}

export function otherIssues(result: ImportResult): readonly ValidationIssue[] {
  return issuesOf(result).filter((issue) => issue.code !== MISSING_CODE);
}

/** The file name without its extension, for naming the dataset. */
export function datasetNameFor(fileName: string): string {
  const dot = fileName.lastIndexOf('.');
  const base = dot > 0 ? fileName.slice(0, dot) : fileName;
  return base.trim() === '' ? fileName : base.trim();
}

export function mediaTypeOf(fileName: string): string {
  const lower = fileName.toLowerCase();
  if (lower.endsWith('.xlsx'))
    return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  if (lower.endsWith('.xlsm')) return 'application/vnd.ms-excel.sheet.macroEnabled.12';
  if (lower.endsWith('.xls')) return 'application/vnd.ms-excel';
  if (lower.endsWith('.tsv')) return 'text/tab-separated-values';
  return 'text/csv';
}

/** Text copied from a spreadsheet range, as a file the importer reads (UTF-8 with a BOM). */
export function clipboardInput(text: string, name: string): ImportInput {
  const body = new TextEncoder().encode(text);
  const bytes = new Uint8Array(body.length + 3);
  bytes.set([0xef, 0xbb, 0xbf]);
  bytes.set(body, 3);
  return { name, bytes, mediaType: 'text/tab-separated-values', pasted: true };
}

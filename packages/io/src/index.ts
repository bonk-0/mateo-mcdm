/**
 * @mateo/io — Excel/CSV import and export, structure detection, locale parsing.
 *
 * Import side (P1.9): `importFile` turns the bytes of an XLSX, XLSM, XLS, CSV or TSV file
 * into a proposed model, the structure decisions behind it and a validation result. See
 * the package README.
 */
export const PACKAGE_NAME = '@mateo/io';

export * from './import/cells';
export * from './import/codes';
export * from './import/decisions';
export type { DecodedText, EncodingStatus } from './import/encoding';
export { decodeText } from './import/encoding';
export type { DelimiterDetection, DelimiterScore, DelimiterStatus } from './import/delimiter';
export { detectDelimiter } from './import/delimiter';
export * from './import/import';
export * from './import/model';
export * from './import/numbers';
export * from './import/overrides';
export * from './import/profile';
export type { ReadOptions, ReadResult } from './import/read';
export { readSource } from './import/read';
export type { LabelTexts, TermIndex } from './import/terms';
export { DEFAULT_IMPORT_SCALES, buildTermIndex, scalesCovering, termOf } from './import/terms';
export { cellAddress, columnLetters } from './import/text';
export * from './import/types';
export * from './export';
export * from './messages';

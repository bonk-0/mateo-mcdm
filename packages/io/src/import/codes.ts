/**
 * Issue codes reported by the import engine. Like the engine's codes they are part of the
 * public contract: the import wizard and stored import warnings match on them. The i18n
 * key of each message is `validation.<code>` (see `messages/en.ts`).
 */
export const IMPORT_ISSUE_CODES = {
  // File
  fileEmpty: 'import.file.empty',
  fileUnsupported: 'import.file.unsupported-format',
  fileUnreadable: 'import.file.unreadable',
  fileEncrypted: 'import.file.encrypted',
  fileNoData: 'import.file.no-data',
  sheetNotFound: 'import.sheet.not-found',

  // Text files
  encodingUncertain: 'import.encoding.uncertain',
  encodingReplacement: 'import.encoding.replacement-characters',
  delimiterAmbiguous: 'import.delimiter.ambiguous',
  csvMalformedRow: 'import.csv.malformed-row',

  // Number format
  numberFormatAmbiguous: 'import.number-format.ambiguous',
  numberFormatConflict: 'import.number-format.conflict',
  numberFormatOverrideConflict: 'import.number-format.override-conflict',

  // Structure
  headerNotFound: 'import.header.not-found',
  alternativeNamesGenerated: 'import.alternative.names-generated',
  alternativeNameMissing: 'import.alternative.name-missing',
  alternativeDuplicate: 'import.alternative.duplicate',
  criterionNameMissing: 'import.criterion.name-missing',
  criterionDuplicate: 'import.criterion.duplicate',
  columnTextIgnored: 'import.column.text-ignored',
  rowExcluded: 'import.row.excluded',
  tfnIncompleteGroup: 'import.tfn.incomplete-group',
  noAlternatives: 'import.matrix.no-alternatives',
  noCriteria: 'import.matrix.no-criteria',

  // Directions
  directionMissing: 'import.direction.missing',
  directionInvalid: 'import.direction.invalid',
  directionConflict: 'import.direction.conflict',

  // Linguistic scales
  scaleAmbiguous: 'import.scale.ambiguous',
  scaleNoMatch: 'import.scale.no-match',
  scaleNotFound: 'import.scale.not-found',

  // Cells
  cellMissing: 'import.cell.missing',
  cellInvalidNumber: 'import.cell.invalid-number',
  cellNeedsNumberFormat: 'import.cell.needs-number-format',
  cellFormulaError: 'import.cell.formula-error',
  cellFormulaWithoutValue: 'import.cell.formula-without-value',
  cellDate: 'import.cell.date',
  cellPercent: 'import.cell.percent',
  cellUnknownTerm: 'import.cell.unknown-term',
  cellInvalidTfn: 'import.cell.invalid-tfn',
  cellTfnOrder: 'import.cell.tfn-order',
  cellNeedsScale: 'import.cell.needs-scale',
  weightInvalid: 'import.weight.invalid',

  // Profiles
  profileInvalid: 'import.profile.invalid',
  profileVersion: 'import.profile.unsupported-version',
  profileColumnNotFound: 'import.profile.column-not-found',
} as const;

export type ImportIssueCode = (typeof IMPORT_ISSUE_CODES)[keyof typeof IMPORT_ISSUE_CODES];

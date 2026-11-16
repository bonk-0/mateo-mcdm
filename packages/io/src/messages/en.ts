/**
 * English texts for the keys the import engine emits (ICU message format). English is the
 * source language; `tr.ts` must define exactly the same keys.
 */
export const en = {
  'validation.import.file.empty': 'The file is empty.',
  'validation.import.file.unsupported-format':
    'This file type is not supported. Import an XLSX, XLSM, XLS, CSV or TSV file.',
  'validation.import.file.unreadable': 'The file could not be read. It may be damaged.',
  'validation.import.file.encrypted':
    'The file is password-protected. Save it without a password and import it again.',
  'validation.import.file.no-data': 'No numbers or linguistic ratings were found in the file.',
  'validation.import.sheet.not-found': 'The file has no sheet named "{sheet}".',

  'validation.import.encoding.uncertain':
    'The text encoding could not be confirmed; it was read as {encoding}. Check the letters in the preview.',
  'validation.import.encoding.replacement-characters':
    '{count, plural, one {# character} other {# characters}} could not be read as {encoding}.',
  'validation.import.delimiter.ambiguous':
    'More than one delimiter splits the file evenly; {delimiter, select, comma {comma} semicolon {semicolon} other {tab}} was used. Check the columns.',
  'validation.import.csv.malformed-row':
    'Row {row, number} has an unclosed quote; its fields may be split wrongly.',

  'validation.import.number-format.ambiguous':
    'The number format cannot be told from the file: values such as "{example}" read differently with a decimal point and a decimal comma. Choose the number format.',
  'validation.import.number-format.conflict':
    'The file mixes number formats: "{point}" uses a decimal point and "{comma}" a decimal comma. Choose the number format.',
  'validation.import.number-format.override-conflict':
    '{count, plural, one {# value does} other {# values do}} not fit the chosen number format, for example "{example}".',

  'validation.import.header.not-found':
    'No header row was found; criteria are named after their columns.',
  'validation.import.alternative.names-generated':
    'No column names the alternatives; they were named A1 to A{count, number}.',
  'validation.import.alternative.name-missing': 'The alternative in cell {cell} has no name.',
  'validation.import.alternative.duplicate': 'The alternative "{name}" appears more than once.',
  'validation.import.criterion.name-missing':
    'Column {column} has no header; the criterion is named after the column.',
  'validation.import.criterion.duplicate': 'The criterion "{name}" appears more than once.',
  'validation.import.column.text-ignored':
    'Column {column} ({header}) holds text only and was not imported as a criterion.',
  'validation.import.row.excluded':
    'Row {row, number} ({label}) looks like {reason, select, ideal {an ideal or anti-ideal row} other {a computed row}} and was not imported as an alternative.',
  'validation.import.tfn.incomplete-group':
    'Columns {columns} look like parts of a triangular fuzzy number, but l, m and u are not all there exactly once.',
  'validation.import.matrix.no-alternatives': 'No alternatives were found.',
  'validation.import.matrix.no-criteria': 'No criteria were found.',

  'validation.import.direction.missing':
    'The file does not say whether "{criterion}" is a benefit or a cost criterion.',
  'validation.import.direction.invalid':
    'Cell {cell} ("{text}") is not a direction. Use benefit or cost (max or min).',
  'validation.import.direction.conflict': 'The file gives "{criterion}" more than one direction.',

  'validation.import.scale.ambiguous':
    'The linguistic ratings fit more than one scale ({scales}). Choose the scale.',
  'validation.import.scale.no-match':
    'The linguistic ratings ({terms}) do not all belong to one scale. Choose a scale or fix the ratings.',
  'validation.import.scale.not-found': 'There is no linguistic scale "{scale}".',

  'validation.import.cell.missing':
    'Cell {cell} has no value. Missing values are never filled in automatically.',
  'validation.import.cell.invalid-number': 'Cell {cell} ("{text}") is not a number.',
  'validation.import.cell.needs-number-format':
    'Cell {cell} ("{text}") can be read only after the number format is chosen.',
  'validation.import.cell.formula-error': 'Cell {cell} holds the error {value}.',
  'validation.import.cell.formula-without-value':
    'Cell {cell} holds a formula with no saved result. Open the file in Excel, save it and import it again.',
  'validation.import.cell.date': 'Cell {cell} holds a date, not a criterion value.',
  'validation.import.cell.percent':
    '{count, plural, one {# value was} other {# values were}} written as percentages (first: {cell}) and divided by 100.',
  'validation.import.cell.unknown-term':
    'Cell {cell} ("{text}") is not a term of the scale "{scale}".',
  'validation.import.cell.invalid-tfn':
    'Cell {cell} ("{text}") is not a triangular fuzzy number. Write it as (l; m; u).',
  'validation.import.cell.tfn-order':
    'Cell {cell} holds ({l, number}, {m, number}, {u, number}); a triangular fuzzy number needs l ≤ m ≤ u.',
  'validation.import.cell.needs-scale':
    'Cell {cell} ("{text}") is a linguistic rating; choose a scale to convert it.',
  'validation.import.weight.invalid':
    'The weight in cell {cell} is missing or not valid; the weights row is incomplete.',

  'validation.import.profile.invalid': 'The import profile is not valid ({field}).',
  'validation.import.profile.unsupported-version':
    'The import profile has format version {version}; this version of Mateo reads version {supported, number}.',
  'validation.import.profile.column-not-found':
    'The import profile names the column "{header}", which this file does not have.',
} as const;

export type ImportMessageKey = keyof typeof en;

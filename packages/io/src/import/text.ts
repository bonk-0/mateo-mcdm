/**
 * Text helpers shared by the readers and the structure detection.
 */

/**
 * Folds text for keyword matching: Turkish-aware lower case (`I` and `İ` both become `i`,
 * `ı` becomes `i`), diacritics removed (`ş` → `s`, `ğ` → `g`, `ü` → `u`...), whitespace
 * collapsed and trimmed. `"  AĞIRLIK "` and `"agirlik"` fold to the same text.
 *
 * Only used to recognise keywords and labels. Values and names are never folded.
 */
export function fold(text: string): string {
  return text
    .normalize('NFC')
    .replace(/[İI]/g, 'i')
    .toLowerCase()
    .replace(/ı/g, 'i')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\s\u00a0\u202f\u2009]+/g, ' ')
    .trim();
}

/** Trims ordinary and non-breaking spaces and collapses inner runs of whitespace. */
export function cleanLabel(text: string): string {
  return text.replace(/[\s\u00a0\u202f\u2009]+/g, ' ').trim();
}

/** Spreadsheet column letters of a 0-based column index: 0 → `A`, 26 → `AA`. */
export function columnLetters(column: number): string {
  let n = column + 1;
  let letters = '';
  while (n > 0) {
    const rest = (n - 1) % 26;
    letters = String.fromCharCode(65 + rest) + letters;
    n = Math.floor((n - 1) / 26);
  }
  return letters;
}

/** A1-style address of a 0-based cell position: (0, 0) → `A1`. */
export function cellAddress(row: number, column: number): string {
  return `${columnLetters(column)}${row + 1}`;
}

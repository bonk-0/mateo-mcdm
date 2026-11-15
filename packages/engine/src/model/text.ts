/**
 * Text that is shown to the user.
 *
 * Built-in text (step names, AI/AAI row labels...) is a translation `key` resolved by the
 * i18n layer. Text typed or imported by the user (alternative and criterion names) is a
 * literal `text` that is shown as-is in every language.
 */
export type TextParams = Readonly<Record<string, string | number>>;

export interface TextKey {
  readonly key: string;
  readonly params?: TextParams;
}

export interface TextLiteral {
  readonly text: string;
}

export type TextRef = TextKey | TextLiteral;

export function textKey(key: string, params?: TextParams): TextKey {
  return params === undefined ? { key } : { key, params };
}

export function textLiteral(text: string): TextLiteral {
  return { text };
}

export function isTextKey(ref: TextRef): ref is TextKey {
  return 'key' in ref;
}

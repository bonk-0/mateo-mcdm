import type { FormulaTerm, TraceFormula, TraceValue } from '@mateo/engine';
import { renderFormula } from '@mateo/engine';
import type { CellExplanation, TermBinding } from './cell';

/** Wraps the LaTeX of a term, for example to make it a highlight target. */
export type TermWrapper = (term: FormulaTerm, latex: string) => string;

const identity: TermWrapper = (_term, latex) => latex;

const TEXT_ESCAPES: Readonly<Record<string, string>> = {
  '\\': String.raw`\textbackslash{}`,
  '{': String.raw`\{`,
  '}': String.raw`\}`,
  $: String.raw`\$`,
  '%': String.raw`\%`,
  '&': String.raw`\&`,
  '#': String.raw`\#`,
  _: String.raw`\_`,
  '^': String.raw`\textasciicircum{}`,
  '~': String.raw`\textasciitilde{}`,
};

/** Plain text as LaTeX: `\text{...}` with every special character escaped. */
export function latexText(text: string): string {
  const escaped = text.replace(/[\\{}$%&#_^~]/gu, (character) => TEXT_ESCAPES[character] ?? '');
  return String.raw`\text{${escaped}}`;
}

/** A formula in the notation of its source paper. */
export function symbolicLatex(formula: TraceFormula, wrapTerm: TermWrapper = identity): string {
  return renderFormula(formula, { term: (term) => wrapTerm(term, term.latex) });
}

export interface SubstitutionOptions {
  /** LaTeX of one number, already formatted for display. */
  readonly number: (value: number) => string;
  readonly wrapTerm?: TermWrapper;
  /** Longer lists of operands are shortened to the first values, an ellipsis and the last. */
  readonly maxListed?: number;
}

/** LaTeX of a trace value: a number, a text, or a composite such as a TFN `(l, m, u)`. */
export function valueLatex(value: TraceValue, number: (value: number) => string): string {
  if (value === null) return latexText('–');
  if (typeof value === 'number') return number(value);
  if (typeof value === 'string') return latexText(value);
  const parts = Object.values(value.components).map((component) => number(component));
  return String.raw`\left( ${parts.join(String.raw`,\, `)} \right)`;
}

function bindingLatex(binding: TermBinding, options: SubstitutionOptions): string {
  const values = binding.operands.map((operand) => valueLatex(operand.value, options.number));
  if (!binding.range && values.length === 1) return values[0] as string;
  const max = Math.max(2, options.maxListed ?? 6);
  const listed =
    values.length > max
      ? [...values.slice(0, max - 1), String.raw`\dots`, values[values.length - 1] as string]
      : values;
  return String.raw`\left\{ ${listed.join(String.raw`,\; `)} \right\}`;
}

/**
 * The formula of a cell with the numbers of that cell in place of its terms. A term that
 * has no value for the cell stays symbolic. `null` when no formula produced the cell.
 */
export function substitutionLatex(
  explanation: CellExplanation,
  options: SubstitutionOptions,
): string | null {
  const { formula } = explanation;
  if (formula === null) return null;
  const wrap = options.wrapTerm ?? identity;
  const bindings = new Map(explanation.bindings.map((binding) => [binding.term.name, binding]));
  return renderFormula(formula, {
    term: (term) => {
      const binding = bindings.get(term.name);
      return wrap(term, binding === undefined ? term.latex : bindingLatex(binding, options));
    },
  });
}

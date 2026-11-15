import { EngineError } from '../errors';
import type { FormulaTerm, TraceFormula } from './types';

const PLACEHOLDER = /\{\{\s*([A-Za-z0-9_.:-]+)\s*\}\}/g;

/** Names of the `{{term}}` placeholders of a template, in order of first appearance. */
export function formulaTermNames(template: string): string[] {
  const names = new Set<string>();
  for (const match of template.matchAll(PLACEHOLDER)) names.add(match[1] as string);
  return [...names];
}

export interface RenderFormulaOptions {
  /**
   * LaTeX to emit for a term. Default: the term's own `latex`. The presentation layer uses
   * this to wrap terms for highlighting (`\htmlClass{...}{...}`) or to substitute the
   * numbers of one cell.
   */
  readonly term?: (term: FormulaTerm) => string;
}

/** Replaces the placeholders of a formula template and returns plain LaTeX. */
export function renderFormula(formula: TraceFormula, options: RenderFormulaOptions = {}): string {
  const terms = new Map(formula.terms.map((term) => [term.name, term]));
  return formula.template.replace(PLACEHOLDER, (_match, name: string) => {
    const term = terms.get(name);
    if (term === undefined) {
      throw new EngineError(
        'INVALID_TRACE',
        `Formula "${formula.id}" uses the undefined term "${name}".`,
        { formula: formula.id, term: name },
      );
    }
    return options.term === undefined ? term.latex : options.term(term);
  });
}

/** Problems of a formula definition, as human-readable sentences. Empty when it is valid. */
export function formulaProblems(formula: TraceFormula): string[] {
  const problems: string[] = [];
  const defined = new Set<string>();
  for (const term of formula.terms) {
    if (defined.has(term.name)) problems.push(`term "${term.name}" is defined twice`);
    defined.add(term.name);
  }
  for (const name of formulaTermNames(formula.template)) {
    if (!defined.has(name)) problems.push(`placeholder "{{${name}}}" has no term definition`);
  }
  return problems;
}

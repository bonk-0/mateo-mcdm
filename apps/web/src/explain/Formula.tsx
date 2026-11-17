import type { FormulaTerm } from '@mateo/engine';
import { latexText } from '@mateo/explain';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import { useEffect, useMemo, useRef } from 'react';

/** Only the command that marks terms and numbers may add attributes to the output. */
const TRUSTED_COMMANDS = new Set([String.raw`\htmlData`]);

/** Marks a formula term so that it can be coloured and highlighted: `data-term`, `data-tone`. */
export function markTerm(tones: ReadonlyMap<string, number>) {
  return (term: FormulaTerm, latex: string): string => {
    const tone = tones.get(term.name);
    const data = tone === undefined ? `term=${term.name}` : `term=${term.name}, tone=${tone}`;
    return String.raw`\htmlData{${data}}{${latex}}`;
  };
}

/**
 * LaTeX of one number: the text the user's number format gives, marked with the exact
 * value (`data-value`) so that tests can trace every shown number back to the engine.
 */
export function markNumber(format: (value: number) => string) {
  return (value: number): string =>
    String.raw`\htmlData{value=${String(value)}}{${latexText(format(value))}}`;
}

export interface FormulaProps {
  readonly latex: string;
  /** Centered on its own line instead of inline. */
  readonly display?: boolean;
  /** Term to highlight. */
  readonly activeTerm?: string | null;
  /** Called with the term under the pointer, and with `null` when it leaves. */
  readonly onTerm?: (term: string | null) => void;
  readonly className?: string;
}

/**
 * A formula rendered with KaTeX. Formulas use the notation of the source paper in every
 * language, so the output is never translated. Screen readers get the MathML KaTeX emits.
 */
export function Formula({ latex, display = false, activeTerm, onTerm, className }: FormulaProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const html = useMemo(
    () =>
      katex.renderToString(latex, {
        displayMode: display,
        throwOnError: false,
        strict: 'ignore',
        output: 'htmlAndMathml',
        trust: (context) => TRUSTED_COMMANDS.has(context.command),
      }),
    [latex, display],
  );

  useEffect(() => {
    for (const element of ref.current?.querySelectorAll<HTMLElement>('[data-term]') ?? []) {
      element.toggleAttribute('data-active', element.dataset['term'] === activeTerm);
    }
  }, [html, activeTerm]);

  const termAt = (target: EventTarget | null): string | null =>
    target instanceof Element
      ? (target.closest<HTMLElement>('[data-term]')?.dataset['term'] ?? null)
      : null;

  return (
    <span
      ref={ref}
      translate="no"
      className={`ex-formula ${display ? 'block overflow-x-auto py-1' : ''} ${className ?? ''}`}
      onMouseOver={onTerm ? (event) => onTerm(termAt(event.target)) : undefined}
      onMouseLeave={onTerm ? () => onTerm(null) : undefined}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

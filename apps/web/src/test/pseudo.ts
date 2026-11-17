import type { PostProcessorModule } from 'i18next';

export const PSEUDO_OPEN = '⟦';
export const PSEUDO_CLOSE = '⟧';

/** Wraps every translated string in markers, so text that bypassed i18n stands out. */
export const pseudoProcessor: PostProcessorModule = {
  type: 'postProcessor',
  name: 'pseudo',
  process: (value: string) => `${PSEUDO_OPEN}${value}${PSEUDO_CLOSE}`,
};

const ATTRIBUTES = ['aria-label', 'title', 'placeholder', 'alt', 'aria-description'];

/** Text that is data rather than prose: numbers, dates, separators and symbols. */
const DATA_ONLY = /^[\d\s.,:;'’%+\-−·/()]*$/u;

function exempt(element: Element | null): boolean {
  return Boolean(element?.closest('[aria-hidden="true"], [translate="no"], script, style'));
}

/**
 * Lists every piece of user-visible text under `root` (text nodes and accessible
 * attributes) that did not come through i18n.
 */
export function findUntranslated(root: Element): string[] {
  const problems: string[] = [];
  const isTranslated = (text: string) => {
    // A translation can contain another one (a step name inside a sentence): peel the
    // markers from the inside out.
    let peeled = text;
    for (let previous = ''; previous !== peeled;) {
      previous = peeled;
      peeled = peeled.replace(/⟦[^⟦⟧]*⟧/gu, '');
    }
    const stripped = peeled
      // Keyboard hints that libraries append to labels, for example "alt+T".
      .replace(/\b(alt|ctrl|shift|meta)\+\w\b/giu, '');
    return DATA_ONLY.test(stripped);
  };

  const walker = root.ownerDocument.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const text = node.textContent ?? '';
    if (text.trim() === '' || exempt(node.parentElement)) continue;
    // A translation may be split over sibling nodes; judge the parent's text as a whole.
    const whole = node.parentElement?.textContent ?? text;
    if (!isTranslated(whole) && !isTranslated(text)) problems.push(`text: ${text.trim()}`);
  }
  for (const element of root.querySelectorAll('*')) {
    if (exempt(element)) continue;
    for (const attribute of ATTRIBUTES) {
      const value = element.getAttribute(attribute);
      if (value && !isTranslated(value)) problems.push(`${attribute}: ${value}`);
    }
  }
  return [...new Set(problems)];
}

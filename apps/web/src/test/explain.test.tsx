import type { DecisionMatrix, Trace } from '@mateo/engine';
import { crispWeights, runMethod, textLiteral } from '@mateo/engine';
import { traceNumbers } from '@mateo/explain';
import { formatNumber } from '@mateo/i18n';
import {
  criticMethod,
  fuzzyMarcosMethod,
  fuzzySwaraMethod,
  marcosMethod,
  merecMethod,
  swaraMethod,
} from '@mateo/methods';
import { TooltipProvider } from '@mateo/ui';
import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { I18nextProvider } from 'react-i18next';
import { beforeEach, describe, expect, it } from 'vitest';
import { ExplainPanel, explanationOf } from '../explain/ExplainPanel';
import { createAppI18n } from '../i18n/setup';
import { useSettings } from '../settings/store';
import { TraceTables } from '../workspace/TraceTables';
import { findUntranslated, pseudoProcessor } from './pseudo';

/** Four phones on price (cost), memory and camera (benefit). */
const PHONES = [
  [250, 16, 12],
  [200, 16, 8],
  [300, 32, 16],
  [275, 32, 8],
];

function matrixOf<T>(values: readonly (readonly T[])[], numberType: string): DecisionMatrix<T> {
  return {
    alternatives: values.map((_, i) => ({ id: `a${i + 1}`, name: textLiteral(`Phone ${i + 1}`) })),
    criteria: values[0]!.map((_, j) => ({
      id: `c${j + 1}`,
      name: textLiteral(`C${j + 1}`),
      direction: j === 0 ? ('cost' as const) : ('benefit' as const),
      numberType,
    })),
    values: values.map((row) => [...row]),
  };
}

const weights = (count: number) =>
  crispWeights(
    Array.from({ length: count }, (_, j) => `c${j + 1}`),
    Array.from({ length: count }, () => 1 / count),
  );

const marcosTrace = () =>
  runMethod(marcosMethod, { matrix: matrixOf(PHONES, 'crisp'), weights: weights(3) }).trace;

const fuzzyTrace = () =>
  runMethod(fuzzyMarcosMethod, {
    matrix: matrixOf(
      PHONES.map((row) => row.map((x) => ({ l: x * 0.9, m: x, u: x * 1.1 }))),
      'tfn',
    ),
    weights: weights(3),
  }).trace;

const ordered = ['c1', 'c2', 'c3', 'c4'].map((id) => ({ id, name: textLiteral(id.toUpperCase()) }));
const criticTrace = () => runMethod(criticMethod, { matrix: matrixOf(PHONES, 'crisp') }).trace;
const merecTrace = () => runMethod(merecMethod, { matrix: matrixOf(PHONES, 'crisp') }).trace;
const swaraTrace = () =>
  runMethod(swaraMethod, { criteria: ordered, comparativeImportance: [null, 0.3, 0.2, 0.1] }).trace;
const fuzzySwaraTrace = () =>
  runMethod(fuzzySwaraMethod, {
    criteria: ordered,
    assessments: [null, 'WLS', 'ES', 'WLS'],
  }).trace;

function largeTrace(): Trace {
  const values = Array.from({ length: 20 }, (_, i) =>
    Array.from({ length: 12 }, (_, j) => 10 + ((i * 7 + j * 13 + i * j) % 29)),
  );
  return runMethod(marcosMethod, { matrix: matrixOf(values, 'crisp'), weights: weights(12) }).trace;
}

function renderWith(children: ReactNode, i18n = createAppI18n('en')) {
  return render(
    <I18nextProvider i18n={i18n}>
      <TooltipProvider>{children}</TooltipProvider>
    </I18nextProvider>,
  );
}

function renderPanel(trace: Trace, i18n = createAppI18n('en'), followResult = false) {
  const explanation = explanationOf(trace);
  if (!explanation) throw new Error('the method has no lesson');
  return {
    explanation,
    ...renderWith(
      <ExplainPanel trace={trace} explanation={explanation} followResult={followResult} />,
      i18n,
    ),
  };
}

const lesson = () => screen.getByTestId('lesson');
const at = () => `${lesson().getAttribute('data-step')}/${lesson().getAttribute('data-part')}`;
const next = () => screen.queryByTestId('lesson-next');
/** The table cell of a cell button, which carries its marks. */
const cell = (id: string) => screen.getByTestId(`cell-${id}`).closest('td')!;

/**
 * Every number on screen: the elements that carry an exact value, plus any text that looks
 * like a decimal number but is not marked as one (there must be none).
 */
function shownNumbers(root: HTMLElement) {
  const marked = [...root.querySelectorAll<HTMLElement>('[data-value]')].map((element) => ({
    value: Number(element.dataset['value']),
    text: element.textContent,
  }));
  const unmarked: string[] = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const text = node.textContent ?? '';
    if (!/\d[.,]\d/u.test(text)) continue;
    // KaTeX repeats the formula as MathML for screen readers; the visible copy is marked.
    if (node.parentElement?.closest('[data-value], .katex-mathml')) continue;
    unmarked.push(text);
  }
  return { marked, unmarked };
}

beforeEach(() => {
  useSettings.getState().update({ motion: 'reduce' });
});

describe.each([
  ['MARCOS', marcosTrace, 300],
  ['Fuzzy MARCOS', fuzzyTrace, 300],
  ['CRITIC', criticTrace, 50],
  ['MEREC', merecTrace, 50],
  ['SWARA', swaraTrace, 20],
  ['Fuzzy SWARA', fuzzySwaraTrace, 20],
])('every number shown in the %s lesson', (_name, traceOf, least) => {
  it('equals a value of the engine trace, in every step and part, formulas included', async () => {
    const user = userEvent.setup();
    const trace = traceOf();
    const known = traceNumbers(trace);
    const { explanation } = renderPanel(trace);
    const format = (value: number) => formatNumber(value, 'en-US', { fractionDigits: 4 });
    let checked = 0;
    const check = () => {
      const { marked, unmarked } = shownNumbers(document.body);
      expect(unmarked).toEqual([]);
      for (const { value, text } of marked) {
        expect(known.has(value)).toBe(true);
        expect([format(value), formatNumber(value, 'en-US', { fractionDigits: 0 })]).toContain(
          text,
        );
        checked += 1;
      }
    };

    const expected = explanation.lesson.steps.flatMap((step) =>
      step.parts.length === 0 ? [`${step.id}/`] : step.parts.map((part) => `${step.id}/${part}`),
    );
    const visited: string[] = [];
    for (;;) {
      visited.push(at());
      const total = explanation.lesson.steps.length;
      const index = explanation.lesson.steps.findIndex(
        (step) => step.id === lesson().dataset['step'],
      );
      expect(screen.getByTestId('lesson-progress').textContent).toMatch(
        new RegExp(`^Step ${index + 1} of ${total} · `, 'u'),
      );
      // Every step says what it does and why.
      expect(screen.getByTestId('lesson-idea').textContent).not.toBe('');
      expect(screen.getByTestId('lesson-why').textContent).not.toBe('');
      check();
      const toggle = screen.queryByTestId('lesson-formula-toggle');
      if (toggle) {
        await user.click(toggle);
        check();
        await user.click(toggle);
      }
      const button = next();
      if (!button) break;
      await user.click(button);
    }
    expect(visited).toEqual(expected);
    expect(checked).toBeGreaterThan(least);
  });
});

describe('fuzzy cells in a lesson', () => {
  it('are drawn with the TFN component, which shows no numbers of its own', () => {
    renderPanel(fuzzyTrace());
    // The first step of Fuzzy MARCOS shows the initial matrix of TFN cells.
    const glyphs = screen.getAllByTestId('tfn-glyph');
    expect(glyphs.length).toBeGreaterThanOrEqual(12);
    for (const glyph of glyphs) expect(glyph.textContent).toBe('');
  });
});

/** Text that bypassed i18n, apart from the names the user gave to alternatives and criteria. */
const untranslated = () =>
  findUntranslated(document.body).filter((problem) => !/^text: (Phone \d+|C\d+)$/u.test(problem));

const go = async (user: ReturnType<typeof userEvent.setup>, stepId: string) => {
  const { lesson: plan } = explanationOf(marcosTrace())!;
  await user.click(
    screen.getByTestId(`lesson-marker-${plan.steps.findIndex((step) => step.id === stepId)}`),
  );
};

describe('a method lesson', () => {
  it('walks through the steps and their parts with Next, Back and the arrow keys', async () => {
    const user = userEvent.setup();
    renderPanel(marcosTrace());
    expect(at()).toBe('decision/');
    expect(screen.getByTestId('lesson-back')).toHaveProperty('disabled', true);
    expect(screen.getByTestId('lesson-marker-0').getAttribute('aria-current')).toBe('step');

    await user.click(next()!);
    expect(at()).toBe('reference/extended-matrix');
    await user.click(screen.getByTestId('lesson-back'));
    expect(at()).toBe('decision/');

    // The arrow keys move on, except inside a table, where they move between cells.
    act(() => lesson().focus());
    await user.keyboard('{ArrowRight}{ArrowRight}');
    expect(at()).toBe('normalize/normalized-matrix');
    await user.keyboard('{ArrowLeft}');
    expect(at()).toBe('reference/extended-matrix');
    screen.getByTestId('cell-extended-matrix-a1-c1').focus();
    await user.keyboard('{ArrowRight}');
    expect(at()).toBe('reference/extended-matrix');
    expect(document.activeElement).toBe(screen.getByTestId('cell-extended-matrix-a1-c2'));

    // A step with two formulas has two parts: Next goes through both, then on.
    await go(user, 'weigh');
    expect(at()).toBe('weigh/weighted-matrix');
    expect(screen.getByTestId('lesson-part-weighted-matrix').getAttribute('aria-pressed')).toBe(
      'true',
    );
    expect(screen.queryByTestId('output-sums')).toBeNull();
    await user.click(next()!);
    expect(at()).toBe('weigh/sums');
    // The tables of the earlier parts stay on screen.
    expect(screen.getByTestId('output-weighted-matrix')).toBeTruthy();
    expect(screen.getByTestId('output-sums')).toBeTruthy();
    await user.click(screen.getByTestId('lesson-part-weighted-matrix'));
    expect(at()).toBe('weigh/weighted-matrix');
    await user.click(screen.getByTestId('lesson-back'));
    expect(at()).toBe('normalize/normalized-matrix');

    // The last step offers what comes after the lesson instead of Next.
    await go(user, 'ranking');
    expect(next()).toBeNull();
  });

  it('shows the tables a step reads and the tables it produces', async () => {
    const user = userEvent.setup();
    renderPanel(marcosTrace());
    await go(user, 'normalize');
    expect(screen.getByTestId('source-extended-matrix').textContent).toContain(
      'Calculated from: Extended matrix',
    );
    expect(screen.getByTestId('output-normalized-matrix')).toBeTruthy();
    expect(screen.queryByTestId('output-initial-matrix')).toBeNull();
  });

  it('explains one cell in words, in numbers and in what it means', async () => {
    const user = userEvent.setup();
    renderPanel(marcosTrace());
    await go(user, 'normalize');
    // The example is the first alternative on the first criterion, a cost criterion.
    expect(screen.getByTestId('lesson-cell').textContent).toBe('Phone 1, C1');
    expect(screen.getByTestId('lesson-how').textContent).toBe(
      'C1 is a cost criterion, so the division is turned around: the best (smallest) value is divided by the value of Phone 1.',
    );
    const value = screen.getByTestId('lesson-meaning').querySelector<HTMLElement>('[data-value]')!;
    expect(Number(value.dataset['value'])).toBe(200 / 250);
    const numbers = [
      ...screen.getByTestId('lesson-substitution').querySelectorAll<HTMLElement>('[data-value]'),
    ].map((element) => Number(element.dataset['value']));
    // KaTeX lays out a fraction's denominator before its numerator.
    expect(numbers).toEqual([200 / 250, 250, 200]);

    // The cells behind the formula are marked in the source table, by term colour.
    const x = cell('extended-matrix-a1-c1');
    const ideal = cell('extended-matrix-AI-c1');
    expect(x.dataset['tone']).not.toBeUndefined();
    expect(ideal.dataset['tone']).not.toBeUndefined();
    expect(x.dataset['tone']).not.toBe(ideal.dataset['tone']);
    expect(cell('normalized-matrix-a1-c1').hasAttribute('data-selected')).toBe(true);

    // Any cell of the tables can be explained.
    await user.click(screen.getByTestId('cell-normalized-matrix-a3-c2'));
    expect(screen.getByTestId('lesson-cell').textContent).toBe('Phone 3, C2');
    expect(screen.getByTestId('lesson-how').textContent).toMatch(/benefit criterion/u);
    expect(
      [
        ...screen.getByTestId('lesson-substitution').querySelectorAll<HTMLElement>('[data-value]'),
      ].map((element) => Number(element.dataset['value'])),
    ).toEqual([1, 32, 32]);
    // Moving on goes back to the example of the next step.
    await user.click(next()!);
    expect(screen.getByTestId('lesson-cell').textContent).toBe('Phone 1, C1');
  });

  it('says where a value comes from when nothing was calculated', async () => {
    const user = userEvent.setup();
    renderPanel(marcosTrace());
    expect(screen.getByTestId('lesson-no-formula').textContent).toMatch(
      /^Phone 1, C1 is part of the data you entered/u,
    );
    await go(user, 'reference');
    await user.click(screen.getByTestId('cell-extended-matrix-a2-c1'));
    expect(screen.getByTestId('lesson-no-formula').textContent).toBe(
      'Phone 2, C1 is copied unchanged from Initial decision matrix.',
    );
  });

  it('shows the formula with its symbols on request, linked to the cells', async () => {
    const user = userEvent.setup();
    renderPanel(marcosTrace());
    await go(user, 'normalize');
    await user.click(screen.getByTestId('cell-normalized-matrix-a1-c2'));
    expect(screen.queryByTestId('lesson-formula')).toBeNull();
    const toggle = screen.getByTestId('lesson-formula-toggle');
    expect(toggle.textContent).toBe('Show the formula');
    await user.click(toggle);
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    const formula = screen.getByTestId('lesson-formula');
    expect(formula.textContent).toContain('for benefit criteria');
    expect(within(formula).getByTestId('term-x_ai').textContent).toContain('32');

    // Pointing at a term lights up its cell in the tables.
    const ideal = cell('extended-matrix-AI-c2');
    expect(ideal.hasAttribute('data-active')).toBe(false);
    const termIn = (name: string) => formula.querySelector<HTMLElement>(`[data-term="${name}"]`)!;
    await user.hover(termIn('x_ai'));
    expect(ideal.hasAttribute('data-active')).toBe(true);
    // And pointing at the cell lights up its term.
    await user.unhover(termIn('x_ai'));
    await user.hover(cell('extended-matrix-a1-c2'));
    expect(termIn('x').hasAttribute('data-active')).toBe(true);

    // Every operand of the cell, as in the results view.
    await user.click(screen.getByTestId('lesson-derivation'));
    const dialog = await screen.findByRole('dialog', { name: 'How was this calculated?' });
    expect(within(dialog).getByTestId('derivation-value').textContent).toBe('0.5000');
    await user.keyboard('{Escape}');
    await user.click(toggle);
    expect(screen.queryByTestId('lesson-formula')).toBeNull();
  });

  it('shows only the rows and columns in use of a large matrix', async () => {
    const user = userEvent.setup();
    renderPanel(largeTrace());
    await go(user, 'normalize');
    const output = () => screen.getByTestId('output-normalized-matrix');
    // At most 12 rows and 10 columns, plus the header row.
    // 12 rows in view and the two reference rows, plus the header row.
    expect(within(output()).getAllByRole('row')).toHaveLength(15);
    expect(within(output()).queryByRole('rowheader', { name: 'Phone 19' })).toBeNull();
    // A cell outside the view, picked in the source table, brings its row and column in.
    await user.click(screen.getByTestId('lesson-whole-tables'));
    expect(within(output()).getAllByRole('row')).toHaveLength(23);
    await user.click(screen.getByTestId('cell-normalized-matrix-a19-c12'));
    await user.click(screen.getByTestId('lesson-whole-tables'));
    expect(within(output()).getByRole('rowheader', { name: 'Phone 19' })).toBeTruthy();
    expect(within(output()).getByRole('columnheader', { name: 'C12' })).toBeTruthy();
    expect(screen.getByTestId('lesson-cell').textContent).toBe('Phone 19, C12');
  });

  it('follows the winner and the heaviest criterion on a result', async () => {
    const user = userEvent.setup();
    const run = runMethod(marcosMethod, {
      matrix: matrixOf(PHONES, 'crisp'),
      weights: crispWeights(['c1', 'c2', 'c3'], [0.2, 0.5, 0.3]),
    });
    renderPanel(run.trace, createAppI18n('en'), true);
    const winner = [...run.result.ranking].sort((a, b) => a.rank - b.rank)[0]!.alternativeId;
    await go(user, 'normalize');
    expect(screen.getByTestId('lesson-cell').textContent).toBe(`Phone ${winner.slice(1)}, C2`);
  });

  it('tells the story of the ranking with values of the trace', async () => {
    const user = userEvent.setup();
    const run = runMethod(marcosMethod, { matrix: matrixOf(PHONES, 'crisp'), weights: weights(3) });
    renderPanel(run.trace);
    await go(user, 'ranking');
    const best = [...run.result.ranking].sort((a, b) => a.rank - b.rank);
    const nameOf = (id: string) => `Phone ${id.slice(1)}`;
    const winner = screen.getByTestId('story-winner');
    expect(winner.textContent).toContain(`${nameOf(best[0]!.alternativeId)} ranks first.`);
    const score = within(winner).getAllByRole('button')[0]!;
    expect(Number(score.querySelector<HTMLElement>('[data-value]')!.dataset['value'])).toBe(
      best[0]!.score,
    );
    expect(screen.getByTestId('story-runner-up').textContent).toContain(
      `${nameOf(best[1]!.alternativeId)} comes next.`,
    );
    expect(within(screen.getByTestId('story-drivers')).getAllByRole('row')).toHaveLength(4);

    await user.click(score);
    const dialog = await screen.findByRole('dialog', { name: 'How was this calculated?' });
    expect(dialog.textContent).toContain('Final utility f(K_i)');
  });

  it('moves in only when motion is allowed', async () => {
    const user = userEvent.setup();
    renderPanel(marcosTrace());
    expect(document.querySelector('.lesson-enter')).toBeNull();
    act(() => useSettings.getState().update({ motion: 'full' }));
    await user.click(next()!);
    expect(document.querySelector('.lesson-enter')).not.toBeNull();
  });

  it('is fully translated', async () => {
    const user = userEvent.setup();
    const i18n = createAppI18n('en', {
      plugins: [pseudoProcessor],
      options: { postProcess: ['pseudo'] },
    });
    renderPanel(marcosTrace(), i18n);
    for (;;) {
      expect(untranslated()).toEqual([]);
      const toggle = screen.queryByTestId('lesson-formula-toggle');
      if (toggle) {
        await user.click(toggle);
        expect(untranslated()).toEqual([]);
      }
      const button = next();
      if (!button) break;
      await user.click(button);
    }
  });

  it('speaks Turkish', async () => {
    const user = userEvent.setup();
    renderPanel(marcosTrace(), createAppI18n('tr'));
    await go(user, 'normalize');
    expect(screen.getByTestId('lesson-progress').textContent).toMatch(/^Adım 3 \/ 7 · /u);
    expect(screen.getByTestId('lesson-how').textContent).toMatch(/maliyet kriteri/u);
    expect(screen.getByTestId('lesson-next').textContent).toBe('Devam');
  });

  it('has no lesson for methods without a sequence', () => {
    const trace = marcosTrace();
    expect(explanationOf({ ...trace, methodId: 'topsis' })).toBeNull();
    // A trace from a method version with other steps has no lesson either.
    expect(explanationOf({ ...trace, steps: trace.steps.slice(0, 4) })).toBeNull();
  });
});

describe('"How was this calculated?" in the results view', () => {
  it('opens the derivation of any cell and follows its operands', async () => {
    const user = userEvent.setup();
    const trace = marcosTrace();
    const known = traceNumbers(trace);
    renderWith(<TraceTables trace={trace} />);

    await user.click(screen.getByTestId('cell-normalized-matrix-a1-c2'));
    const dialog = await screen.findByRole('dialog', { name: 'How was this calculated?' });
    expect(dialog.textContent).toContain('Normalized matrix · Phone 1, C2');
    expect(within(dialog).getByTestId('derivation-value').textContent).toBe('0.5000');
    expect(dialog.textContent).toContain('for benefit criteria');
    expect(dialog.textContent).toContain('Division');
    for (const element of dialog.querySelectorAll<HTMLElement>('[data-value]')) {
      expect(known.has(Number(element.dataset['value']))).toBe(true);
    }

    // Follow the ideal value to its own derivation, and come back.
    await user.click(
      within(dialog).getByRole('button', { name: 'Extended matrix · Ideal solution (AI), C2' }),
    );
    expect(dialog.textContent).toContain('Largest value');
    expect(dialog.textContent).toContain('4 values from Initial decision matrix');
    expect(within(dialog).getByTestId('derivation-value').textContent).toBe('32.0000');
    await user.click(within(dialog).getByRole('button', { name: 'Back' }));
    expect(within(dialog).getByTestId('derivation-value').textContent).toBe('0.5000');

    // Escape closes it and gives the focus back to the cell.
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.activeElement).toBe(screen.getByTestId('cell-normalized-matrix-a1-c2'));
  });

  it('explains entered, carried-over and ranked cells', async () => {
    const user = userEvent.setup();
    renderWith(<TraceTables trace={marcosTrace()} />);
    const open = async (id: string) => {
      await user.click(screen.getByTestId(id));
      return screen.findByRole('dialog');
    };
    expect((await open('cell-initial-matrix-a1-c1')).textContent).toContain(
      'Entered as input. Nothing was calculated.',
    );
    await user.keyboard('{Escape}');
    expect((await open('cell-extended-matrix-a1-c1')).textContent).toContain(
      'Carried over unchanged from:',
    );
    await user.keyboard('{Escape}');
    const rank = await open('cell-ranking-a1-rank');
    expect(rank.textContent).toContain('Rank among all values');
    await user.click(within(rank).getByRole('button', { name: 'Close' }));
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('moves between the cells of a table with the arrow keys', async () => {
    const user = userEvent.setup();
    renderWith(<TraceTables trace={marcosTrace()} />);
    const cell = (id: string) => screen.getByTestId(`cell-sums-${id}-S`);
    expect(cell('AAI').tabIndex).toBe(0);
    expect(cell('a1').tabIndex).toBe(-1);
    cell('AAI').focus();
    await user.keyboard('{ArrowDown}{ArrowDown}');
    expect(document.activeElement).toBe(cell('a2'));
    expect(cell('a2').tabIndex).toBe(0);
    await user.keyboard('{ArrowUp}{ArrowLeft}');
    expect(document.activeElement).toBe(cell('a1'));
    const first = screen.getByTestId('cell-weighted-matrix-a1-c1');
    first.focus();
    await user.keyboard('{End}');
    expect(document.activeElement).toBe(screen.getByTestId('cell-weighted-matrix-a1-c3'));
    await user.keyboard('{Control>}{Home}{/Control}');
    expect(document.activeElement).toBe(screen.getByTestId('cell-weighted-matrix-AAI-c1'));
    await user.keyboard('{Enter}');
    expect(await screen.findByRole('dialog')).toBeTruthy();
  });
});

describe('the texts of the lessons', () => {
  it.each(['en', 'tr'] as const)(
    'exist in %s for every step of every lesson and every formula it explains',
    (language) => {
      const i18n = createAppI18n(language);
      const missing: string[] = [];
      for (const trace of [
        marcosTrace(),
        fuzzyTrace(),
        criticTrace(),
        merecTrace(),
        swaraTrace(),
        fuzzySwaraTrace(),
      ]) {
        const { lesson: plan } = explanationOf(trace)!;
        const base = `explain:lessons.${plan.textKey}`;
        for (const step of plan.steps) {
          for (const field of ['title', 'idea', 'why']) {
            const key = `${base}.steps.${step.id}.${field}`;
            if (!i18n.exists(key)) missing.push(key);
          }
          for (const stepId of step.parts) {
            for (const formula of trace.steps.find((entry) => entry.id === stepId)!.formulas) {
              for (const field of ['how', 'meaning']) {
                const key = `${base}.formulas.${stepId}.${formula.id}.${field}`;
                if (!i18n.exists(key)) missing.push(key);
              }
            }
          }
        }
      }
      expect(missing).toEqual([]);
    },
  );
});

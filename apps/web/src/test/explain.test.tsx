import type { DecisionMatrix, Trace } from '@mateo/engine';
import { crispWeights, runMethod, textLiteral } from '@mateo/engine';
import { traceNumbers } from '@mateo/explain';
import { formatNumber } from '@mateo/i18n';
import { fuzzyMarcosMethod, marcosMethod } from '@mateo/methods';
import { TooltipProvider } from '@mateo/ui';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
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

function renderPanel(trace: Trace, i18n = createAppI18n('en')) {
  const explanation = explanationOf(trace);
  if (!explanation) throw new Error('the method has no explain sequence');
  return {
    explanation,
    ...renderWith(<ExplainPanel trace={trace} explanation={explanation} />, i18n),
  };
}

const player = () => screen.getByTestId('explain-player');
const sceneId = () => player().getAttribute('data-scene');

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
    // Playback speeds are a setting of the player, not a number of the method.
    if (node.parentElement?.closest('[data-testid="explain-speed"]')) continue;
    unmarked.push(text);
  }
  return { marked, unmarked };
}

beforeEach(() => {
  // Static steps: every scene is shown complete, so every number of a scene is on screen.
  useSettings.getState().update({ motion: 'reduce' });
});

describe.each([
  ['MARCOS', marcosTrace],
  ['Fuzzy MARCOS', fuzzyTrace],
])('every number shown in the %s timeline', (_name, traceOf) => {
  it('equals a value of the engine trace, in every scene and in the story', async () => {
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

    const visited: (string | null)[] = [];
    for (let i = 0; i < explanation.timeline.scenes.length; i += 1) {
      visited.push(sceneId());
      expect(screen.getByTestId('explain-scene').textContent).toBe(
        `Scene ${i + 1} of ${explanation.timeline.scenes.length}`,
      );
      check();
      await user.click(screen.getByTestId('explain-next'));
    }
    expect(visited).toEqual(explanation.timeline.scenes.map((scene) => scene.id));

    await user.click(screen.getByTestId('explain-tab-story'));
    expect(screen.getByTestId('explain-story')).toBeTruthy();
    check();
    expect(checked).toBeGreaterThan(500);
  });
});

/** Text that bypassed i18n, apart from the names the user gave to alternatives and criteria. */
const untranslated = () =>
  findUntranslated(document.body).filter((problem) => !/^text: (Phone \d+|C\d+)$/u.test(problem));

describe('the Explain player', () => {
  it('shows static, complete steps with reduced motion', async () => {
    const user = userEvent.setup();
    renderPanel(marcosTrace());
    expect(player().getAttribute('data-animated')).toBe('false');
    expect(screen.queryByTestId('explain-play')).toBeNull();
    expect(screen.getByTestId('toggle-animations')).toHaveProperty('disabled', true);
    expect(screen.getByText(/Reduced motion is on/u)).toBeTruthy();

    await user.click(screen.getByTestId('explain-step-normalized-matrix'));
    await user.click(screen.getByTestId('explain-next'));
    await user.click(screen.getByTestId('explain-next'));
    expect(sceneId()).toBe('normalized-matrix');
    const output = screen.getByTestId('output-normalized-matrix');
    const cells = [...output.querySelectorAll<HTMLElement>('[data-value]')];
    expect(cells).toHaveLength(6 * 3);
    // Nothing is hidden and nothing flies.
    expect(cells.every((cell) => cell.parentElement!.style.opacity === '')).toBe(true);
    expect(document.querySelector('.ex-ghost')).toBeNull();
  });

  it('is fully operable from the keyboard', async () => {
    const user = userEvent.setup();
    const { explanation } = renderPanel(marcosTrace());
    const last = explanation.timeline.scenes.length - 1;
    const scenes = explanation.timeline.scenes;

    // Shortcuts work from the scrub bar, the buttons and the player itself.
    const scrubber = screen.getByTestId('explain-scrubber');
    scrubber.focus();
    await user.keyboard('{ArrowRight}');
    expect(sceneId()).toBe(scenes[1]!.id);
    await user.keyboard('{End}');
    expect(sceneId()).toBe(scenes[last]!.id);
    expect(screen.getByTestId('explain-next')).toHaveProperty('disabled', true);
    await user.keyboard('{Home}');
    expect(sceneId()).toBe(scenes[0]!.id);
    expect(scrubber.getAttribute('aria-valuetext')).toBe(
      `Scene 1 of ${scenes.length}: Initial decision matrix`,
    );

    screen.getByTestId('explain-previous').focus();
    await user.keyboard('{ArrowRight}{ArrowRight}{ArrowLeft}');
    expect(sceneId()).toBe(scenes[1]!.id);
    // Enter and Space press the focused button.
    screen.getByTestId('explain-next').focus();
    await user.keyboard('{Enter}');
    await user.keyboard(' ');
    expect(sceneId()).toBe(scenes[3]!.id);

    // Every control is reachable with Tab: steps, example, terms, transport, toggles.
    const focusable = [
      ...player().querySelectorAll<HTMLElement>('button, select, input, [tabindex="0"]'),
    ].filter((element) => !element.hasAttribute('disabled') && element.tabIndex >= 0);
    for (const id of [
      'explain-step-ranking',
      'example-column',
      'explain-derivation',
      'explain-scrubber',
      'explain-first',
      'explain-previous',
      'explain-next',
      'explain-last',
      'toggle-explanation',
      'toggle-formula',
      'toggle-substitution',
    ]) {
      expect(focusable).toContain(screen.getByTestId(id));
    }

    // Jump to a step with the keyboard.
    screen.getByTestId('explain-step-sums').focus();
    await user.keyboard('{Enter}');
    expect(sceneId()).toBe('sums/sum');
    expect(screen.getByTestId('explain-step-sums').getAttribute('aria-current')).toBe('step');
    expect(screen.getByTestId('explain-step-name').textContent).toBe('Sums S_i');

    // A field keeps its own arrow keys.
    const row = screen.getByTestId('example-row');
    row.focus();
    await user.keyboard('{ArrowRight}');
    expect(sceneId()).toBe('sums/sum');
  });

  it('seeks with the scrub bar', () => {
    const { explanation } = renderPanel(marcosTrace());
    const scrubber = screen.getByTestId('explain-scrubber');
    fireEvent.change(scrubber, { target: { value: '5.4' } });
    expect(sceneId()).toBe(explanation.timeline.scenes[5]!.id);
    expect(scrubber).toHaveProperty('value', '6');
  });

  it('shows and hides the explanation, the formula and its numbers', async () => {
    const user = userEvent.setup();
    renderPanel(marcosTrace());
    await user.click(screen.getByTestId('explain-step-weighted-matrix'));
    expect(screen.getByTestId('explain-text').textContent).toMatch(/multiplied by the weight/u);
    expect(screen.getByTestId('explain-substitution')).toBeTruthy();

    await user.click(screen.getByTestId('toggle-substitution'));
    expect(screen.queryByTestId('explain-substitution')).toBeNull();
    expect(screen.getByTestId('explain-formula')).toBeTruthy();
    await user.click(screen.getByTestId('toggle-formula'));
    expect(screen.queryByTestId('explain-formula')).toBeNull();
    await user.click(screen.getByTestId('toggle-explanation'));
    expect(screen.queryByTestId('explain-text')).toBeNull();
    // Asking for the numbers brings the formula back.
    await user.click(screen.getByTestId('toggle-substitution'));
    expect(screen.getByTestId('explain-substitution')).toBeTruthy();
    expect(screen.getByTestId('toggle-formula').getAttribute('aria-pressed')).toBe('true');
  });

  it('links formula terms and matrix cells in both directions', async () => {
    const user = userEvent.setup();
    renderPanel(marcosTrace());
    await user.click(screen.getByTestId('explain-step-normalized-matrix'));
    // Benefit formula on its example: Phone 1, C2 = x / x_ai.
    expect(sceneId()).toBe('normalized-matrix/benefit');
    const source = screen.getByTestId('source-extended-matrix');
    const cellOf = (table: HTMLElement, row: string, column: number) =>
      within(within(table).getByRole('row', { name: new RegExp(`^${row}`, 'u') })).getAllByRole(
        'cell',
      )[column]!;
    const x = cellOf(source, 'Phone 1', 1);
    const ideal = cellOf(source, 'Ideal solution', 1);
    expect(x.dataset['tone']).toBe('1');
    expect(ideal.dataset['tone']).toBe('2');
    expect(x.hasAttribute('data-active')).toBe(false);

    // Term → cells, by keyboard focus and by pointer.
    act(() => screen.getByTestId('term-x_ai').focus());
    expect(ideal.hasAttribute('data-active')).toBe(true);
    expect(x.hasAttribute('data-active')).toBe(false);
    const formula = screen.getByTestId('explain-formula');
    const termIn = (name: string) => formula.querySelector<HTMLElement>(`[data-term="${name}"]`)!;
    expect(termIn('x_ai').hasAttribute('data-active')).toBe(true);
    act(() => screen.getByTestId('term-x_ai').blur());
    await user.hover(termIn('x'));
    expect(x.hasAttribute('data-active')).toBe(true);

    // Cell → term.
    await user.hover(ideal);
    expect(termIn('x_ai').hasAttribute('data-active')).toBe(true);
    expect(termIn('x').hasAttribute('data-active')).toBe(false);
    expect(screen.getByTestId('term-x_ai').hasAttribute('data-active')).toBe(true);

    // The result cell is marked in the output table.
    const output = screen.getByTestId('output-normalized-matrix');
    expect(cellOf(output, 'Phone 1', 1).hasAttribute('data-selected')).toBe(true);
  });

  it('explains the cell the user picks', async () => {
    const user = userEvent.setup();
    renderPanel(marcosTrace());
    await user.click(screen.getByTestId('explain-step-normalized-matrix'));
    // Picking a cost cell in the benefit scene moves on to the complete table.
    await user.selectOptions(screen.getByTestId('example-column'), 'c1');
    expect(sceneId()).toBe('normalized-matrix');
    expect(screen.getByTestId('example-column')).toHaveProperty('value', 'c1');
    expect(screen.getByTestId('explain-formula').textContent).toContain('for cost criteria');

    await user.click(screen.getByTestId('cell-normalized-matrix-a3-c2'));
    expect(screen.getByTestId('example-row')).toHaveProperty('value', 'a3');
    expect(screen.getByTestId('example-column')).toHaveProperty('value', 'c2');
    const numbers = [
      ...screen.getByTestId('explain-substitution').querySelectorAll<HTMLElement>('[data-value]'),
    ].map((element) => Number(element.dataset['value']));
    expect(numbers).toEqual([1, 32, 32]);

    // A carried-over value has no formula and says where it came from.
    await user.click(screen.getByTestId('explain-step-extended-matrix'));
    await user.keyboard('{End}');
    await user.click(screen.getByTestId('explain-step-extended-matrix'));
    for (let i = 0; i < 4; i += 1) await user.click(screen.getByTestId('explain-next'));
    expect(sceneId()).toBe('extended-matrix');
    await user.click(screen.getByTestId('cell-extended-matrix-a2-c1'));
    expect(screen.getByTestId('explain-no-formula').textContent).toBe(
      'Phone 2, C1 is carried over unchanged from Initial decision matrix · Phone 2, C1.',
    );

    // "How was this calculated?" is available inside the player too.
    await user.click(screen.getByTestId('explain-derivation'));
    const dialog = await screen.findByRole('dialog', { name: 'How was this calculated?' });
    expect(within(dialog).getByTestId('derivation-value').textContent).toBe('200.0000');
  });

  it('shows a focused view of a large matrix', async () => {
    const user = userEvent.setup();
    renderPanel(largeTrace());
    await user.click(screen.getByTestId('explain-step-normalized-matrix'));
    await user.keyboard('{End}');
    await user.click(screen.getByTestId('explain-step-normalized-matrix'));
    expect(screen.getByTestId('stage-focused').textContent).toMatch(
      /14 of 22 rows and 10 of 12 columns/u,
    );
    const output = screen.getByTestId('output-normalized-matrix');
    // 12 alternatives and the two reference rows, plus the header row.
    expect(within(output).getAllByRole('row')).toHaveLength(15);
    expect(within(output).queryByRole('rowheader', { name: 'Phone 19' })).toBeNull();
    // Choosing an example outside the view brings its row and column in.
    await user.click(screen.getByTestId('explain-next'));
    await user.click(screen.getByTestId('explain-next'));
    await user.selectOptions(screen.getByTestId('example-row'), 'a19');
    await user.selectOptions(screen.getByTestId('example-column'), 'c12');
    const focused = screen.getByTestId('output-normalized-matrix');
    expect(within(focused).getByRole('rowheader', { name: 'Phone 19' })).toBeTruthy();
    expect(within(focused).getByRole('columnheader', { name: 'C12' })).toBeTruthy();
    expect(within(focused).getAllByRole('row')).toHaveLength(15);
  });

  it('plays, pauses and flies values when motion is allowed', async () => {
    useSettings.getState().update({ motion: 'full' });
    const user = userEvent.setup();
    renderPanel(marcosTrace());
    expect(player().getAttribute('data-animated')).toBe('true');
    const play = screen.getByTestId('explain-play');
    expect(play.getAttribute('aria-label')).toBe('Play');
    await user.click(play);
    expect(play.getAttribute('aria-label')).toBe('Pause');
    await user.click(play);
    expect(play.getAttribute('aria-label')).toBe('Play');

    // Space toggles from anywhere in the player that is not a button or a field.
    screen.getByTestId('explain-scrubber').focus();
    await user.keyboard(' ');
    expect(play.getAttribute('aria-label')).toBe('Pause');
    await user.keyboard(' ');

    // The extended matrix gathers the cells of the initial matrix: ghosts are on stage.
    await user.click(screen.getByTestId('explain-step-extended-matrix'));
    await user.click(play);
    expect(document.querySelectorAll('.ex-ghost').length).toBeGreaterThan(0);
    await user.selectOptions(screen.getByTestId('explain-speed'), '2');
    expect(screen.getByTestId('explain-speed')).toHaveProperty('value', '2');

    // Turning animations off shows the static step.
    await user.click(screen.getByTestId('toggle-animations'));
    expect(player().getAttribute('data-animated')).toBe('false');
    expect(document.querySelector('.ex-ghost')).toBeNull();
    expect(screen.queryByTestId('explain-play')).toBeNull();
  });

  it('tells the story of the ranking with values of the trace', async () => {
    const user = userEvent.setup();
    const run = runMethod(marcosMethod, { matrix: matrixOf(PHONES, 'crisp'), weights: weights(3) });
    renderPanel(run.trace);
    await user.click(screen.getByTestId('explain-tab-story'));
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

    // Every number of the story answers "How was this calculated?".
    await user.click(score);
    const dialog = await screen.findByRole('dialog', { name: 'How was this calculated?' });
    expect(dialog.textContent).toContain('Final utility f(K_i)');
  });

  it('is fully translated', async () => {
    const user = userEvent.setup();
    const i18n = createAppI18n('en', {
      plugins: [pseudoProcessor],
      options: { postProcess: ['pseudo'] },
    });
    renderPanel(marcosTrace(), i18n);
    expect(untranslated()).toEqual([]);
    await user.click(screen.getByTestId('explain-step-normalized-matrix'));
    await user.click(screen.getByTestId('explain-derivation'));
    await screen.findByRole('dialog');
    expect(untranslated()).toEqual([]);
    await user.keyboard('{Escape}');
    await user.click(screen.getByTestId('explain-tab-story'));
    expect(untranslated()).toEqual([]);
  });

  it('speaks Turkish', async () => {
    const user = userEvent.setup();
    renderPanel(marcosTrace(), createAppI18n('tr'));
    await user.click(screen.getByTestId('explain-step-normalized-matrix'));
    expect(screen.getByTestId('explain-step-name').textContent).toBe('Normalize matris');
    expect(screen.getByTestId('explain-text').textContent).toMatch(/ideal değerine bölünür/u);
    expect(screen.getByRole('button', { name: 'Sonraki sahne' })).toBeTruthy();
  });

  it('has no explanation for methods without a sequence', () => {
    const trace = marcosTrace();
    expect(explanationOf({ ...trace, methodId: 'critic' })).toBeNull();
    // A trace from a method version with other steps is not explained either.
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

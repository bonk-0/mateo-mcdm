import { tfnAdd, tfnDivide, tfnMultiply, tfnSubtract, centroid, gradedMean } from '@mateo/fuzzy';
import { fireEvent, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { applyOperation } from '../tfn/playground';
import { renderApp } from './renderApp';

const A = { l: 1, m: 3, u: 5 };
const B = { l: 2, m: 4, u: 7 };

const shown = (id: string) => Number(screen.getByTestId(id).dataset['value']);

describe('the Fuzzy Playground operations', () => {
  it('are the operations of @mateo/fuzzy', () => {
    expect(applyOperation('add', A, B, 0)).toEqual({ ok: true, value: tfnAdd(A, B) });
    expect(applyOperation('subtract', A, B, 0)).toEqual({ ok: true, value: tfnSubtract(A, B) });
    expect(applyOperation('multiply', A, B, 0)).toEqual({ ok: true, value: tfnMultiply(A, B) });
    expect(applyOperation('divide', A, B, 0)).toEqual({ ok: true, value: tfnDivide(A, B) });
    expect(applyOperation('scale', A, B, 2)).toEqual({ ok: true, value: { l: 2, m: 6, u: 10 } });
    expect(applyOperation('shift', A, B, 1)).toEqual({ ok: true, value: { l: 2, m: 4, u: 6 } });
  });

  it('report a divisor that contains zero instead of guessing', () => {
    expect(applyOperation('divide', A, { l: -1, m: 1, u: 2 }, 0)).toEqual({
      ok: false,
      reason: 'zero-divisor',
    });
  });
});

describe('the Fuzzy Playground page', () => {
  it('is reachable from the Learn section and no longer a placeholder', async () => {
    renderApp('/learn/playground');
    expect(await screen.findByTestId('fuzzy-playground')).toBeTruthy();
    expect(screen.getByRole('heading', { level: 1, name: 'Fuzzy Playground' })).toBeTruthy();
  });

  it('updates the result and the defuzzified values when a point moves', async () => {
    const user = userEvent.setup();
    renderApp('/learn/playground');
    await screen.findByTestId('fuzzy-playground');

    // A ⊕ B of the start values, straight from the package.
    const sum = tfnAdd(A, B);
    expect(shown('playground-result-l')).toBe(sum.l);
    expect(shown('playground-result-m')).toBe(sum.m);
    expect(shown('playground-result-u')).toBe(sum.u);
    expect(shown('playground-result-graded-mean')).toBe(gradedMean(sum));
    expect(shown('playground-result-centroid')).toBe(centroid(sum));

    // Moving the peak of A with the keyboard, like a drag in steps of the grid.
    const handle = screen.getByTestId('playground-chart-handle-a-m');
    handle.focus();
    await user.keyboard('{ArrowRight}');
    const moved = shown('playground-a-m');
    expect(moved).toBeCloseTo(3.1, 9);
    const next = tfnAdd({ ...A, m: moved }, B);
    expect(shown('playground-result-m')).toBe(next.m);
    expect(shown('playground-result-graded-mean')).toBe(gradedMean(next));
    expect(handle.getAttribute('aria-valuenow')).toBe(String(moved));

    // The number fields change the same value, and l cannot pass m.
    fireEvent.change(screen.getByTestId('playground-input-a-l'), { target: { value: '9' } });
    expect(shown('playground-a-l')).toBe(moved);
  });

  it('switches operation, hides B for a crisp number and reports division by zero', async () => {
    const user = userEvent.setup();
    renderApp('/learn/playground');
    await screen.findByTestId('fuzzy-playground');
    await user.click(screen.getByTestId('playground-operation'));
    await user.click(await screen.findByTestId('playground-operation-scale'));
    expect(screen.queryByTestId('playground-operand-b')).toBeNull();
    expect(shown('playground-result-m')).toBe(6);

    await user.click(screen.getByTestId('playground-operation'));
    await user.click(await screen.findByTestId('playground-operation-divide'));
    fireEvent.change(screen.getByTestId('playground-input-b-l'), { target: { value: '0' } });
    expect(screen.getByTestId('playground-error')).toBeTruthy();
    expect(screen.queryByTestId('playground-row-result')).toBeNull();
  });

  it('overlays a linguistic scale and sets a number to one of its terms', async () => {
    const user = userEvent.setup();
    renderApp('/learn/playground');
    await screen.findByTestId('fuzzy-playground');
    await user.click(screen.getByTestId('playground-scale'));
    await user.click(await screen.findByRole('option', { name: /Fuzzy MARCOS/u }));
    expect(screen.getAllByTestId(/^playground-chart-scale-/u).length).toBeGreaterThan(3);
    const [term] = screen.getAllByTestId(/^playground-term-a-/u);
    await user.click(term!);
    expect(term!.getAttribute('class')).toContain('bg-primary');
  });
});

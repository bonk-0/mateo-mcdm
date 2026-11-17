import { describe, expect, it } from 'vitest';
import { cellKey, explainCell, operandRefs, resultTermName } from './cell';
import { latexText, substitutionLatex, symbolicLatex, valueLatex } from './latex';
import { traceNumbers } from './numbers';
import { fuzzyMarcosRun, marcosRun } from './testing/runs';

const trace = marcosRun({ normalizeWeights: true }).trace;
const cell = (step: string, row: string, column: string) => ({ step, row, column });

/** Marks every number so that a test can read the numbers back out of the LaTeX. */
const marked = (value: number) => `⟨${String(value)}⟩`;
const numbersIn = (latex: string) =>
  [...latex.matchAll(/⟨([^⟩]+)⟩/gu)].map((match) => Number(match[1]));

describe('explainCell', () => {
  it('binds the terms of a benefit and a cost normalization to the cells behind them', () => {
    const benefit = explainCell(trace, cell('normalized-matrix', 'a1', 'c2'));
    expect(benefit.formula?.id).toBe('benefit');
    expect(benefit.carriedFrom).toBeNull();
    expect(benefit.bindings.map((binding) => [binding.term.name, binding.role])).toEqual([
      ['n', 'result'],
      ['x', 'operand'],
      ['x_ai', 'operand'],
    ]);
    const [n, x, ideal] = benefit.bindings;
    expect(n!.operands).toEqual([{ value: 0.5, ref: cell('normalized-matrix', 'a1', 'c2') }]);
    expect(x!.operands).toEqual([{ value: 16, ref: cell('extended-matrix', 'a1', 'c2') }]);
    expect(ideal!.operands).toEqual([{ value: 32, ref: cell('extended-matrix', 'AI', 'c2') }]);

    const cost = explainCell(trace, cell('normalized-matrix', 'a1', 'c1'));
    expect(cost.formula?.id).toBe('cost');
    // The template of the cost formula names the ideal first.
    expect(cost.bindings.map((binding) => binding.term.name)).toEqual(['n', 'x_ai', 'x']);
  });

  it('binds an aggregate to its whole range', () => {
    const ideal = explainCell(trace, cell('extended-matrix', 'AI', 'c1'));
    expect(ideal.formula?.id).toBe('ideal-cost');
    const x = ideal.bindings.find((binding) => binding.term.name === 'x')!;
    expect(x.range).toBe(true);
    expect(x.operands.map((operand) => operand.value)).toEqual([250, 200, 300, 275]);
    expect(x.operands.map((operand) => operand.ref?.row)).toEqual(['a1', 'a2', 'a3', 'a4']);
  });

  it('binds a term on an operation to the value of that operation', () => {
    const step = trace.steps.find((item) => item.id === 'normalized-weights')!;
    const weight = explainCell(trace, cell(step.id, step.output.rows[0]!.id, 'c1'));
    const names = weight.bindings.map((binding) => binding.term.name);
    expect(names).toEqual(['w_n', 'w', 'w_sum']);
    const total = weight.bindings[2]!;
    expect(total.operands).toHaveLength(1);
    expect(total.operands[0]!.ref).toBeUndefined();
    expect(traceNumbers(trace).has(total.operands[0]!.value as number)).toBe(true);
  });

  it('reports carried-over and input cells without a formula', () => {
    const carried = explainCell(trace, cell('extended-matrix', 'a2', 'c3'));
    expect(carried.formula).toBeNull();
    expect(carried.carriedFrom).toEqual(cell('initial-matrix', 'a2', 'c3'));
    const input = explainCell(trace, cell('initial-matrix', 'a2', 'c3'));
    expect(input.formula).toBeNull();
    expect(input.carriedFrom).toBeNull();
    expect(input.cell.derivation.kind).toBe('input');
  });

  it('uses the only formula of a step for cells that do not name one', () => {
    expect(explainCell(trace, cell('sums', 'a1', 'S')).formula?.id).toBe('sum');
    // The ranking has no formula at all.
    expect(explainCell(trace, cell('ranking', 'a1', 'rank')).formula).toBeNull();
  });
});

describe('operandRefs', () => {
  it('lists every cell once per term and tells single cells from ranges', () => {
    const final = explainCell(trace, cell('final-utility', 'a1', 'f-k'));
    const refs = operandRefs(trace, final.cell.derivation);
    expect(refs.map((operand) => [operand.ref.step, operand.ref.column, operand.term])).toEqual([
      ['utility-degrees', 'k-plus', 'K_plus'],
      ['utility-degrees', 'k-minus', 'K_minus'],
      ['utility-functions', 'f-k-plus', 'f_plus'],
      ['utility-functions', 'f-k-minus', 'f_minus'],
    ]);
    expect(refs.every((operand) => operand.direct)).toBe(true);

    const sum = explainCell(trace, cell('sums', 'AAI', 'S'));
    const row = operandRefs(trace, sum.cell.derivation);
    expect(row).toHaveLength(3);
    expect(row.every((operand) => !operand.direct && operand.term === 'v')).toBe(true);
  });

  it('gives distinct keys to distinct cells', () => {
    expect(cellKey(cell('a', 'b', 'c'))).not.toBe(cellKey(cell('a', 'b,c', '')));
  });
});

describe('formula LaTeX', () => {
  it('finds the term a formula defines', () => {
    const step = trace.steps.find((item) => item.id === 'normalized-matrix')!;
    expect(resultTermName(step.formulas[0]!)).toBe('n');
    expect(
      resultTermName({ id: 'x', template: String.raw`\max {{a}}`, terms: [] }),
    ).toBeUndefined();
  });

  it('renders the symbolic formula with wrapped terms', () => {
    const { formula } = explainCell(trace, cell('normalized-matrix', 'a1', 'c2'));
    expect(symbolicLatex(formula!)).toBe(String.raw`n_{ij} = \frac{ x_{ij} }{ x_{ai} }`);
    expect(symbolicLatex(formula!, (term, latex) => `[${term.name}:${latex}]`)).toBe(
      String.raw`[n:n_{ij}] = \frac{ [x:x_{ij}] }{ [x_ai:x_{ai}] }`,
    );
  });

  it('substitutes only numbers of the trace', () => {
    const known = traceNumbers(trace);
    for (const step of trace.steps) {
      for (const row of step.output.rows) {
        for (const column of step.output.columns) {
          const explanation = explainCell(trace, cell(step.id, row.id, column.id));
          const latex = substitutionLatex(explanation, { number: marked });
          if (explanation.formula === null) {
            expect(latex).toBeNull();
            continue;
          }
          const numbers = numbersIn(latex!);
          expect(numbers.length).toBeGreaterThan(0);
          for (const number of numbers) expect(known.has(number)).toBe(true);
        }
      }
    }
  });

  it('substitutes the numbers of one cell into its formula', () => {
    const explanation = explainCell(trace, cell('normalized-matrix', 'a1', 'c2'));
    expect(substitutionLatex(explanation, { number: marked })).toBe(
      String.raw`⟨0.5⟩ = \frac{ ⟨16⟩ }{ ⟨32⟩ }`,
    );
    const ideal = explainCell(trace, cell('extended-matrix', 'AI', 'c1'));
    expect(substitutionLatex(ideal, { number: marked })).toBe(
      String.raw`⟨200⟩ = \min_i \left\{ ⟨250⟩,\; ⟨200⟩,\; ⟨300⟩,\; ⟨275⟩ \right\}`,
    );
    expect(substitutionLatex(ideal, { number: marked, maxListed: 3 })).toBe(
      String.raw`⟨200⟩ = \min_i \left\{ ⟨250⟩,\; ⟨200⟩,\; \dots,\; ⟨275⟩ \right\}`,
    );
    expect(
      substitutionLatex(explanation, {
        number: marked,
        wrapTerm: (term, latex) => `<${term.name} ${latex}>`,
      }),
    ).toBe(String.raw`<n ⟨0.5⟩> = \frac{ <x ⟨16⟩> }{ <x_ai ⟨32⟩> }`);
  });

  it('writes fuzzy numbers as (l, m, u) and substitutes only trace numbers', () => {
    const fuzzy = fuzzyMarcosRun({ fuzzyWeights: true }).trace;
    const known = traceNumbers(fuzzy);
    const explanation = explainCell(fuzzy, cell('weighted-matrix', 'a1', 'c2'));
    const latex = substitutionLatex(explanation, { number: marked })!;
    expect(latex).toContain(String.raw`\left( ⟨`);
    expect(numbersIn(latex)).toHaveLength(9);
    for (const step of fuzzy.steps) {
      for (const row of step.output.rows) {
        for (const column of step.output.columns) {
          const text = substitutionLatex(explainCell(fuzzy, cell(step.id, row.id, column.id)), {
            number: marked,
          });
          for (const number of numbersIn(text ?? '')) expect(known.has(number)).toBe(true);
        }
      }
    }
  });

  it('escapes text and renders every kind of value', () => {
    expect(latexText('50% of a_b {x} \\ ^~ & # $')).toBe(
      String.raw`\text{50\% of a\_b \{x\} \textbackslash{} \textasciicircum{}\textasciitilde{} \& \# \$}`,
    );
    expect(valueLatex(null, marked)).toBe(String.raw`\text{–}`);
    expect(valueLatex('high', marked)).toBe(String.raw`\text{high}`);
    expect(valueLatex(2, marked)).toBe('⟨2⟩');
    expect(valueLatex({ type: 'tfn', components: { l: 1, m: 2, u: 3 } }, marked)).toBe(
      String.raw`\left( ⟨1⟩,\, ⟨2⟩,\, ⟨3⟩ \right)`,
    );
  });
});

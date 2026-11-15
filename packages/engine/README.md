# @mateo/engine

The pure calculation core every Mateo method builds on (sub-phase P1.2, `docs/plan.md` §6).
Data in, result plus step trace out: no UI, no I/O, no randomness, no clock.

| Folder             | What it holds                                                                    |
| ------------------ | -------------------------------------------------------------------------------- |
| `src/model`        | `Criterion`, `Alternative`, `DecisionMatrix<T>`, `WeightVector<T>`, `TextRef`    |
| `src/validation`   | `ValidationResult`, issue codes, shared matrix and weight checks                 |
| `src/trace`        | Trace model, `TraceBuilder`, traced crisp arithmetic, formulas, trace auditor    |
| `src/math`         | Normalization variants, reductions, ranking with tie rules                       |
| `src/method`       | `Method` contract, parameter schemas, registry, `runMethod`                      |
| `src/determinism`  | `assertDeterministic`, `canonicalJson`                                           |
| `src/messages`     | English and Turkish texts for the i18n keys the engine emits                     |
| `src/__fixtures__` | A toy weighted-sum method used only by the tests; also a complete worked example |

## Core ideas

**Tracked values.** A method does not compute with bare numbers and then describe what it
did. It computes with `Tracked<T>` values: `crisp.divide(a, b)` returns the quotient _and_
the derivation node `{ operation: 'divide', operands: [...], value }` in one step. The
number in the trace is therefore always the number that was computed, which is what lets
Explain mode, the audit view and reports display engine output without any arithmetic of
their own.

**One table per step.** A trace is an ordered list of steps. Each step outputs one table;
vectors and scalars are tables with a single row and/or column, so every cell of every step
is addressed the same way: `{ step, row, column }`, using axis item ids (alternative and
criterion ids where they apply). Method inputs are echoed into the trace by input steps, so
a trace is self-contained.

**Every cell has a derivation.** A cell is `{ value, derivation }`. The derivation is a
small tree whose leaves are references to cells of earlier steps (`ref`), whole rows or
columns (`range`, for aggregates such as a column maximum), method inputs (`input`),
parameters and constants. Following the references leads from any result back to the
inputs: that is the "How was this calculated?" tree.

**Formulas with named terms.** A step formula is a LaTeX template with `{{term}}`
placeholders. Operands carry the term name they stand for, which links a term of the
formula to the cells behind it (linked highlighting) and allows numeric substitution with
`renderFormula`.

**Plain JSON, finite numbers.** Results and traces are stored in project files. A trace
never contains `NaN`, an infinity or `-0`; an operation that would produce one throws
`EngineError('NON_FINITE_VALUE')` naming the step and cell. Validation must reject such
input first; the throw is the backstop that keeps a wrong number from being shown.

**Errors block, warnings travel.** Problems with user data are returned as a
`ValidationResult`, never thrown. Each issue has a stable machine `code`, an i18n
`messageKey`, parameters and a location (input slot, row, column, parameter). Errors block
the run; warnings are stored with the run record.

## Writing a method

```ts
import {
  checkCrispMatrix,
  checkCrispWeights,
  createTraceBuilder,
  createValidation,
  crisp,
  defineMethod,
  defineParameters,
  term,
} from '@mateo/engine';

export const myMethod = defineMethod({
  id: 'my-method', // kebab-case, stable
  version: '1.0.0', // bump on any change that can alter a result or trace
  category: 'ranking',
  nameKey: 'methods.myMethod.name',
  supportedNumberTypes: ['crisp'],
  inputSchema: [
    { name: 'matrix', kind: 'decision-matrix', required: true, numberTypes: ['crisp'] },
    { name: 'weights', kind: 'weights', required: true, numberTypes: ['crisp'] },
  ],
  outputSchema: [{ name: 'ranking', kind: 'ranking', numberTypes: ['crisp'] }],
  parameters: defineParameters({
    lambda: { type: 'number', labelKey: 'methods.myMethod.lambda', default: 0.5, min: 0, max: 1 },
  }),
  references: [/* verified citation(s) */],

  validate(input: MyInput) {
    const v = createValidation();
    v.add(checkCrispMatrix(input?.matrix, { sign: 'positive' }));
    if (!v.hasErrors) {
      v.add(
        checkCrispWeights(
          input.weights,
          input.matrix.criteria.map((c) => c.id),
        ),
      );
    }
    return v.result();
  },

  run(input: MyInput, params) {
    const tb = createTraceBuilder({ methodId: 'my-method', methodVersion: '1.0.0' });
    const x = tb.inputMatrix({
      id: 'initial-matrix',
      nameKey,
      explanationKey,
      matrix: input.matrix,
    });
    const columnMax = input.matrix.criteria.map((_, j) => term(crisp.max(x.column(j)), 'x_max'));
    const n = tb.table({
      id: 'normalized-matrix',
      nameKey,
      explanationKey,
      formulas: [
        {
          id: 'benefit',
          template: String.raw`{{n}} = \frac{ {{x}} }{ {{x_max}} }`,
          terms: [
            { name: 'n', latex: 'n_{ij}' },
            { name: 'x', latex: 'x_{ij}' },
            { name: 'x_max', latex: String.raw`\max_i x_{ij}` },
          ],
        },
      ],
      rows: x.rows,
      columns: x.columns,
      visualization: { view: 'matrix', basedOn: x.id },
      cell: (row, column) =>
        crisp.divide(term(x.cell(row.index, column.index), 'x'), columnMax[column.index]!),
    });
    // ... more steps ...
    return { result, trace: tb.build() };
  },
});
```

The complete example is [`src/__fixtures__/weighted-sum.ts`](src/__fixtures__/weighted-sum.ts).

Rules for method authors:

1. `validate` must not trust the static type of its input. Data comes from imported files
   and stored projects; the `check*` helpers accept `unknown` for that reason. Method
   specific codes are prefixed with the method id (`merec.non-positive-value`).
2. `run` may assume `validate` reported no errors. Callers use `runMethod`, which enforces
   the order and returns the run record (method id and version, resolved parameters,
   result, trace, warnings).
3. Compute every traced value through tracked operations. Compute an aggregate that many
   cells share (a column maximum) once, outside the cell callback, and pass a range
   (`x.column(j)`) rather than a list of cells: it keeps the trace compact.
4. If an aggregate needs a per-item expression that the crisp helpers do not provide as a
   single operation, record it as its own step (a row vector of column aggregates) and
   reference that step.
5. Step ids are part of the method's public surface: Explain sequences map to them.
6. The helpers in `src/math` are building blocks, not defaults. Use a normalization
   variant only when it is exactly the one in the method's reference paper.
7. Tests of every method call `assertDeterministic(method, input, params)` and
   `verifyTrace(trace, { requireKnownOperations: true })`.

## Other number types

The engine knows only crisp numbers, but nothing in the trace model is crisp-specific.
A package that adds a number type (`@mateo/fuzzy` for TFN) provides:

- an `Encoder<T>` to a `TraceCompositeValue`, e.g. `{ type: 'tfn', components: { l, m, u } }`;
- its operations, built on `derive(operation, operands, value, encode)`;
- optionally `OperationEvaluator`s so `verifyTrace` can recompute them too.

`TraceBuilder` steps, handles, ranges, formulas and the registry work unchanged for any `T`.

## Auditing and reproducibility

- `verifyTrace(trace)` checks a trace without trusting it: structure, references (only to
  earlier steps, carrying the referenced value), formulas and terms, and it recomputes every
  operation with a known evaluator and compares it with the recorded value exactly.
- `assertDeterministic(method, input, params)` runs a method several times on deeply frozen
  copies of the input and requires byte-identical records. It also catches input mutation.
- `TRACE_FORMAT_VERSION` identifies the stored trace format for migrations.
- ESLint forbids `Math.random`, `Date` and similar sources in `engine`, `fuzzy` and `methods`.

## Commands

```sh
pnpm --filter @mateo/engine test            # unit and contract tests
pnpm --filter @mateo/engine test:coverage   # fails below 90 % coverage
```

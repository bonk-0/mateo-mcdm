# @mateo/fuzzy

Triangular fuzzy numbers (TFN) for every fuzzy method of Mateo, plus linguistic scales
(sub-phase P1.3, `docs/plan.md` §6.3). Pure TypeScript on top of `@mateo/engine`: no UI,
no I/O, no randomness, no clock.

| File                       | What it holds                                                                           |
| -------------------------- | --------------------------------------------------------------------------------------- |
| `src/tfn.ts`               | The `TFN` type `(l, m, u)`, the checked constructor and `tfnProblem`                    |
| `src/arithmetic.ts`        | `tfnAdd`, `tfnSubtract`, `tfnMultiply`, `tfnDivide`, `tfnPower`, scalar forms           |
| `src/aggregation.ts`       | `tfnSum`, `tfnProduct`, `tfnMin`, `tfnMax`, arithmetic and geometric mean, min/mean/max |
| `src/defuzzification.ts`   | `gradedMean`, `centroid`, and both by id                                                |
| `src/trace.ts`             | `encodeTfn`, the traced operations `tfnOps`, `TFN_EVALUATORS`                           |
| `src/validation.ts`        | `checkTfnMatrix`, `checkTfnWeights`, issue codes                                        |
| `src/scales.ts`            | `LinguisticScale`, `checkLinguisticScale`, term → TFN conversion                        |
| `src/predefined-scales.ts` | 5-level, 7-level, Fuzzy MARCOS and IMF SWARA scales                                     |
| `src/messages`             | English and Turkish texts for the i18n keys the package emits                           |

## Core ideas

**A TFN is plain data.** `{ l, m, u }` with finite components and `l ≤ m ≤ u`. `tfn(l, m, u)`
is the checked constructor; `tfnProblem(value)` says why an unknown value is not a TFN
without throwing. User data is validated with `checkTfnMatrix` and `checkTfnWeights`, which
report every problem with a code (`tfn.invalid-order`...) and a location.

**Nothing is a default.** Every operation and every defuzzification formula is a separate
named export. A method uses exactly the ones of its reference paper (plan §6.3); there is
no "the" TFN division or "the" defuzzification hidden behind a generic name.

**Standard approximate arithmetic.**

| Operation            | Result                                                       |
| -------------------- | ------------------------------------------------------------ |
| `tfnAdd(a, b)`       | `(l₁ + l₂, m₁ + m₂, u₁ + u₂)`                                |
| `tfnSubtract(a, b)`  | `(l₁ − u₂, m₁ − m₂, u₁ − l₂)`                                |
| `tfnMultiply(a, b)`  | `(l₁·l₂, m₁·m₂, u₁·u₂)` for non-negative operands            |
| `tfnDivide(a, b)`    | `(l₁ / u₂, m₁ / m₂, u₁ / l₂)` for `a ≥ 0`, `b > 0`           |
| `tfnScalarDividedBy` | `(k / u, k / m, k / l)` for `k ≥ 0`, `a > 0`                 |
| `tfnPower(a, w)`     | `(l^w_u, m^w_m, u^w_l)` for `a ≤ 1`, the WASPAS-F power rule |
| `tfnMin`, `tfnMax`   | component-wise, as in the ideal solutions of Fuzzy MARCOS    |
| `gradedMean(a)`      | `(l + 4m + u) / 6`                                           |
| `centroid(a)`        | `(l + m + u) / 3`                                            |

For operands with negative parts, products and quotients take the smallest and largest of
the four end-point results, so the result is a valid TFN for any signs and equals the
textbook formula exactly whenever that formula applies. Dividing by a TFN whose support
contains zero throws `EngineError('NON_FINITE_VALUE')`; a method's `validate` must reject
such input first (`checkTfnMatrix(matrix, { sign: 'positive' })`).

**Degenerate TFNs are crisp numbers.** On `(x, x, x)` every operation returns exactly what
the crisp operation returns in floating point, and both defuzzifications return exactly
`x`. For that reason the defuzzification formulas are evaluated around `m`
(`m + ((l − m) + (u − m)) / 6`), which is algebraically the same as `(l + 4m + u) / 6`.
The property tests (`src/properties.test.ts`) cover this, closure (valid operands always
give a valid TFN) and enclosure (the support of `a ∘ b` contains `x ∘ y` for all `x` in
`a` and `y` in `b`).

## Using TFNs in a method

`tfnOps` is the counterpart of the engine's `crisp`: each function computes its value with
the pure function of the same name and records the derivation. TFN cells are stored in the
trace as triples, `{ type: 'tfn', components: { l, m, u } }`.

```ts
import { createTraceBuilder, term } from '@mateo/engine';
import { checkTfnMatrix, encodeTfn, tfnOps, type TFN } from '@mateo/fuzzy';

// validate(): v.add(checkTfnMatrix(input.matrix, { sign: 'positive' }));

const tb = createTraceBuilder({ methodId: 'my-fuzzy-method', methodVersion: '1.0.0' });
const x = tb.inputMatrix({
  id: 'initial-matrix',
  nameKey,
  explanationKey,
  matrix,
  encode: encodeTfn,
});
const ideal = tb.rowVector<TFN>({
  id: 'ideal',
  nameKey,
  explanationKey,
  items: x.columns,
  cell: (column) => tfnOps.max(x.column(column.index)),
});
const n = tb.table<TFN>({
  id: 'normalized-matrix',
  nameKey,
  explanationKey,
  formulas,
  rows: x.rows,
  columns: x.columns,
  cell: (row, column) =>
    tfnOps.divideByScalar(
      term(x.cell(row.index, column.index), 'x'),
      term(tfnOps.upper(ideal.at(column.index)), 'x_id'),
    ),
});
const crispScore = tfnOps.defuzzify(params.defuzzification, someTfn); // 'graded-mean' | 'centroid'
```

Tests of a fuzzy method audit the trace with the TFN evaluators:

```ts
verifyTrace(trace, { operations: TFN_EVALUATORS, requireKnownOperations: true });
```

Crisp values that take part in fuzzy arithmetic (a crisp weight, say) are converted
explicitly with `tfnOps.fromCrisp`.

## Linguistic scales

A `LinguisticScale` is an ordered list of terms, lowest first; each term has an id, a label
(an i18n key for predefined scales, literal text for scales made by the user), an
abbreviation and a TFN. `checkLinguisticScale` validates a scale from the editor or a file:
ids and abbreviations must identify one term each (ignoring case) and the terms must be
monotonic, meaning that from each term to the next no component decreases and at least one
increases.

| Scale                | Kind       | Terms | Source                                                      |
| -------------------- | ---------- | ----- | ----------------------------------------------------------- |
| `FIVE_LEVEL_SCALE`   | rating     | 5     | Even triangular partition of 1–9; not from a paper          |
| `SEVEN_LEVEL_SCALE`  | rating     | 7     | Even triangular partition of 1–7; not from a paper          |
| `FUZZY_MARCOS_SCALE` | rating     | 9     | Stanković et al. (2020), Tables 1–2                         |
| `IMF_SWARA_SCALE`    | comparison | 8     | Vrtagić et al. (2021); values from Damjanović et al. (2022) |

The two general scales are strictly positive on purpose, so they work with methods that
divide by a rating (cost criteria in Fuzzy MARCOS). The paper scales are compared with the
P1.4 fixtures in `packages/methods/src/scales.test.ts`.

`findTerm(scale, 'VG')` and `termToTfn(scale, 'VG')` accept a term id or abbreviation,
ignoring case and surrounding spaces. `linguisticMatrixToTfn(scale, matrix)` converts a
whole decision matrix and reports every cell that is not a term of the scale
(`scale.unknown-term`); nothing is guessed.

## Commands

```sh
pnpm --filter @mateo/fuzzy test            # unit, property and trace tests
pnpm --filter @mateo/fuzzy test:coverage   # fails below 90 % coverage
```

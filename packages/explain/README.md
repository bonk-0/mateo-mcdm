# @mateo/explain

Turns an engine step trace into a lesson (docs/plan.md §8). Pure TypeScript: no React, no DOM, and **no arithmetic of its own**. Every value it hands out is a copy of a value in the trace.

| Module       | What it does                                                                                                                                                                                                                                                                |
| ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `lesson.ts`  | `buildLesson(trace, sequence)`: the lesson steps of a method run, each with the trace steps it covers, its **parts** (the steps that have formulas) and its **sources** (the earlier steps drawn beside it). `resultFocus` and `exampleCell` pick the cell a step explains. |
| `cell.ts`    | `explainCell(trace, ref)`: the formula of a cell and the value of each term. Feeds the lesson, linked highlighting and "How was this calculated?".                                                                                                                          |
| `latex.ts`   | The symbolic formula and the formula with the numbers of one cell, as LaTeX.                                                                                                                                                                                                |
| `story.ts`   | `buildRankingStory`: winner, top drivers and the comparison with the runner-up. Orders and compares values, never calculates.                                                                                                                                               |
| `focus.ts`   | Which rows and columns of a large table are shown.                                                                                                                                                                                                                          |
| `sequences/` | The lesson of each method: MARCOS, Fuzzy MARCOS, CRITIC, MEREC, SWARA and Fuzzy SWARA: every Phase 1 method.                                                                                                                                                                |

## Adding a lesson

A sequence lists the lesson steps of a method in order. Each step names the trace steps it teaches (`steps`, some of which may be `optional`); the last step of a ranking method can tell the `story` of the result. `buildLesson` throws an `ExplainError` when a trace step is taught by no lesson step or by two, or out of trace order, so a new step of a method can never be left unexplained silently. Register the sequence in `sequences/index.ts` and add its run to `lesson.test.ts`.

The texts live in the `explain` i18n catalog under `lessons.<textKey>`: `steps.<id>.{title, idea, why}` for every lesson step, and `formulas.<stepId>.<formulaId>.{how, meaning}` for every formula, with `{row}`, `{column}`, `{cell}` and `{value}` as arguments. `apps/web/src/test/explain.test.tsx` checks that every one exists in every language.

## The provenance guarantee

`lesson.test.ts` checks that every step of every method is taught and that every part has a formula cell to explain. `apps/web/src/test/explain.test.tsx` walks every step and part of every lesson, with the formula open, and asserts that every number on screen is a value of the trace (`traceNumbers`) and that no other decimal number is shown.

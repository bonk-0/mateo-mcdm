# @mateo/explain

Turns an engine step trace into an animation timeline (docs/plan.md §8). Pure TypeScript: no React, no DOM, and **no arithmetic of its own**. Every value it hands out is a copy of a value in the trace; timing only depends on where a cell sits in its table.

| Module        | What it does                                                                                                                                                                                               |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `timeline.ts` | `buildTimeline(trace, sequence)`: per step one **formula scene** for every formula that was used, then a **matrix** or **vector scene** that fills the output. Scenes carry cell reveals and cell flights. |
| `cell.ts`     | `explainCell(trace, ref)`: the formula of a cell and the value of each term. Feeds linked highlighting and "How was this calculated?".                                                                     |
| `latex.ts`    | The symbolic formula and the formula with the numbers of one cell, as LaTeX.                                                                                                                               |
| `player.ts`   | `playerReducer`: play, pause, step, seek, speed and static mode as a pure state machine. The UI owns the clock.                                                                                            |
| `story.ts`    | `buildRankingStory`: winner, top drivers and the comparison with the runner-up. Orders and compares values, never calculates.                                                                              |
| `focus.ts`    | Which rows and columns of a large table are shown.                                                                                                                                                         |
| `sequences/`  | The explain sequence of each method: MARCOS, Fuzzy MARCOS, CRITIC, MEREC, SWARA and Fuzzy SWARA: every Phase 1 method.                                                                                     |

## Adding a sequence

A sequence has one `StepPlan` per step id of the method's trace: how the output is drawn (`matrix`, `bars`, `ranking`, `value`), which earlier steps are shown beside it, which operands fly, and the text of each formula scene (keys in the `explain` i18n catalog under `sequences.<method>`). `buildTimeline` throws when the trace has a step the sequence does not plan, so a new step can never be left unexplained silently. Register the sequence in `sequences/index.ts` and add its run to the provenance tests in `timeline.test.ts`.

## The provenance guarantee

`timeline.test.ts` asserts for every sequence (the two ranking and the four weighting methods) that every number in a timeline is a value of the trace (`traceNumbers`), and `apps/web/src/test/explain.test.tsx` asserts the same for every number rendered on screen in every scene.

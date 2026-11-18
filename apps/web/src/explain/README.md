# Lessons and "How it was calculated" (P1.13, P1.14)

The UI of `@mateo/explain`. The same lesson teaches a method in Learn (`library/MethodPage.tsx`, on a small phone example) and explains a result on the user's own data: the **How it was calculated** tab of a stored analysis (`workspace/AnalysisView.tsx`) and "How was this calculated?" of the Result and Weights steps (`flow/parts.tsx`).

| File               | Role                                                                                                                                                                                      |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ExplainPanel.tsx` | `explanationOf(trace)` (`null` for methods without a lesson) and the panel. With `followResult` the lesson explains the winner and the heaviest criterion.                                |
| `Lesson.tsx`       | `LessonShell` (step markers, idea and why, Back and Next, arrow keys) and `LessonView`: the tables a step reads and produces, and the explained cell in words, in numbers and in meaning. |
| `Formula.tsx`      | KaTeX. Terms carry `data-term` for linked highlighting; numbers carry `data-value`.                                                                                                       |
| `TraceTable.tsx`   | The table of a trace step, shared with the results view. Cells are buttons with arrow-key navigation.                                                                                     |
| `Derivation.tsx`   | "How was this calculated?" popover: formula, substitution and derivation tree; operands link to their own derivation.                                                                     |
| `StoryView.tsx`    | Winner, top drivers, runner-up: the last step of a ranking lesson.                                                                                                                        |
| `Value.tsx`        | A trace value at display precision, with the exact number in `data-value`.                                                                                                                |

Rules:

- Nothing here calculates a method value. Bar lengths are drawing; every shown number is rendered by `Value` or `markNumber` and is checked against the trace in `test/explain.test.tsx`.
- Nothing plays by itself: the learner moves with Next, Back or the arrow keys. A new step fades in, unless reduced motion is on (OS or app setting).
- Each step says what it does (`idea`) and why (`why`), then explains one cell: how it is calculated, the same calculation with its numbers, and what the result means. The formula with a legend of its symbols opens on request. Any cell of the tables can be explained.
- Tables larger than `FOCUS_LIMITS` (12 rows, 10 columns) show only the rows and columns in use around the explained cell, with a switch to the whole tables.
- Fuzzy cells are drawn with `TfnGlyph` (`../tfn`), a membership triangle without any text, so the provenance test still sees only the numbers of `Value`. Weighting methods (CRITIC, MEREC, SWARA, Fuzzy SWARA) have a lesson but no ranking story.

# TFN components (P1.14)

`src/tfn` holds the triangular fuzzy number visuals: `TfnChart` (triangles, linguistic scale overlay, markers, draggable and keyboard-operable points), `TfnGlyph` (small triangle for cells and bars), `geometry.ts` (clamping a dragged point so `l ≤ m ≤ u`, ticks) the lesson "What is a fuzzy number?" (`FuzzyLesson.tsx`, route `/learn/fuzzy`), whose last step is the Fuzzy Playground (`FuzzyPlayground.tsx`, also on its own at `/learn/playground`). The playground does no arithmetic: operations and defuzzification come from `@mateo/fuzzy` (`playground.ts`).

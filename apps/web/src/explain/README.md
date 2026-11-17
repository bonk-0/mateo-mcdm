# Explain mode (P1.13, P1.14)

The UI of `@mateo/explain`. It is shown in the **Explain** tab of a stored analysis (`workspace/AnalysisView.tsx`), next to the results.

| File                | Role                                                                                                                               |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `ExplainPanel.tsx`  | Tabs: step-by-step player and story of the result. `explanationOf(trace)` is `null` for methods without a sequence.                |
| `ExplainPlayer.tsx` | Step list, explanation, formula panel, stage and transport controls. Keyboard: Space, ←, →, Home, End.                             |
| `usePlayer.ts`      | Runs the pure player reducer on Motion's frame loop. While a scene plays only the playhead moves; React does not render per frame. |
| `Stage.tsx`         | Source tables and the output. Reveals and cell flights follow the playhead with direct style writes (transform and opacity only).  |
| `Formula.tsx`       | KaTeX. Terms carry `data-term` for linked highlighting; numbers carry `data-value`.                                                |
| `TraceTable.tsx`    | The table of a trace step, shared with the results view. Cells are buttons with arrow-key navigation.                              |
| `Derivation.tsx`    | "How was this calculated?" popover: formula, substitution and derivation tree; operands link to their own derivation.              |
| `StoryView.tsx`     | Winner, top drivers, runner-up.                                                                                                    |
| `Value.tsx`         | A trace value at display precision, with the exact number in `data-value`.                                                         |

Rules:

- Nothing here calculates a method value. Bar lengths are drawing; every shown number is rendered by `Value` or `markNumber` and is checked against the trace in `test/explain.test.tsx`.
- With reduced motion (OS or app setting) the player is in static-steps mode: every scene is shown complete, there is no play button and no flight.
- Tables larger than `FOCUS_LIMITS` (12 rows, 10 columns) show a focused view around the example cell.
- Fuzzy cells are drawn with `TfnGlyph` (`../tfn`), a membership triangle without any text, so the provenance test still sees only the numbers of `Value`. Weighting methods (CRITIC, MEREC, SWARA, Fuzzy SWARA) have a timeline but no ranking story.

# TFN components (P1.14)

`src/tfn` holds the triangular fuzzy number visuals: `TfnChart` (triangles, linguistic scale overlay, markers, draggable and keyboard-operable points), `TfnGlyph` (small triangle for cells and bars), `geometry.ts` (clamping a dragged point so `l ≤ m ≤ u`, ticks) and the Fuzzy Playground (`FuzzyPlayground.tsx`, route `/learn/playground`). The playground does no arithmetic: operations and defuzzification come from `@mateo/fuzzy` (`playground.ts`).

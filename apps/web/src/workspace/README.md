# Method workspaces and results (P1.12)

| Route                                       | Screen                                                     |
| ------------------------------------------- | ---------------------------------------------------------- |
| `/methods/weighting`                        | CRITIC, MEREC, SWARA and Fuzzy SWARA (`WeightingPage.tsx`) |
| `/analysis/marcos` (and `/methods/ranking`) | MARCOS and Fuzzy MARCOS, seven sections (`MarcosPage.tsx`) |
| `/analysis/results`                         | Every analysis stored in the project (`ResultsPage.tsx`)   |

How a run works:

1. `engineInput.ts` turns the dataset into an engine matrix. Nothing is filled in: a missing cell, a fuzzy cell in the classical model or an unknown term is reported and the run does not start.
2. `runner.ts` sends the job to a Web Worker (`runner.worker.ts`), which calls the engine's `runMethod` through `runnerCore.ts`. Without `Worker` (unit tests) the same code runs in place.
3. `runWorkflow.ts` saves the project, stores the record with `session.addAnalysis` (dataset snapshot, input, parameters, result, trace; the workspace's own choices go in `configuration`) and reads it back. What the page shows is what the file holds.
4. `AnalysisView.tsx` shows a stored analysis: ranking table, ECharts charts (`charts/`), and every trace step as a table (`TraceTables.tsx`); every cell opens "How was this calculated?". MARCOS and Fuzzy MARCOS also get the Explain tab (`../explain`). The results page only reads stored analyses and never runs anything.

UI code does not calculate method results. `resultData.ts` only selects and joins values of the stored result and trace (for fuzzy cells in charts it picks the modal value `m`).

## Sensitivity (P1.15)

`SensitivityPanel.tsx` is step 8 of the MARCOS workspace and the whole `/analysis/sensitivity` screen (`SensitivityPage.tsx`, which picks a stored MARCOS analysis). It works on the input stored with the analysis and needs crisp weights.

- Sliders move one weight with the engine's `setWeight` (`@mateo/engine`, proportional or equal redistribution), so the weights always sum to 1. After each move the method runs in the worker and the ranking list reorders with a transition (none under reduced motion).
- The one-at-a-time chart (`sweepCriterion` in `sensitivity.ts`) runs the method at 11 weights of one criterion; every plotted rank is an engine run. It is drawn on request because it is 11 runs.
- Named scenarios (weights and the ranking they gave) are saved in the project settings under `sensitivity.scenarios.<datasetId>`, so they travel with the project file. Runs made for sliders and the chart are not stored as analyses.

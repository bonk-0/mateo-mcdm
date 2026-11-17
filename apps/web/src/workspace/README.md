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

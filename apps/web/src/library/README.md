# Method Library (P1.17)

| Route                  | Screen                                                                    |
| ---------------------- | ------------------------------------------------------------------------- |
| `/learn/library`       | Cards of the Phase 1 methods (`LibraryIndexPage.tsx`)                     |
| `/learn/library/:page` | One method: MARCOS, Fuzzy MARCOS, CRITIC, MEREC, SWARA (`MethodPage.tsx`) |

The page template is the one in `docs/phases/phase-1.md`: introduction, purpose, inputs, supported number types, steps and formulas, animated example, sample data, properties and edge cases, references, related methods. SWARA has two variants (SWARA and IMF SWARA) on one page.

## Where the content comes from

- **Prose** (introduction, purpose, inputs, number types, notes) is in the `library` catalog (`packages/i18n/src/catalogs/{en,tr}/library.json`), written from `docs/methods/*.md`. `methods.ts` lists which entries each page shows and holds the references.
- **Steps and formulas** are not written by hand. `MethodPage.tsx` runs the reference example through the real method and reads each step's name, explanation and formulas from the calculation trace, so a page cannot disagree with the implementation. Step texts are the engine's own English and Turkish messages.
- **The reference example** is the P1.4 fixture of the method (`REFERENCE_FIXTURES` in `@mateo/methods`), run on every visit by `runSample` (`samples.ts`).
- **The animated example** is `explanationOf(trace)` from the Explain panel. Methods without an explain sequence show the trace tables instead; when P1.14 registers the weighting sequences in `@mateo/explain`, their pages switch to the player with no change here.
- **References** are data and are never translated. `library.test.ts` checks that every DOI also appears in the method's `docs/methods` page, that the source of the example is cited, and that the first reference is the one P1.4 names.

## Sample data

`samples.ts` turns a fixture into three things: the engine input of the reference run, a `Dataset` for the project, and a CSV file. The CSV of a matrix sample imports in the Data Center (directions in the header, weights in a row the importer reports); the SWARA CSV lists the criteria in order with the experts' assessment.

"Open in workspace with sample data" (`SampleActions.tsx`) adds the dataset to the open project under a fixed id (`sample-<id>`, so a second click reuses it) and navigates to the workspace with `?sample=<id>&dataset=<datasetId>`:

- `WorkspaceGate` selects the decision problem named by `dataset`.
- `WeightingPage` and `MarcosPage` read the preset (`preset.ts`) and fill in the method, SWARA assessments, and the weights of the paper. Fuzzy MARCOS needs triangular fuzzy weights that no Phase 1 weighting method produces, so it gets a read-only "Weights of the method library sample" source, stored as `{ source: 'sample' }` with the analysis.

`test/library.test.tsx` opens the MARCOS, SWARA and Fuzzy MARCOS samples through the real pages and compares the stored result with the printed one.

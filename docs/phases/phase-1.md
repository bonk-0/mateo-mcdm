# Phase 1 — Foundation and MARCOS

**Goal:** a first usable release of Mateo. A user can import an Excel/CSV decision matrix, compute weights with CRITIC, MEREC or SWARA, rank alternatives with MARCOS or Fuzzy MARCOS (TFN), watch every step animated, test weight sensitivity, and export all tables to Excel, in Turkish or English, fully offline.

> **Changed after delivery: Mateo is a web app.** Phase 1 was built with a Tauri desktop shell around the web UI (P1.7), a Tauri SQL storage adapter (P1.8) and desktop installers (P1.18). These were removed when the product was settled as a web app (`docs/plan.md` §1 and §4.1, `docs/phases/README.md`, Plan changes). The sections below describe the web form; the Tauri parts are noted where they were delivered.

See [README.md](README.md) for the working rules that apply to every sub-phase.

---

## P1.1 — Monorepo, tooling and CI

**Goal:** an empty but complete workspace that every later sub-phase builds on.

**Scope**
- pnpm workspace with the layout from `docs/plan.md` §4: `apps/web`, `packages/{engine,fuzzy,methods,io,project,explain,i18n,ui}` (and `apps/desktop` until the web app change). Packages contain only an `index.ts` placeholder and a smoke test.
- TypeScript strict config shared across packages, path aliases.
- ESLint + Prettier with a shared config; rule forbidding imports from UI packages inside `engine`, `fuzzy`, `methods`, `io`, `project`.
- Vitest configured for all packages.
- GitHub Actions CI: install, type check, lint, test on pull requests and `main`.
- `CONTRIBUTING.md` with branch, commit and PR conventions.
- Node and pnpm versions pinned (`.nvmrc`, `packageManager` field).

**Out of scope:** React app content, the app shell (P1.7), any engine logic.

**Depends on:** —

**Deliverables:** workspace skeleton, shared configs, CI workflow, `CONTRIBUTING.md`.

**Done when**
- `pnpm install && pnpm typecheck && pnpm lint && pnpm test` pass locally and in CI.
- A deliberate import of a UI package from `packages/engine` fails lint.
- CI runs on a test PR and reports green.

---

## P1.2 — Engine core and step trace

**Goal:** the shared types and contracts every method implements.

**Scope**
- Core types: `Criterion` (id, name key or label, direction benefit/cost, unit, number type), `Alternative`, `DecisionMatrix<T>` generic over cell value type, `WeightVector`.
- `Method` interface from `docs/plan.md` §6.1: `id`, `version`, `category`, `supportedNumberTypes`, `inputSchema`, `parameters` with defaults, `validate`, `run`, `references`.
- `ValidationResult` with separate errors and warnings, each with a machine code, i18n key and location (row/column).
- Step trace model (§6.2): step id, name key, LaTeX formula with named terms, inputs, output table/vector, per-cell derivation records (operands, operation, result), explanation key, visualization hint.
- `TraceBuilder` helper that makes recording derivations cheap for method authors.
- Shared crisp helpers: linear, vector and max/min normalization variants, sum/product reductions, ranking with tie handling.
- Method registry: register, list, look up by id.
- Determinism guard: tests that `run` produces identical output on repeated calls.

**Out of scope:** fuzzy numbers (P1.3), concrete methods (P1.5, P1.6).

**Depends on:** P1.1

**Deliverables:** `packages/engine` with types, trace builder, helpers, registry, unit tests; a toy "weighted sum" method used only in tests to exercise the contract.

**Done when**
- The toy method produces a trace where every output cell has a derivation.
- Validation results distinguish errors from warnings with stable codes.
- Test coverage of `packages/engine` is at least 90 % lines.

---

## P1.3 — Fuzzy TFN package and linguistic scales

**Goal:** triangular fuzzy numbers usable by any method, plus linguistic scales.

**Scope**
- `TFN` type `(l, m, u)` with validation `l ≤ m ≤ u`.
- Arithmetic: add, subtract, multiply, divide (standard approximate TFN arithmetic), scalar operations, min/max helpers. Each operation is a named, separately exported function so methods choose explicitly.
- Defuzzification functions as separate named exports: graded mean `(l + 4m + u) / 6`, centroid `(l + m + u) / 3`, and any other one required by Fuzzy MARCOS or fuzzy SWARA (decided with P1.4 fixtures).
- Aggregation helpers: arithmetic mean, geometric mean, min/mean/max.
- Trace integration: fuzzy cells render as triples in derivation records.
- Linguistic scale model: ordered terms with id, i18n label key, abbreviation and TFN. Predefined 5-level and 7-level scales, plus the scales used in the Fuzzy MARCOS and fuzzy SWARA reference papers.
- Conversion: linguistic term → TFN, with validation for unknown terms.

**Out of scope:** trapezoidal and advanced sets (Phase 3–4), scale editor UI (P1.11).

**Depends on:** P1.2

**Deliverables:** `packages/fuzzy` with tests.

**Done when**
- Property tests: operations on degenerate TFNs `(x, x, x)` equal crisp results.
- Every arithmetic and defuzzification function has unit tests with hand-checked values.
- Predefined scales validate and are monotonic.

---

## P1.4 — Phase 1 references and test fixtures

**Goal:** verified sources and machine-readable worked examples for every Phase 1 method.

**Scope**
- Verify the citations in `docs/plan.md` §7 for MARCOS, Fuzzy MARCOS, CRITIC, MEREC and SWARA (and the fuzzy SWARA variant chosen) against the actual papers: authors, year, journal, volume, pages, DOI.
- For each method, record the exact formulation used: equations, normalization, defuzzification, any tie or edge-case rules.
- Extract each paper's worked example into `packages/methods/<method>/fixtures/*.json`: inputs, parameters, every intermediate table printed in the paper, final results, and the precision the paper rounds to.
- Document known errata or rounding deviations in the paper.
- Fix any wrong citation in `docs/plan.md`.

**Out of scope:** implementing the methods.

**Depends on:** P1.1

**Deliverables:** `docs/methods/<method>.md` per method (formulation summary + reference + DOI), fixture JSON files, corrected `docs/plan.md` §7.

**Done when**
- Every Phase 1 method has a verified reference with DOI (or a stable identifier where no DOI exists).
- Every fixture contains at least the input and the final result; intermediate tables are included wherever the paper prints them.
- If a source cannot be accessed, the PR states it clearly and proposes an alternative widely cited source with an accessible worked example.

---

## P1.5 — CRITIC, MEREC and SWARA

**Goal:** three weighting methods with full traces and golden tests.

**Scope**
- CRITIC (classical).
- MEREC (classical).
- SWARA (classical, with expert-provided comparative importance), and fuzzy SWARA (TFN) as defined in P1.4.
- Each method: input schema, parameters, validation (for example zero/negative values where logs are taken in MEREC, constant columns in CRITIC), `run` with trace for every step in the reference.
- Method metadata: category, supported number types, references, i18n keys for step names and explanations with English and Turkish text (if P1.7 is not merged yet, keep the texts in a method-local catalog that P1.7 will pick up).

**Out of scope:** UI, explain animations.

**Depends on:** P1.3, P1.4

**Deliverables:** `packages/methods/{critic,merec,swara}` with golden and property tests.

**Done when**
- Golden tests reproduce each fixture's intermediate and final values within the paper's stated precision.
- Property tests: weights are non-negative and sum to 1 (within 1e-12); results do not depend on alternative order.
- Validation tests cover each documented edge case.

---

## P1.6 — MARCOS and Fuzzy MARCOS

**Goal:** the flagship ranking method in classical and TFN form.

**Scope**
- MARCOS: extended matrix with anti-ideal (AAI) and ideal (AI) rows, normalization for benefit and cost criteria, weighted matrix, S_i, utility degrees K⁻ and K⁺, utility functions f(K⁻), f(K⁺), final utility f(K), ranking.
- Fuzzy MARCOS (TFN) exactly as in its reference: fuzzy extended matrix, fuzzy normalization, weighted fuzzy matrix, fuzzy utility degrees, defuzzification step, utility functions, ranking.
- Accepts weights as crisp vector or TFN vector as the reference allows.
- Trace steps named and ordered to match `docs/plan.md` §8.3 so Explain mode can map them directly.
- Validation: missing weights, weights not summing to 1 (warning with normalization option), zero denominators.

**Out of scope:** trapezoidal MARCOS (Phase 3), UI.

**Depends on:** P1.3, P1.4

**Deliverables:** `packages/methods/marcos` and `packages/methods/fuzzy-marcos` with tests.

**Done when**
- Golden tests reproduce both reference examples (all intermediate tables printed in the papers) within stated precision.
- Every output cell of every step has a derivation record.
- A test confirms that Fuzzy MARCOS with degenerate TFNs agrees with classical MARCOS on ranking, or documents why the reference formulation does not guarantee it.

---

## P1.7 — App shell and i18n

**Goal:** the running application frame in TR and EN, in the browser.

**Scope**
- `apps/web`: React + Vite, Tailwind, shadcn/ui base components, routing, sidebar navigation per `docs/plan.md` §12 (only Phase 1 items visible), Home screen placeholder, Settings screen.
- Light and dark themes with design tokens per §14; tabular numerals.
- `packages/i18n`: i18next with ICU, `en` and `tr` catalogs, namespaced keys, language switcher, persisted preference, default from OS.
- Number/date formatting helpers using `Intl`; separate settings for UI language, display number format and import number format (§11).
- CI script that fails on missing or unused keys between `en` and `tr`.
- File commands (New, Open, Save, Save As, Recent) in the app's own project menu. *(Delivered with a Tauri 2 desktop wrapper, native menu and `.mateo` file associations; removed with the web app change.)*
- Accessibility baseline: keyboard focus styles, landmark roles, reduced-motion detection hook.

**Out of scope:** feature screens.

**Depends on:** P1.1

**Deliverables:** runnable web app (`pnpm dev`), i18n package and CI check.

**Done when**
- The app starts in the browser and switches TR/EN at runtime with no untranslated strings.
- Missing-key check fails CI when a key is removed from `tr`.
- Lighthouse accessibility score ≥ 90 on the shell in the browser build.

---

## P1.8 — Project file format and storage

**Goal:** projects saved as a single portable `.mateo` file.

**Scope**
- SQLite schema: project info, criteria, alternatives, matrices (crisp and TFN cells), linguistic scales, imported source files (blobs) and import profiles, analyses (method id, version, parameters, inputs snapshot id, trace, results, warnings, timestamps), settings.
- Storage adapter interface, implemented with SQLite WASM and OPFS/IndexedDB persistence in the browser. *(Delivered with a second, Tauri SQL plugin adapter; removed with the web app change.)*
- Schema versioning and migrations from day one.
- Immutable snapshots of model state referenced by analyses (basis for reproducibility and later versioning).
- Repository API used by the UI: create/open/save/close, autosave hook, recent projects list.
- Undo/redo command model for model edits (consumed by P1.11).

**Out of scope:** version compare/restore UI (P3.10).

**Depends on:** P1.2

**Deliverables:** `packages/project` with both adapters and tests.

**Done when**
- Round-trip test: create a project with crisp and TFN data and an analysis, save, reopen, and get deep-equal data.
- A migration test upgrades a v1 fixture file to the current schema.
- Opening a file written by a newer schema version shows a clear error instead of corrupting it.

---

## P1.9 — Import engine (headless)

**Goal:** turn Excel/CSV files into validated Mateo models without any UI.

**Scope**
- Readers: XLSX, XLS, XLSM (cached values only, no macros or formula evaluation) via SheetJS; CSV/TSV via Papa Parse with delimiter detection (comma, semicolon, tab).
- Encoding handling with UTF-8 default and detection of common Turkish encodings (Windows-1254).
- Locale-aware number parsing: decimal comma/point and thousands separators, with detection from samples and an explicit override.
- Structure detection: header row, data range, alternative id column, criterion columns, direction row if present (benefit/cost, max/min, fayda/maliyet), TFN triplet columns (`C1_l, C1_m, C1_u` and similar patterns), linguistic text cells matched against a scale.
- Validation: missing values, invalid numbers, TFN ordering, duplicate alternatives/criteria, inconsistent dimensions; errors vs warnings.
- Import profile model: saved mapping that can be re-applied to similar files.
- Output: a proposed model plus a list of detected structure decisions the UI can show and change.

**Out of scope:** wizard UI (P1.10), group/multi-expert sheets (P3.4), export (P1.16).

**Depends on:** P1.3

**Deliverables:** `packages/io` import side with a fixture library of real-world-like files (TR and EN locales, messy headers, fuzzy layouts).

**Done when**
- At least 20 fixture files import with the expected detected structure.
- `1.234,56` and `1,234.56` both parse correctly under their locales, and ambiguous samples are reported as ambiguous instead of guessed.
- No fixture produces an invented value; every missing cell is reported.

---

## P1.10 — Data Center and import wizard UI

**Goal:** users import their spreadsheets in a few clicks.

**Scope**
- Data Center screen: datasets in the project, original files, import history.
- Wizard steps from `base-plan.md` §6.4: upload, sheet selection, detected structure, column mapping, data types, missing values, validation, preview, confirm.
- Side-by-side detected locale and sample values with override.
- Errors block confirm; warnings are listed and stored with the dataset.
- Save and apply import profiles.
- Paste-from-clipboard import of a copied Excel range.

**Out of scope:** export UI (P1.16).

**Depends on:** P1.7, P1.8, P1.9

**Deliverables:** Data Center route, wizard components, Playwright tests.

**Done when**
- E2E test: import a TR-locale XLSX and an EN-locale CSV with a TFN layout, reaching an editable model.
- Every wizard string is translated in TR and EN.
- The original file is stored in the project and listed in the Data Center.

---

## P1.11 — Decision matrix editor and model management

**Goal:** spreadsheet-like editing of the decision model.

**Scope**
- AG Grid based matrix editor for crisp and TFN cells (TFN editor with three inputs and inline validation), linguistic cells via scale dropdown.
- Criteria panel: name, id, description, direction, unit, number type, linguistic scale.
- Alternatives panel: id, name, description, group.
- Editing features: multi-select, copy/paste including direct Excel paste, insert/delete rows and columns, drag reorder, sort, filter, search, freeze headers, bulk edit, undo/redo (P1.8 command model), autosave.
- Linguistic scale manager: choose predefined scales, create/edit custom scales, live membership function preview (simple static chart; interactive playground is P1.14).
- Live validation badges on invalid cells.

**Out of scope:** running methods (P1.12).

**Depends on:** P1.7, P1.8, P1.3

**Deliverables:** editor route, components, unit and E2E tests.

**Done when**
- E2E: paste a 10×6 range from a spreadsheet, edit, undo, redo, save, reopen with no data loss.
- TFN cells with `l > m` are rejected with a translated message.
- Editor stays responsive (< 100 ms per edit) with a 500×50 matrix.

---

## P1.12 — Method workspaces and results

**Goal:** run Phase 1 methods from the UI and read the results.

**Scope**
- Weighting workspace (shared for CRITIC, MEREC, SWARA): pick method, provide extra inputs (SWARA comparative importance, expert TFN judgements for fuzzy SWARA), run, show weights and intermediate tables.
- MARCOS workspace layout per `base-plan.md` §12.3: overview, input data, criteria configuration, weighting configuration (manual weights or a weighting analysis result), fuzzy model selection (classical/TFN), calculation, intermediate tables, final ranking.
- One-click hybrid flow: "use these weights in MARCOS".
- Analyses saved to the project with full input snapshot, parameters, trace and results.
- Results view: ranking table, bar chart of final utility, weights chart, utility function chart, criterion contribution heatmap (ECharts).
- Engine runs in a Web Worker.

**Out of scope:** animations (P1.13), sensitivity (P1.15), export (P1.16).

**Depends on:** P1.5, P1.6, P1.11

**Deliverables:** workspace routes, results components, worker wiring, E2E tests.

**Done when**
- E2E: import → CRITIC → MARCOS → ranking matches the engine's golden output for a fixture.
- Re-opening the project shows the stored analysis without recomputing.
- All intermediate tables in the trace are viewable.

---

## P1.13 — Explain mode framework and MARCOS sequence

**Goal:** the animated explanation system, fully applied to MARCOS and Fuzzy MARCOS.

**Scope**
- `packages/explain`: converts a method trace into a timeline of scenes (matrix scene, formula scene, vector/chart scene) with no arithmetic of its own.
- Player: play, pause, step back/forward, scrub, speed, jump to step, show/hide formula, numeric substitution and explanation.
- Linked highlighting between KaTeX formula terms and matrix cells.
- Cell flights between consecutive matrices (initial → extended → normalized → weighted).
- "How was this calculated?" derivation popover for any result cell, available in the normal results view too.
- Story view for the final ranking (top drivers, gap to runner-up).
- Reduced-motion and "static steps" mode; focused view for large matrices.
- Full MARCOS and Fuzzy MARCOS sequences per `docs/plan.md` §8.3, TR and EN explanation texts.

**Out of scope:** weighting method sequences and fuzzy playground (P1.14).

**Depends on:** P1.12

**Deliverables:** explain package, player components, MARCOS sequences, tests.

**Done when**
- A test asserts every number shown in the MARCOS timeline equals a value in the engine trace.
- Player is fully keyboard operable; reduced-motion mode shows static steps.
- Timeline runs at 60 fps on a 10×8 matrix on a mid-range laptop (measured with the performance panel, noted in the PR).

---

## P1.14 — Explain for weighting methods and TFN visualization

**Goal:** every Phase 1 method has an animated explanation, and TFNs are visual.

**Scope**
- Explain sequences for CRITIC (standard deviation, correlation, information content), MEREC (removal effect), SWARA and fuzzy SWARA (comparative importance chain).
- TFN visualization component: membership triangles, linguistic scale overlay.
- Basic fuzzy playground: drag TFN points, see arithmetic results and defuzzified values update, all computed by `packages/fuzzy`.
- Fuzzy MARCOS timeline uses the TFN component for fuzzy cells.

**Out of scope:** trapezoidal and advanced sets.

**Depends on:** P1.13

**Deliverables:** sequences, TFN components, Fuzzy Playground route.

**Done when**
- Each Phase 1 weighting method has a complete sequence covering every trace step.
- Same number-provenance test as P1.13 passes for each sequence.

---

## P1.15 — Basic sensitivity analysis

**Goal:** users see how weights change the MARCOS ranking.

**Scope**
- Weight sliders with automatic re-normalization (method selectable: proportional redistribution of the remaining weight).
- Live re-ranking with animated reordering.
- One-at-a-time scenarios: vary one criterion's weight over a range, chart of ranks vs weight.
- Save named scenarios in the project.

**Out of scope:** critical weight analysis, multi-scenario comparison, stability indices (P2.11).

**Depends on:** P1.12

**Deliverables:** sensitivity panel in the MARCOS workspace, engine helper for weight perturbation, tests.

**Done when**
- Weights always sum to 1 after any slider move (property test).
- Rank-vs-weight chart matches engine runs at each sample point.

---

## P1.16 — XLSX and CSV export

**Goal:** every table Mateo shows can leave the app.

**Scope**
- XLSX workbook via ExcelJS: project info, original data, criteria, alternatives, fuzzy scales, weights, every intermediate table of the analysis, final results, sensitivity scenarios, method parameters, method version and reference. Sheet set depends on the method.
- CSV export of a single table, or a ZIP of all tables.
- Export in the selected language; numbers exported as numbers (not text) with full precision.
- Export of the current matrix back to XLSX/CSV.
- Round-trip test: export then import gives the same model.

**Out of scope:** PDF/DOCX reports (Phase 3).

**Depends on:** P1.12

**Deliverables:** `packages/io` export side, export UI actions.

**Done when**
- Round-trip tests pass for crisp and TFN models.
- Exported MARCOS workbook contains every trace table and opens in Excel and LibreOffice without warnings.

---

## P1.17 — Method Library (Phase 1 methods)

**Goal:** a reference page for each Phase 1 method, linked to its workspace.

**Scope**
- Method page template: introduction, purpose, inputs, supported number types, steps, formulas, animated example (Explain player on the fixture dataset), sample dataset download, references, related methods.
- Pages for MARCOS, Fuzzy MARCOS, CRITIC, MEREC, SWARA (incl. fuzzy SWARA) in TR and EN, based on `docs/methods/*.md` from P1.4.
- "Open in workspace with sample data" action.

**Out of scope:** Practice Center (P4.5).

**Depends on:** P1.13 (P1.14 for weighting animations)

**Deliverables:** Method Library route and content.

**Done when**
- Each page's formulas match the implemented formulation and its references match P1.4.
- Sample data opens in the workspace and reproduces the reference result.

---

## P1.18 — Phase 1 release hardening

**Goal:** a release candidate users can open in their browser and use offline.

**Scope**
- End-to-end test suite for the main flows (import → weight → MARCOS → explain → sensitivity → export) in TR and EN.
- Accessibility pass to WCAG 2.1 AA on all Phase 1 screens.
- Performance check with large matrices (500 alternatives × 50 criteria).
- A reproducible production web build via CI. *(Delivered as desktop installers for Windows, macOS and Linux; replaced by the web build with the web app change.)*
- Crash-safe autosave and recovery after an unexpected exit.
- User-facing release notes (TR and EN).

**Out of scope:** new features.

**Depends on:** P1.1–P1.17

**Deliverables:** the web build as a CI artifact, test reports, release notes.

**Done when**
- Phase 1 exit criteria below all pass.

---

## Phase 1 exit criteria

- All Phase 1 golden tests pass against verified references.
- A new user can go from an Excel file to an exported MARCOS result in under five minutes without documentation (checked with at least one person outside the project).
- The full flow works offline in TR and EN.
- No untranslated strings, no failing accessibility checks at AA level.
- The production web build passes the end-to-end suite in CI, offline use included.

# Mateo — Product and Technical Plan

**Status:** Draft v1 (supersedes `base-plan.md` where they differ)
**Product name:** Mateo
**Product type:** Local-first desktop application for classical and fuzzy multi-criteria decision making (MCDM)

`base-plan.md` remains the idea foundation. This document turns it into decisions: scope per phase, architecture, technology, method formulations, and resolutions of the open points in the base plan.

---

## 1. Decisions at a glance

| Topic | Decision |
|---|---|
| Name | **Mateo**. "Fuzzy Decision Studio" is not used anywhere. |
| Usage model | **Local, single user.** No accounts, no server, no cloud storage. Works fully offline. |
| Distribution | Desktop app (Windows, macOS, Linux) built with Tauri. The same UI also runs as a browser build for development and demos. |
| Calculation engine | **TypeScript, running in the app itself.** Instant recalculation, live animations and offline use without a backend. |
| Project storage | One project = one `.mateo` file (an SQLite database) that the user saves wherever they like. |
| UI languages | **Turkish and English** at launch, built on an i18n layer that makes adding more languages a translation task, not a code change. |
| Method formulations | The original, most widely cited paper for each method (see §7). Every method ships with golden tests reproducing that paper's worked example. |
| Animations | A first-class "Explain" mode designed to engage, driven only by real engine output (see §8). |
| First release | MARCOS (classical + TFN fuzzy), CRITIC, MEREC, SWARA, Excel/CSV import, matrix editor, Explain mode for all of them, basic sensitivity analysis, Excel export. |

---

## 2. Product vision

Mateo is one environment where a researcher, analyst or student can bring an existing Excel/CSV dataset, build a decision model, run classical and fuzzy MCDM methods, see exactly how every number was produced, compare and stress-test results, and export research-ready outputs.

MARCOS and Fuzzy MARCOS are the flagship methods and get the richest workspace. All other methods plug into the same data model, engine and visualization system.

**Principles**

1. Correct first. Every method is tested against published worked examples.
2. No invented data. Missing or invalid values are flagged, never silently filled.
3. Every number is explainable. Any result cell can be traced back to its inputs and formula.
4. Minimum friction. Import existing spreadsheets instead of retyping them.
5. Learning is built in, not bolted on. Explanations live inside the normal workflow.
6. Reproducible. The same file, method version and parameters always give the same result.

**Target users:** academics, researchers, engineers, decision and risk analysts, students and educators.

---

## 3. Scope and phases

The full scope of `base-plan.md` remains the long-term target. It is delivered in phases so that each release is usable and fully tested on its own.

### Phase 1 — Foundation and MARCOS (first release)

- App shell, navigation, TR/EN i18n, light and dark themes.
- Project files (`.mateo`): create, open, save, recent projects, autosave.
- Data Center: Excel (XLSX, XLS, XLSM data only) and CSV/TSV import wizard with structure detection, locale-aware number parsing, validation and preview. Reusable import profiles.
- Decision Matrix Editor (classical and TFN cells), criteria and alternatives management, benefit/cost directions.
- Linguistic scale manager with predefined and custom TFN scales and membership function previews.
- Engine core: crisp and TFN arithmetic, normalization, defuzzification, step trace.
- Weighting: **CRITIC, MEREC, SWARA** (classical; SWARA also with a TFN variant).
- Ranking: **MARCOS** and **Fuzzy MARCOS (TFN)**.
- Simple hybrid flow: weighting result → MARCOS in one click.
- Explain mode for every Phase 1 method, including the full MARCOS sequence.
- Results view: ranking, utility functions, weights, charts.
- Sensitivity analysis: weight sliders with live re-ranking, one-at-a-time weight scenarios.
- Export: XLSX workbook with all intermediate tables, CSV (ZIP for multiple tables).
- Method Library pages for Phase 1 methods.

### Phase 2 — Method ecosystem

- Weighting: **LOPCOW, FUCOM, BWM**.
- **DEMATEL** workspace (classical and fuzzy), including DEMATEL-derived weights.
- Ranking: **VIKOR, EDAS, CODAS, WASPAS, COPRAS, MOORA, ARAS** (classical and TFN variants).
- Hybrid MCDM Builder with a visual pipeline and compatibility checks.
- Method Comparison: Spearman's rho, Kendall's tau, rank agreement, rank reversal checks.
- Full sensitivity analysis: scenario sets, critical weight analysis, rank stability.
- Calculation audit view and analysis history.

### Phase 3 — Groups, risk and reporting

- Group Decision Making: experts, expert weights, aggregation of individual matrices, multi-sheet import.
- Trapezoidal fuzzy numbers across the engine and supported methods.
- Risk Assessment: **FMEA** and **Fine-Kinney** (classical and fuzzy variants).
- Batch Analysis.
- Reports: PDF and DOCX academic reports in the selected language.
- Project versioning: compare versions and restore.

### Phase 4 — Advanced fuzzy sets and learning

- Intuitionistic fuzzy sets, interval type-2 fuzzy sets, neutrosophic sets, method by method where a widely accepted formulation exists.
- Practice Center (guided exercises, see §10).
- Additional UI languages.

---

## 4. Architecture

Mateo is a local-first application. All computation, storage and rendering happen on the user's machine.

```
mateo/
├── apps/
│   ├── desktop/        Tauri shell (file dialogs, native menus, file associations)
│   └── web/            React UI (also runs standalone in a browser for dev/demo)
├── packages/
│   ├── engine/         Pure TypeScript calculation engine, no UI dependencies
│   ├── fuzzy/          Fuzzy number types and arithmetic (TFN, later trapezoidal etc.)
│   ├── methods/        One folder per method, each with formulation, trace, tests
│   ├── io/             Excel/CSV import and export, structure detection, locale parsing
│   ├── project/        .mateo file format, schema, migrations, history
│   ├── explain/        Turns engine traces into animation timelines
│   ├── i18n/           Translation catalogs and formatting helpers
│   └── ui/             Shared components (grid, charts, formula renderer)
└── docs/
```

**Key rules**

- The engine is pure: data in, result plus step trace out. No I/O, no randomness, no clock.
- Every method is a module implementing one interface (§6). Adding a method never touches the UI shell.
- Heavy work (batch runs, large sensitivity sweeps) runs in Web Workers so the UI stays responsive and can be cancelled.
- The UI never computes numbers itself. Charts, tables and animations only display engine output.

---

## 5. Technology choices

| Concern | Choice | Why |
|---|---|---|
| Language | TypeScript (strict) | One language for engine and UI; the engine can run in the browser and in workers. |
| Desktop shell | Tauri 2 | Small installers, native file dialogs, works offline. |
| UI | React + Vite | Mature ecosystem; Next.js adds server features a local app does not need. |
| Styling and components | Tailwind CSS + Radix-based components (shadcn/ui) | Accessible primitives, consistent design system. |
| Spreadsheet grid | AG Grid Community | Copy/paste from Excel, large data, frozen rows/columns, custom cell editors for fuzzy cells. |
| Charts | Apache ECharts | Rich chart types, good tooltips and export. |
| Network/causal diagrams | ECharts graph or React Flow | DEMATEL cause–effect maps and the Hybrid Builder pipeline. |
| Animation | Motion (Framer Motion) + SVG | Declarative, timeline-friendly, honours reduced-motion settings. |
| Formulas | KaTeX | Fast LaTeX rendering with highlighting of individual terms. |
| Excel/CSV reading | SheetJS (reading XLSX/XLS/XLSM) + Papa Parse (CSV/TSV) | Broad format coverage, no macro execution. |
| Excel writing | ExcelJS | Styled, multi-sheet workbooks. |
| DOCX / PDF reports | `docx` library; PDF from a print-ready HTML report | Same report template feeds both outputs. |
| Optimization (BWM, FUCOM) | HiGHS compiled to WebAssembly | Reliable LP/QP solver that runs locally. |
| Storage | SQLite (`.mateo` file) via Tauri SQL plugin; SQLite WASM in the browser build | Single portable file, transactional, supports history. |
| i18n | i18next with ICU message format; `Intl` for numbers and dates | Plurals, interpolation, locale-aware formatting. |
| Testing | Vitest (unit, golden tests), Playwright (end-to-end) | Fast, TypeScript-native. |
| State | Zustand + immutable project snapshots | Simple, works with undo/redo. |

Numbers are IEEE 754 doubles, stored at full precision. Display precision is a user setting and never affects stored values.

---

## 6. Calculation engine

### 6.1 Method interface

Every method implements the same contract:

- `id`, `version`, `category` (weighting, ranking, relationship, risk).
- `supportedNumberTypes` (crisp, TFN, ...).
- `inputSchema`: what it needs (decision matrix, directions, weights, expert judgements, pairwise comparisons...).
- `parameters`: method options with defaults (for example WASPAS λ, VIKOR v).
- `validate(input)`: returns errors and warnings.
- `run(input, params)`: returns `{ result, trace }`.
- `references`: verified citations for the formulation used.

### 6.2 Step trace

Each run produces an ordered trace that powers Explain mode, the audit view and the reports:

- Step id and localized name key.
- Formula (LaTeX) with named terms.
- Inputs consumed, with references to the cells they came from.
- Per-cell derivations: for any output cell, the exact operands and the operation.
- Output table or vector.
- Explanation key (localized text).
- Visualization hints (which chart or matrix layout fits the step).

Because the trace records per-cell provenance, any result cell in the UI can show "how was this calculated?" without recomputing anything.

### 6.3 Fuzzy layer

- TFN in Phase 1; trapezoidal in Phase 3; advanced sets in Phase 4.
- Each method declares its own fuzzy arithmetic choices, normalization and defuzzification. Nothing is shared by assumption. For example Fuzzy MARCOS uses the operations and defuzzification of its source paper, not a global default.
- Fuzzy number validity (l ≤ m ≤ u) is enforced on input.

### 6.4 Compatibility rules

Each method declares its inputs and outputs, so the Hybrid Builder and Batch Analysis can check combinations automatically, for example that a weighting method's output can feed a ranking method's weights, or that a crisp-only method is not given fuzzy data without an explicit defuzzification step.

### 6.5 Testing

- Golden tests: each method reproduces the worked example of its reference paper within a stated tolerance. If a paper's printed example contains rounding or typos, the test documents the deviation.
- Property tests: weights sum to 1, rankings are invariant to row order, benefit/cost handling is consistent.
- Round-trip tests for import and export.

---

## 7. Method formulations

The plan uses each method's original and most widely cited formulation. Citations below must be checked against the actual papers before they appear in the app or in reports, and the golden test for each method is written from that paper's worked example.

The Phase 1 rows were verified in P1.4 and the Phase 2 rows in P2.1; formulations, worked examples, errata, the reasons for any substitute example and the fuzzy-variant decisions are in [`docs/methods/`](methods/fixtures.md). Where an original paper is paywalled or not online, the row names the open-access source the formulation and example were taken from. The other rows are still unverified and are checked in their phase's references sub-phase.

| Method | Reference formulation |
|---|---|
| MARCOS | Stević, Pamučar, Puška, Chatterjee (2020), *Computers & Industrial Engineering* 140, 106231, doi:10.1016/j.cie.2019.106231 (paywalled; worked example from Damjanović, Stević et al. (2022), *Facta Universitatis, Series: Mechanical Engineering* 20(1), 177–197, doi:10.22190/FUME220215012D) |
| Fuzzy MARCOS (TFN) | Stanković, Stević, Das, Subotić, Pamučar (2020), *Mathematics* 8(3), 457, doi:10.3390/math8030457 |
| CRITIC | Diakoulaki, Mavrotas, Papayannakis (1995), *Computers & Operations Research* 22(7), 763–770, doi:10.1016/0305-0548(94)00059-H |
| MEREC | Keshavarz-Ghorabaee, Amiri, Zavadskas, Turskis, Antucheviciene (2021), *Symmetry* 13(4), 525, doi:10.3390/sym13040525 |
| LOPCOW | Ecer, Pamučar (2022), *Omega* 112, 102690, doi:10.1016/j.omega.2022.102690 (paywalled; formulation and example from Biswas, Pamučar, Dawn, Simic (2024), *Decision Making Advances* 2(1), 1–21, doi:10.31181/dma21202419). No fuzzy variant in Phase 2 |
| SWARA | Keršulienė, Zavadskas, Turskis (2010), *Journal of Business Economics and Management* 11(2), 243–258, doi:10.3846/jbem.2010.12 |
| Fuzzy SWARA (TFN) | IMF SWARA: Vrtagić, Softić, Subotić, Stević, Dordevic, Ponjavic (2021), *Axioms* 10(2), 92, doi:10.3390/axioms10020092 (chosen over the Chang-scale variant, see `docs/methods/swara.md`) |
| FUCOM | Pamučar, Stević, Sremac (2018), *Symmetry* 10(9), 393, doi:10.3390/sym10090393. Fuzzy FUCOM deferred (no reproducible example) |
| BWM | Rezaei (2015), *Omega* 53, 49–57, doi:10.1016/j.omega.2014.11.009; linear model: Rezaei (2016), *Omega* 64, 126–130, doi:10.1016/j.omega.2015.12.001 (both paywalled; example from the author's slides at bestworstmethod.com). Fuzzy BWM (Guo, Zhao 2017) deferred: paywalled |
| DEMATEL | Gabus, Fontela (1972/1973), Battelle Geneva Research Centre (not online; formulation and example from Chen, Tzeng, Huang (2018), *Technological and Economic Development of Economy* 24(2), 600–614, doi:10.3846/20294913.2016.1216471). Fuzzy: Lin, Wu (2008), *Expert Systems with Applications* 34(1), 205–213, doi:10.1016/j.eswa.2006.08.012 (paywalled, no golden test yet; see `docs/methods/dematel.md`) |
| VIKOR | Opricovic, Tzeng (2004), *European Journal of Operational Research* 156(2), 445–455, doi:10.1016/S0377-2217(03)00020-1 (paywalled; formulation and example from Opricovic, Tzeng (2008), *Yugoslav Journal of Operations Research* 18(2), 187–203, doi:10.2298/YUJOR0802187O). Fuzzy VIKOR (Opricovic 2011, *ESWA* 38(10)) deferred: paywalled |
| EDAS | Keshavarz Ghorabaee, Zavadskas, Olfat, Turskis (2015), *Informatica* 26(3), 435–451, doi:10.15388/Informatica.2015.57. Fuzzy: Keshavarz Ghorabaee et al. (2016), *IJCCC* 11(3), 358–371, doi:10.15837/ijccc.2016.3.2557 (trapezoidal, no fixture yet) |
| CODAS | Keshavarz Ghorabaee, Zavadskas, Turskis, Antucheviciene (2016), *Economic Computation and Economic Cybernetics Studies and Research* 50(3), 25–44 (no DOI; RePEc cys:ecocyb:v:50:y:2016:i:3:p:25-44). Fuzzy: Keshavarz Ghorabaee et al. (2017), *Journal of Business Economics and Management* 18(1), 1–19, doi:10.3846/16111699.2016.1278559 (trapezoidal, no fixture yet) |
| WASPAS | Zavadskas, Turskis, Antucheviciene, Zakarevicius (2012), *Elektronika ir Elektrotechnika* 122(6), 3–6, doi:10.5755/j01.eee.122.6.1810. Fuzzy (TFN): Turskis, Zavadskas, Antucheviciene, Kosareva (2015), *IJCCC* 10(6), 873–888, doi:10.15837/ijccc.2015.6.2078 |
| COPRAS | Zavadskas, Kaklauskas, Šarka (1994), *Technological and Economic Development of Economy* 1(3), 131–139 (not online; formulation and example from Podvezko (2011), *Engineering Economics* 22(2), 134–146, doi:10.5755/j01.ee.22.2.310). Fuzzy (TFN, defuzzify first): Yazdani, Alidoosti, Zavadskas (2011), *Economic Research* 24(4), 27–40, doi:10.1080/1331677X.2011.11517478 |
| MOORA | Brauers, Zavadskas (2006), *Control and Cybernetics* 35(2), 445–469 (no DOI; EuDML 209425). Fuzzy: Brauers, Baležentis, Baležentis (2011), *Technological and Economic Development of Economy* 17(2), 259–290, doi:10.3846/20294913.2011.580566 (no fixture yet) |
| ARAS | Zavadskas, Turskis (2010), *Technological and Economic Development of Economy* 16(2), 159–172, doi:10.3846/tede.2010.10. Fuzzy (ARAS-F): Turskis, Zavadskas (2010), *Transport* 25(4), 423–432, doi:10.3846/transport.2010.52 (no fixture yet) |
| FMEA | Classical RPN = S × O × D (MIL-STD-1629A); AIAG–VDA action priority as an optional mode |
| Fine-Kinney | Kinney, Wiruth (1976), Naval Weapons Center, based on Fine (1971) |

For fuzzy variants of the other methods (Phase 2 and later), each variant is chosen by the same rule: the most widely cited formulation with a reproducible worked example. The chosen paper is recorded in the method's module and shown in the Method Library.

---

## 8. Explain mode (animated learning)

Explain mode is how Mateo keeps users engaged. It is available in every method workspace next to the results, never as a separate product, and never blocks access to final results.

### 8.1 Experience

- **Timeline player.** Play, pause, step forward/back, scrub, speed control, jump to any step. Each step shows its formula, the live numeric substitution and the resulting table.
- **Linked highlighting.** Hovering a term in the formula highlights the matching cells in the matrix, and vice versa.
- **Cell flights.** Values visibly move from one matrix to the next (initial → extended → normalized → weighted), so the user sees where each number goes.
- **"How was this calculated?"** Clicking any result cell opens its derivation tree, built from the trace.
- **Live what-if.** Dragging a weight slider or editing a cell re-runs the engine instantly; rankings re-order with animation and changed cells pulse.
- **Fuzzy playground.** TFN and trapezoidal numbers as draggable shapes; arithmetic, aggregation and defuzzification animate on the graph.
- **Story view for results.** A short guided walkthrough of the final ranking: which criteria drove the winner, how close the runner-up is, how stable the ranking is.

### 8.2 Rules

- Every animated value comes from the engine trace. The animation layer has no arithmetic of its own.
- Animations respect the operating system's reduced-motion setting and can be turned off; a static step-by-step view is always available.
- Large matrices fall back to focused views (selected rows/columns) instead of animating everything.

### 8.3 MARCOS sequence

Initial matrix → extended matrix with ideal (AI) and anti-ideal (AAI) rows → normalization (benefit and cost) → weighted normalized matrix → sums S_i → utility degrees K_i⁻ and K_i⁺ → utility functions f(K_i⁻) and f(K_i⁺) → final utility f(K_i) → ranking. Fuzzy MARCOS adds TFN visualization and the defuzzification step of its source paper.

---

## 9. Data Center and editor

Unchanged in intent from `base-plan.md` §6–7, with these clarifications:

- **Structure detection** proposes a mapping (header row, alternative column, criterion columns, fuzzy component columns such as `C1_l, C1_m, C1_u`, expert sheets). The user always confirms before import.
- **Locale parsing** is a separate setting from the UI language. A Turkish UI can import `1,234.56` and an English UI can import `1.234,56`. The wizard shows a detected guess and sample values side by side.
- **Validation** separates errors (block the run) from warnings (allow the run, recorded in the audit).
- **Originals** are stored inside the `.mateo` file unchanged.
- **Security:** macros and formulas in uploaded files are never executed; only cached cell values are read.

---

## 10. Resolutions of open points in the base plan

| Open point | Resolution |
|---|---|
| Two product names | Only **Mateo** is used. |
| Server stack (Next.js, FastAPI, PostgreSQL, Celery, Redis, S3) | Replaced by a local-first TypeScript stack (§5). Background jobs become Web Workers; storage becomes the `.mateo` file. |
| Authentication, roles, project permissions, sharing | Not applicable to a local single-user app. Sharing means sending the `.mateo` file or an export. Security focuses on safe file handling. |
| Dashboard | Becomes the **Home** screen: recent projects, quick import, start MARCOS, recently used methods. No usage statistics. |
| DEMATEL listed both as weighting method and as module | One DEMATEL workspace. It produces cause–effect analysis and, optionally, criterion weights, which then appear as a weight source in the Hybrid Builder. |
| Batch Analysis missing from the module list | It is a module under Analysis (Phase 3). |
| "Learning Studio" and "Practice Center" undefined | Learning Studio is dropped as a separate area: its content is Explain mode inside each workspace plus the fuzzy playground. Practice Center (Phase 4) offers small exercises where the user predicts the next step's values and Mateo checks them against the engine. |
| "Accessible enough for everyone" | Keyboard navigation, screen-reader labels, sufficient contrast, reduced-motion support (WCAG 2.1 AA as the target). |
| Which fuzzy variant per method | §7 rule: most widely cited formulation with a reproducible example, recorded per method. |
| UI languages | TR and EN at launch (§11). |

---

## 11. Internationalization

- All UI text, method explanations, step names, validation messages and report text live in translation catalogs; no hard-coded strings in components.
- English is the source language; Turkish is complete at release. A CI check fails when a key is missing in any shipped language.
- Method names stay in their standard form (MARCOS, CRITIC...). Descriptive terms are translated (for example "utility degree" / "fayda derecesi").
- Formulas use the notation of the source paper in every language.
- The UI language, the number format used for display, and the number format used for import are three independent settings, each defaulting from the operating system.
- Reports are generated in the language selected at export time, independent of the UI language.

---

## 12. Navigation

Mateo is one guided path with two side areas. There is no sidebar: a top bar holds the open project (with the File commands), the steps of the path, and links to Learn and Settings.

```
Start            What are you deciding? Drop a file, start blank, or try an example.

1. Data          The decision matrix. Imported files live one level down (Data → Imported files).
2. Weights       Calculated from the data (CRITIC or MEREC), from an order of importance
                 (SWARA, numbers or words), or typed in.
3. Result        The best choice and the ranking (MARCOS, or Fuzzy MARCOS when the data or
                 the weights are fuzzy). "How was it calculated?", "What if the weights
                 change?" and Export sit under the result. Earlier calculations: Result → history.

Learn            Method Library · Fuzzy Playground
Settings         Language and formats · Appearance · Linguistic scales · About
```

Calculations run as soon as their inputs are complete; there is no Run button. A calculation is stored in the project once: asking for the same one again reads the stored analysis.

The earlier sidebar addresses (`/matrix`, `/methods/weighting`, `/analysis/marcos` and so on) redirect to their place in the path, so saved links keep working. Methods of later phases (DEMATEL, group decisions, method comparison and so on) join the path as choices inside a step, not as new top-level places.

---

## 13. Reproducibility and audit

Each analysis run stores: dataset snapshot id, method id and version, variant, number type, normalization and defuzzification choices, weight source, parameters, full trace, results, warnings, app version and timestamp. Re-running a stored analysis with the same method version must give identical results; a run with a newer method version shows any difference explicitly.

Project versioning stores immutable snapshots of the model inside the `.mateo` file so earlier states can be inspected, compared and restored.

---

## 14. Design system

Carried over from `base-plan.md` §24: calm, minimal, scientific. Light surfaces with a violet accent and a matching dark mode derived from the Aevitas palette, plus ten tone colours for charts and status. Desktop-first layout with a top bar and a three-step path (§12), dense but readable tables, tabular numerals for all numbers, and consistent motion timing shared by UI transitions and Explain mode.

---

## 15. Next steps

The detailed main phases and sub-phases are in [`docs/phases/`](phases/README.md). Each sub-phase is completed by its own thread.


1. Review this plan and adjust phases or method choices.
2. Verify the Phase 1 references (MARCOS, Fuzzy MARCOS, CRITIC, MEREC, SWARA) and extract their worked examples as test fixtures.
3. Set up the monorepo, engine package and CI.
4. Build the engine and golden tests for Phase 1 methods before the UI.
5. Build the app shell, import wizard, editor and MARCOS workspace with Explain mode.

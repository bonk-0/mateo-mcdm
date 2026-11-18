# Phase 2 — Method Ecosystem

**Goal:** Mateo covers all weighting and ranking methods of the plan, DEMATEL, hybrid models, method comparison and full sensitivity analysis, each with workspaces and animated explanations.

**Starts after:** Phase 1 exit criteria pass. See [README.md](README.md) for working rules.

---

## P2.1 — Phase 2 references and fixtures

**Goal:** verified sources and worked-example fixtures for every Phase 2 method.

**Scope**
- Verify references for LOPCOW, FUCOM, BWM (nonlinear and linear), DEMATEL, VIKOR, EDAS, CODAS, WASPAS, COPRAS, MOORA, ARAS.
- Choose the TFN variant of each method using the plan's rule (most widely cited formulation with a reproducible worked example) and verify it. Also choose the fuzzy DEMATEL formulation.
- Extract fixtures (inputs, intermediate tables, results, precision) and write `docs/methods/<method>.md`.
- Update `docs/plan.md` §7 with corrections and the chosen fuzzy variants.

**Out of scope:** implementations.

**Depends on:** Phase 1

**Deliverables:** method docs, fixtures under `packages/methods/<method>/fixtures`.

**Done when**
- Every Phase 2 method and its fuzzy variant has a verified reference and at least one fixture with input and final result.
- Methods without an accessible fuzzy worked example are listed with a proposal (defer, or alternative source).

**Fuzzy-variant decisions (agreed after P2.1).** Only WASPAS and COPRAS have a TFN worked example that reproduces from an open-access source. The later sub-phases below follow this table; the reasons are on each method's page in `docs/methods/`.

| Method | Fuzzy variant in Phase 2 |
|---|---|
| WASPAS | WASPAS-F (Turskis et al. 2015), golden test from its fixture |
| COPRAS | Yazdani et al. 2011: centroid defuzzification, then crisp COPRAS, shown as two explicit steps; golden test from its fixture |
| DEMATEL, MOORA, ARAS | Implemented from the formulas of the chosen paper and tested with property tests (crisp input gives the crisp result, l ≤ m ≤ u is preserved). Marked "not yet verified against a published example" in the Method Library until a golden test is added |
| EDAS, CODAS | Deferred to P3.2: the authors' fuzzy versions use trapezoidal numbers |
| VIKOR, BWM | Deferred: the fuzzy originals are paywalled; revisit when a reproducible source is available |
| LOPCOW, FUCOM | Deferred: fuzzy data reaches them through the Hybrid Builder's explicit defuzzification step (P2.9) |

---

## P2.2 — Optimization solver and LOPCOW, FUCOM, BWM

**Goal:** the remaining weighting methods, including those that need optimization.

**Scope**
- Integrate HiGHS (WebAssembly) behind a small `Solver` interface in `packages/engine`, running in a worker.
- LOPCOW (classical; no fuzzy variant, see the P2.1 decisions).
- FUCOM: comparative priorities, consistency (DFC), optimization model as in the reference.
- BWM: nonlinear model where solvable exactly, and the linear model (Rezaei 2016); consistency ratio / indicator per reference. The nonlinear optimum is not unique in general: report ξ*, each weight's interval over the optimal set and the interval centres, never a single solver-dependent vertex. Also the input-based consistency ratio CR^I with the thresholds of Liang et al. (2020), so the result says whether the comparisons are acceptably consistent.
- Traces include the optimization model, solver status and the reported objective value (ξ or χ).

**Out of scope:** UI (P2.7).

**Depends on:** P2.1

**Deliverables:** solver wrapper, three method packages with golden tests.

**Done when**
- Golden tests reproduce reference weights and consistency values within stated precision.
- Solver failures produce translated validation errors, not crashes.
- Solver runs fully offline.

---

## P2.3 — DEMATEL engine

**Goal:** classical and fuzzy DEMATEL with optional weight output.

**Scope**
- Direct relation matrix (single or averaged experts), normalization, total relation matrix, prominence (D + R), relation (D − R), threshold options for the cause–effect map.
- Fuzzy DEMATEL per P2.1 choice (Lin & Wu 2008 structure, centroid defuzzification by default, CFCS as an option), with property tests until a reproducible published example is found.
- Non-zero diagonal entries in the direct relation matrix produce a warning, not a silent change.
- Weight derivation from prominence (documented formula), exposed as a weighting output so it can feed ranking methods.

**Out of scope:** UI (P2.8).

**Depends on:** P2.1

**Deliverables:** `packages/methods/dematel` with golden tests.

**Done when**
- Golden tests reproduce reference total relation matrices and D ± R values.
- Matrix inversion handles near-singular input with a clear validation error.

---

## P2.4 — Ranking methods A: VIKOR, EDAS, CODAS, WASPAS

**Goal:** four ranking methods, classical and TFN.

**Scope**
- VIKOR (S, R, Q, parameter v with 0.5 as default and the Opricovic–Tzeng 2008 rule (n + 1)/(2n) as an option, acceptable advantage and stability conditions, compromise set).
- EDAS (PDA, NDA, appraisal score).
- CODAS (Euclidean and taxicab distances, threshold parameter τ). Check Table 4 of the reference against the typeset PDF before adding it to the fixture.
- WASPAS (WSM, WPM, λ parameter: fixed, optimal per alternative (Zavadskas et al. 2012) or pooled (WASPAS-F)).
- TFN variant of WASPAS (WASPAS-F) per P2.1. Fuzzy VIKOR, EDAS and CODAS are not in Phase 2 (see the P2.1 decisions).
- Traces with every intermediate table.

**Out of scope:** UI (P2.6).

**Depends on:** P2.1

**Deliverables:** four method packages with golden and property tests.

**Done when**
- Golden tests pass for classical and fuzzy fixtures.
- Ranking is invariant to alternative order (property test).

---

## P2.5 — Ranking methods B: COPRAS, MOORA, ARAS

**Goal:** the remaining ranking methods, classical and TFN.

**Scope**
- COPRAS (S⁺, S⁻, relative significance, utility degree).
- MOORA (ratio system and reference point; optionally full multiplicative form as a separate variant if the reference covers it).
- ARAS (optimal alternative row, entered by the user or defaulting to the column best, normalization, utility degree).
- Fuzzy variants per the P2.1 decisions: fuzzy COPRAS as defuzzification followed by COPRAS; fuzzy MOORA (Brauers, Baležentis, Baležentis 2011) and ARAS-F (Turskis, Zavadskas 2010) with property tests.

**Out of scope:** UI.

**Depends on:** P2.1

**Deliverables:** three method packages with tests.

**Done when**
- Same criteria as P2.4; fuzzy MOORA and ARAS-F pass their property tests instead of a golden test.

---

## P2.6 — Generic ranking workspace and explain sequences

**Goal:** every Phase 2 ranking method is usable and explained in the UI.

**Scope**
- A generic ranking workspace driven by method metadata (inputs, parameters, trace steps), reusing the MARCOS workspace components where possible.
- Parameter editors (v, τ, λ...) with translated help text.
- Explain sequences for VIKOR, EDAS, CODAS, WASPAS, COPRAS, MOORA, ARAS, and for the fuzzy variants that Phase 2 ships.
- Results view support for method-specific outputs (for example VIKOR compromise set).

**Out of scope:** comparison across methods (P2.10).

**Depends on:** P2.4, P2.5

**Deliverables:** workspace, sequences, E2E tests.

**Done when**
- Every method runs end to end from an imported dataset.
- The explain number-provenance test passes for every sequence.

---

## P2.7 — Workspaces for LOPCOW, FUCOM, BWM

**Goal:** user-friendly input and explanation for the new weighting methods.

**Scope**
- LOPCOW in the existing weighting workspace.
- FUCOM input UI: rank criteria by drag and drop, enter comparative priorities.
- BWM input UI: select best and worst, enter best-to-others and others-to-worst vectors, consistency feedback live (CR^I against its threshold, from the engine's `inputConsistency`).
- Explain sequences for all three, including a visual of the optimization result and consistency.

**Out of scope:** group/multi-expert input (P3.4).

**Depends on:** P2.2

**Deliverables:** UI components, sequences, E2E tests.

**Done when**
- A user can reproduce each reference example through the UI.
- Inconsistent BWM input shows the consistency issue before running.

---

## P2.8 — DEMATEL workspace

**Goal:** a dedicated DEMATEL analysis space.

**Scope**
- Relation matrix input (0–4 scale or linguistic for fuzzy), multi-expert averaging.
- Result tables: normalized, total relation, D, R, D + R, D − R.
- Cause–effect diagram and network graph with threshold control.
- "Use DEMATEL weights" action into ranking methods.
- Explain sequence for classical and fuzzy DEMATEL.

**Out of scope:** —

**Depends on:** P2.3

**Deliverables:** DEMATEL route, diagrams, sequence, tests.

**Done when**
- Reference example reproducible through the UI, diagram exports as PNG/SVG.

---

## P2.9 — Method compatibility model and Hybrid Builder

**Goal:** users chain methods visually and safely.

**Scope**
- Compatibility rules derived from method input/output metadata (number types, required inputs, weight outputs), with explicit defuzzification steps where needed.
- Hybrid Builder: visual pipeline (dataset → weighting → ranking), fuzzy model selection, compatibility errors explained in plain language.
- Save hybrid models in the project and re-run them.
- Animated pipeline overview linking to each method's Explain player.

**Out of scope:** batch execution of many pipelines (P3.7).

**Depends on:** P2.6, P2.7, P2.8

**Deliverables:** compatibility module in `packages/engine`, Hybrid Builder route, tests.

**Done when**
- All example combinations from `base-plan.md` §13.1 run.
- Incompatible combinations cannot be run and say why.

---

## P2.10 — Method Comparison

**Goal:** compare rankings from different methods on the same dataset.

**Scope**
- Select analyses (or run several methods at once) on one dataset.
- Ranking comparison table, Spearman's rho, Kendall's tau-b, agreement counts, rank reversal check (add/remove an alternative and re-run).
- Charts: rank comparison lines, correlation heatmap.
- UI text that distinguishes similarity from correctness.

**Out of scope:** batch scenarios (P3.7).

**Depends on:** P2.6

**Deliverables:** comparison engine helpers, route, tests.

**Done when**
- Correlations match a reference implementation (for example SciPy outputs stored as fixtures).
- Rank reversal test reports changes clearly.

---

## P2.11 — Full sensitivity analysis

**Goal:** complete weight sensitivity tools for all ranking methods.

**Scope**
- Generalize P1.15 to every ranking method.
- Multiple named weight scenarios and side-by-side comparison.
- Critical weight analysis (smallest change that alters the top rank or any rank).
- Rank stability indicators across scenarios.
- Export of scenario results.

**Depends on:** P2.6

**Deliverables:** engine helpers, sensitivity UI, tests.

**Done when**
- Critical weight results verified by brute-force tests on small matrices.

---

## P2.12 — Audit view and analysis history

**Goal:** every stored calculation is traceable and reproducible from the UI.

**Scope**
- Analysis history list per project: method, version, parameters, dataset snapshot, timestamps, warnings.
- Audit view showing all stored metadata and the full trace.
- "Re-run" that reproduces a stored analysis and highlights any difference (for example after a method version change).

**Depends on:** P2.6

**Deliverables:** history and audit routes, tests.

**Done when**
- Re-running any stored Phase 1 or 2 analysis with the same method version gives identical results.

---

## P2.13 — Phase 2 library, export and release hardening

**Goal:** Phase 2 is complete, documented and releasable.

**Scope**
- Method Library pages for all Phase 2 methods (TR and EN).
- XLSX/CSV export coverage for all new methods, comparison and sensitivity outputs.
- E2E coverage for hybrid, comparison and sensitivity flows; accessibility and performance passes; release notes.

**Depends on:** P2.1–P2.12

**Done when** the Phase 2 exit criteria pass.

---

## Phase 2 exit criteria

- All Phase 2 methods pass golden tests against verified references (fuzzy DEMATEL, fuzzy MOORA and ARAS-F: property tests, per the P2.1 decisions).
- Every method has a workspace, an Explain sequence and a Method Library page in TR and EN.
- Every example combination in `base-plan.md` §13.1 runs in the Hybrid Builder.
- Installers build in CI; no accessibility regressions.

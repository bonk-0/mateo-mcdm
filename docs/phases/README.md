# Mateo — Phase Plans

This folder breaks [`docs/plan.md`](../plan.md) into **main phases** and **sub-phases**. Each sub-phase is sized to be completed by one separate work thread and can be handed over as-is.

| Main phase | Goal | File |
|---|---|---|
| Phase 1 | Foundation and MARCOS: first usable release | [phase-1.md](phase-1.md) |
| Phase 2 | Method ecosystem: all weighting and ranking methods, DEMATEL, hybrids, comparison | [phase-2.md](phase-2.md) |
| Phase 3 | Groups, risk, batch and reporting | [phase-3.md](phase-3.md) |
| Phase 4 | Advanced fuzzy sets and learning | [phase-4.md](phase-4.md) |

A main phase is complete when all of its sub-phases are done and its **phase exit criteria** (at the end of each file) pass.

---

## How a sub-phase is worked

Every sub-phase has the same sections:

- **Goal:** the one outcome the sub-phase delivers.
- **Scope:** what is built.
- **Out of scope:** what is explicitly left to other sub-phases.
- **Depends on:** sub-phases that must be merged first.
- **Deliverables:** files, packages or screens that must exist at the end.
- **Done when:** checkable criteria. All must hold before the PR is merged.

Rules for every thread working on a sub-phase:

1. Read `docs/plan.md` and the sub-phase section before starting. The plan wins over `base-plan.md`.
2. Work on its own branch and deliver one pull request (two at most if the work naturally splits).
3. Stay inside the sub-phase scope. If something outside scope is needed, note it in the PR description instead of building it.
4. All code, comments, docs and commit messages are in English. All user-facing text goes through i18n with both `en` and `tr` entries (once P1.7 is merged).
5. CI must be green: type check, lint, unit tests, and the i18n missing-key check.
6. Engine code is pure TypeScript with no UI imports; UI code never computes method results itself.
7. Every method implementation ships with a golden test reproducing its reference paper's worked example (fixtures from P1.4 or the phase's reference sub-phase).
8. If a decision in `docs/plan.md` turns out to be wrong, propose the change in the PR instead of silently deviating.

---

## Dependency overview

Sub-phases with no arrow between them can run in parallel.

```
Phase 1

P1.1 Repo & tooling
 ├─> P1.2 Engine core ─┬─> P1.3 Fuzzy TFN ─┬─> P1.5 Weighting (needs P1.4)
 │                     │                   ├─> P1.6 MARCOS    (needs P1.4)
 │                     │                   └─> P1.9 Import engine
 │                     └─> P1.8 Project file
 ├─> P1.4 References & fixtures
 └─> P1.7 App shell & i18n

P1.7 + P1.8 + P1.9 ──> P1.10 Data Center UI
P1.7 + P1.8 + P1.3 ──> P1.11 Matrix editor
P1.5 + P1.6 + P1.11 ─> P1.12 Workspaces & results
P1.12 ──> P1.13 Explain framework ──> P1.14 Explain for weighting + TFN viz
P1.12 ──> P1.15 Sensitivity
P1.12 ──> P1.16 Export
P1.13 ──> P1.17 Method Library
P1.1–P1.17 ──> P1.18 Release hardening
```

Parallel tracks right after P1.1: **P1.2**, **P1.4** and **P1.7** can start at the same time.

Each later phase starts after the previous phase's exit criteria pass. Inside a phase, the references sub-phase (P2.1, P3.1, P4.1) usually comes first and most implementation sub-phases can then run in parallel.

The table below and each sub-phase section list the exact dependencies.

---

## Sub-phase index

| ID | Title | Depends on |
|---|---|---|
| P1.1 | Monorepo, tooling and CI | — |
| P1.2 | Engine core and step trace | P1.1 |
| P1.3 | Fuzzy TFN package and linguistic scales | P1.2 |
| P1.4 | Phase 1 references and test fixtures | P1.1 |
| P1.5 | CRITIC, MEREC and SWARA | P1.3, P1.4 |
| P1.6 | MARCOS and Fuzzy MARCOS | P1.3, P1.4 |
| P1.7 | App shell, desktop wrapper and i18n | P1.1 |
| P1.8 | Project file format and storage | P1.2 |
| P1.9 | Import engine (headless) | P1.3 |
| P1.10 | Data Center and import wizard UI | P1.7, P1.8, P1.9 |
| P1.11 | Decision matrix editor and model management | P1.7, P1.8, P1.3 |
| P1.12 | Method workspaces and results | P1.5, P1.6, P1.11 |
| P1.13 | Explain mode framework and MARCOS sequence | P1.12 |
| P1.14 | Explain for weighting methods and TFN visualization | P1.13 |
| P1.15 | Basic sensitivity analysis | P1.12 |
| P1.16 | XLSX and CSV export | P1.12 |
| P1.17 | Method Library (Phase 1 methods) | P1.13 |
| P1.18 | Phase 1 release hardening | all of P1.1–P1.17 |
| P2.1 | Phase 2 references and fixtures | Phase 1 |
| P2.2 | Optimization solver and LOPCOW, FUCOM, BWM | P2.1 |
| P2.3 | DEMATEL engine | P2.1 |
| P2.4 | Ranking methods A: VIKOR, EDAS, CODAS, WASPAS | P2.1 |
| P2.5 | Ranking methods B: COPRAS, MOORA, ARAS | P2.1 |
| P2.6 | Generic ranking workspace and explain sequences | P2.4, P2.5 |
| P2.7 | Workspaces for LOPCOW, FUCOM, BWM | P2.2 |
| P2.8 | DEMATEL workspace | P2.3 |
| P2.9 | Method compatibility model and Hybrid Builder | P2.6, P2.7, P2.8 |
| P2.10 | Method Comparison | P2.6 |
| P2.11 | Full sensitivity analysis | P2.6 |
| P2.12 | Audit view and analysis history | P2.6 |
| P2.13 | Phase 2 library, export and release hardening | all of P2.1–P2.12 |
| P3.1 | Phase 3 references and fixtures | Phase 2 |
| P3.2 | Trapezoidal fuzzy numbers | P3.1 |
| P3.3 | Group decision engine | P3.1 |
| P3.4 | Group decision UI and multi-sheet import | P3.3 |
| P3.5 | FMEA | P3.1 |
| P3.6 | Fine-Kinney | P3.1 |
| P3.7 | Batch Analysis | Phase 2 |
| P3.8 | Report engine and PDF | Phase 2 |
| P3.9 | DOCX report | P3.8 |
| P3.10 | Project versioning: compare and restore | Phase 2 |
| P3.11 | Phase 3 release hardening | all of P3.1–P3.10 |
| P4.1 | Advanced fuzzy references and fixtures | Phase 3 |
| P4.2 | Intuitionistic fuzzy sets | P4.1 |
| P4.3 | Interval type-2 fuzzy sets | P4.1 |
| P4.4 | Neutrosophic sets | P4.1 |
| P4.5 | Practice Center | Phase 3 |
| P4.6 | Additional UI languages | Phase 3 |
| P4.7 | Phase 4 release hardening | all of P4.1–P4.6 |

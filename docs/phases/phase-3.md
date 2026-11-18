# Phase 3 — Groups, Risk, Batch and Reporting

**Goal:** Mateo supports multi-expert decisions, trapezoidal fuzzy numbers, risk assessment, batch runs, academic reports and project versioning.

**Starts after:** Phase 2 exit criteria pass. See [README.md](README.md) for working rules.

---

## P3.1 — Phase 3 references and fixtures

**Goal:** verified sources and fixtures for Phase 3 methods.

**Scope**
- Verify references for FMEA (classical RPN, AIAG–VDA action priority, chosen fuzzy FMEA), Fine-Kinney (classical and chosen fuzzy variant), group aggregation operators, and trapezoidal variants of MARCOS and other methods that will support them, including fuzzy EDAS (Keshavarz Ghorabaee et al. 2016) and fuzzy CODAS (Keshavarz Ghorabaee et al. 2017), deferred from Phase 2 because both are trapezoidal.
- Fixtures and `docs/methods/*.md` as in P1.4.

**Depends on:** Phase 2

**Done when** every Phase 3 method and variant has a verified reference and fixture, or a documented proposal where none is accessible.

---

## P3.2 — Trapezoidal fuzzy numbers

**Goal:** trapezoidal fuzzy numbers across the engine.

**Scope**
- `TrFN (a, b, c, d)` type, arithmetic, defuzzification, aggregation, linguistic scales, in `packages/fuzzy`.
- Trapezoidal variants of MARCOS and of other methods chosen in P3.1.
- Editor, import detection (four-component columns), visualization and playground support.

**Depends on:** P3.1

**Done when** golden tests pass for every trapezoidal variant and the editor, import and Explain player handle trapezoidal cells.

---

## P3.3 — Group decision engine

**Goal:** aggregate multiple experts' evaluations.

**Scope**
- Expert model with optional expert weights.
- Aggregation operators for crisp, TFN and trapezoidal data (arithmetic, geometric, weighted, and fuzzy min/mean/max), chosen per method and recorded in the trace.
- Group decision matrix generation; individual results per expert; group result.
- Expert agreement/consensus indicators where the reference defines them.

**Depends on:** P3.1

**Done when** aggregated matrices and results match fixtures, and individual and group results are both stored.

---

## P3.4 — Group decision UI and multi-sheet import

**Goal:** users import and manage expert evaluations easily.

**Scope**
- Import of one sheet per expert, or long-format data with an expert column; detection in `packages/io`.
- Expert management screen, expert weights, per-expert matrices.
- Group results view: individual vs group rankings, expert comparison charts.
- Explain sequence for aggregation.

**Depends on:** P3.3

**Done when** an E2E test imports a multi-sheet expert workbook and produces a group MARCOS ranking.

---

## P3.5 — FMEA

**Goal:** a risk assessment module for FMEA.

**Scope**
- Failure mode table: severity, occurrence, detection, scales.
- Classical RPN, AIAG–VDA action priority (optional mode), chosen fuzzy FMEA.
- Risk priority table, risk matrix and Pareto charts.
- Explain sequence; Method Library page; XLSX export.
- Output usable as a criterion or alternative set in broader models where compatible.

**Depends on:** P3.1

**Done when** golden tests pass and the reference example is reproducible through the UI.

---

## P3.6 — Fine-Kinney

**Goal:** a risk assessment module for Fine-Kinney.

**Scope**
- Probability, exposure and consequence scales (standard tables, editable), risk score, risk class thresholds.
- Classical and chosen fuzzy variant.
- Risk classification table, charts, Explain sequence, Method Library page, XLSX export.

**Depends on:** P3.1

**Done when** golden tests pass and the reference example is reproducible through the UI.

---

## P3.7 — Batch Analysis

**Goal:** run many compatible scenarios on one dataset.

**Scope**
- Scenario builder: combinations of weighting methods, ranking methods, fuzzy configurations, parameter sets; compatibility checks from P2.9.
- Execution in a worker pool with progress, cancel and retry per scenario; partial results kept.
- Results grid with comparison (reusing P2.10) and batch export.

**Depends on:** Phase 2

**Done when** the example batch in `base-plan.md` §19 runs, can be cancelled mid-run, and exports all results.

---

## P3.8 — Report engine and PDF

**Goal:** academic reports generated from real results.

**Scope**
- Report model built from stored analyses: project info, method description, formulas, parameters, tables, charts, interpretation text, references, calculation date, method and app version.
- Print-ready HTML report template with KaTeX formulas and chart images; PDF export.
- Language selected at export time, independent of the UI language.
- Report options: which sections and tables to include.

**Depends on:** Phase 2

**Done when** a MARCOS and a hybrid analysis produce correct PDFs in TR and EN, and every number in the report traces back to the stored analysis.

---

## P3.9 — DOCX report

**Goal:** editable Word reports.

**Scope**
- DOCX generation from the same report model via the `docx` library: headings, tables, equations (OMML or images), charts as images, references.

**Depends on:** P3.8

**Done when** generated DOCX files open without errors in Word and LibreOffice, with the same content as the PDF.

---

## P3.10 — Project versioning: compare and restore

**Goal:** users can inspect and restore earlier project states.

**Scope**
- Version timeline built on P1.8 snapshots; named versions.
- Diff view: data changes (cells, criteria, alternatives), method configuration changes.
- Restore a version as the current state (non-destructive: creates a new version).

**Depends on:** Phase 2

**Done when** restoring and re-running an old analysis reproduces its stored results.

---

## P3.11 — Phase 3 release hardening

**Scope:** E2E coverage for group, risk, batch, report and versioning flows; accessibility and performance passes; release notes.

**Depends on:** P3.1–P3.10

**Done when** the Phase 3 exit criteria pass.

---

## Phase 3 exit criteria

- Group, trapezoidal, FMEA and Fine-Kinney golden tests pass against verified references.
- PDF and DOCX reports are generated in TR and EN from stored analyses only.
- Batch runs can be cancelled and resumed without data loss.
- Installers build in CI; no accessibility regressions.

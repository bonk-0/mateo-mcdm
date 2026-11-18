# Phase 4 — Advanced Fuzzy Sets and Learning

**Goal:** Mateo supports advanced fuzzy set types where widely accepted formulations exist, offers practice exercises, and is ready for more UI languages.

**Starts after:** Phase 3 exit criteria pass. See [README.md](README.md) for working rules.

---

## P4.1 — Advanced fuzzy references and fixtures

**Goal:** decide which methods get which advanced fuzzy variants.

**Scope**
- For intuitionistic fuzzy sets, interval type-2 fuzzy sets and neutrosophic sets: survey the literature for each Mateo method, choose the most widely cited formulation with a reproducible worked example, and verify it.
- Produce a support matrix (method × set type) with the chosen reference or "not supported" with a reason.
- Fixtures and `docs/methods/*.md` entries.

**Depends on:** Phase 3

**Done when** the support matrix is agreed in the PR and every supported cell has a verified fixture.

---

## P4.2 — Intuitionistic fuzzy sets

**Scope:** IFS number type (membership, non-membership, hesitation), operators, score/accuracy functions, linguistic scales, editor/import/visualization support, and the method variants from the P4.1 matrix with golden tests and Explain sequences.

**Depends on:** P4.1

**Done when** all IFS variants in the support matrix pass golden tests and run in the UI.

---

## P4.3 — Interval type-2 fuzzy sets

**Scope:** IT2 trapezoidal fuzzy number type, operators, type reduction/ranking per references, editor/import/visualization support, method variants from the P4.1 matrix with golden tests and Explain sequences.

**Depends on:** P4.1

**Done when** all IT2 variants in the support matrix pass golden tests and run in the UI.

---

## P4.4 — Neutrosophic sets

**Scope:** single-valued neutrosophic numbers (truth, indeterminacy, falsity), operators, score functions, editor/import/visualization support, method variants from the P4.1 matrix with golden tests and Explain sequences.

**Depends on:** P4.1

**Done when** all neutrosophic variants in the support matrix pass golden tests and run in the UI.

---

## P4.5 — Practice Center

**Goal:** learners test their understanding against the engine.

**Scope**
- Exercises generated from fixture datasets or small random datasets: the user predicts the next step's values (or a selected cell) and Mateo checks against the engine trace with a tolerance.
- Hints that reveal the formula, then the substitution, then the answer.
- Progress stored in the browser (there are no accounts), outside project files; available in TR and EN.
- Exercises for at least MARCOS, CRITIC, SWARA, VIKOR and TFN arithmetic.

**Depends on:** Phase 3

**Done when** each listed method has at least three exercises and every check uses engine output, never a stored answer key.

---

## P4.6 — Additional UI languages

**Goal:** adding a language is a translation task only.

**Scope**
- Translator documentation, export/import of catalogs (for example XLIFF or JSON with context notes), screenshot-based context where useful.
- Right-to-left layout readiness check.
- Add at least one additional language chosen by the project owner.

**Depends on:** Phase 3

**Done when** a new language ships without code changes outside catalogs and config.

---

## P4.7 — Phase 4 release hardening

**Scope:** E2E coverage, accessibility and performance passes, release notes.

**Depends on:** P4.1–P4.6

**Done when** the Phase 4 exit criteria pass.

---

## Phase 4 exit criteria

- Every supported advanced fuzzy variant passes golden tests against verified references.
- Practice Center exercises are checked only against engine output.
- The added language is complete with no untranslated strings.

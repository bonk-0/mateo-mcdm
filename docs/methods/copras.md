# COPRAS

**Reference (method).** Zavadskas, E. K., Kaklauskas, A., Šarka, V. (1994). The new method of multicriteria complex proportional assessment of projects. *Technological and Economic Development of Economy*, 1(3), 131–139.

**Verification.** The 1994 paper predates the journal's online archive and was not found online; it has no DOI. The formulation and the crisp example come from an open-access paper from the method's school: Podvezko, V. (2011). The comparative analysis of MCDA methods SAW and COPRAS. *Inžinerinė ekonomika – Engineering Economics*, 22(2), 134–146. DOI [10.5755/j01.ee.22.2.310](https://doi.org/10.5755/j01.ee.22.2.310). Its formulas match the later papers of Zavadskas and co-authors, including the fuzzy paper below.

## Formulation

1. Weighted sum normalisation d_ij = w_j x_ij / Σ_i x_ij, for benefit and cost criteria alike.
2. S+_i = Σ over benefit criteria of d_ij; S−_i = Σ over cost criteria.
3. Relative significance Q_i = S+_i + Σ_k S−_k / (S−_i Σ_k (1/S−_k)) (the form with S−_min cancelled; identical to Zavadskas' form).
4. Utility degree N_i = 100 Q_i / max Q. Higher is better.

## Edge cases

- No cost criteria: Q_i = S+_i.
- S−_i = 0 (all cost values of an alternative zero): undefined, reject.
- Negative data is not meaningful with sum normalisation: reject.

## Worked example

Fixture: `packages/methods/copras/fixtures/podvezko-2011.json` (variant II): Z = 0.332, 0.334, 0.335, ranking A3 > A2 > A1.

**Errata.** Variant I of Table 8 repeats the variant II Z row; its own S− and ranks correspond to Z = 0.336, 0.328, 0.336. Variant I is not used. The two variants show COPRAS rank reversal under a small data change.

## Fuzzy COPRAS (chosen variant)

Yazdani, M., Alidoosti, A., Zavadskas, E. K. (2011). Risk analysis of critical infrastructures using fuzzy COPRAS. *Ekonomska istraživanja – Economic Research*, 24(4), 27–40. DOI [10.1080/1331677X.2011.11517478](https://doi.org/10.1080/1331677X.2011.11517478). Open access (CC BY); the most cited open-access TFN COPRAS, co-authored by the method's first author.

It **defuzzifies every TFN (ratings and weights) by its centroid (l + m + u)/3 first**, then runs crisp COPRAS. Fixture `packages/methods/copras/fixtures/yazdani-2011-fuzzy.json` reproduces Q, N and the ranking at four decimals.

**Errata.** The crisp weight of VH (0.9167) is printed and used as 0.916 (deviation). Table 6 prints a C5 column that cannot come from Table 5 (values above the weight 0.5); Table 7 uses the correct values, and the fixture marks the column null.

**Proposal.** Mateo implements fuzzy COPRAS as "centroid defuzzification, then COPRAS", shown as two explicit steps, rather than a separate fuzzy-arithmetic engine. Variants that keep TFNs until the end (for example fuzzy S+ and S−) have no reproducible open-access example and are not planned.

## Implementation (P2.5)

`packages/methods/copras`: `copras` and `fuzzy-copras` (two methods, because their inputs differ).

- Steps: column sums → weighted normalized matrix d_ij → S⁺ and S⁻ → relative significance Q → utility degree N → ranking. N is the score; Q is also in the result.
- Weights need not sum to 1: scaling them scales Q and leaves N and the ranking unchanged, so there is no normalisation warning.
- Without cost criteria S⁻ is 0 everywhere and Q = S⁺ (the trace uses its own formula). A column that is 0 everywhere, and an alternative whose S⁻ is 0 while cost criteria exist, are validation errors.
- `fuzzy-copras` shows the two stages the P2.1 decision asks for: the trace first holds the defuzzified matrix and weights (`defuzzified-matrix`, `defuzzified-weights`), then the steps above unchanged. Ratings and weights may be TFNs; crisp weights are used as they are. The `defuzzification` parameter defaults to the centroid of the paper; the graded mean is offered as an option and has no published reference.
- Golden tests: Podvezko (2011) variant II for `copras`; Yazdani et al. (2011) for `fuzzy-copras` (crisp weights, Q, N, ranking, and Table 6 for C1–C4; the C5 column is marked unreproducible in the fixture).

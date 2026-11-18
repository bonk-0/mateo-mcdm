# EDAS

**Reference.** Keshavarz Ghorabaee, M., Zavadskas, E. K., Olfat, L., Turskis, Z. (2015). Multi-criteria inventory classification using a new method of evaluation based on distance from average solution (EDAS). *Informatica*, 26(3), 435–451. DOI [10.15388/Informatica.2015.57](https://doi.org/10.15388/Informatica.2015.57)

**Verification.** Read from the publisher's open-access PDF; metadata confirmed against Crossref. Every printed value of Tables 2–3 is reproduced up to the double-rounding deviations listed below.

## Formulation

1. Average solution AV_j = mean_i x_ij.
2. Benefit: PDA_ij = max(0, x_ij − AV_j)/AV_j, NDA_ij = max(0, AV_j − x_ij)/AV_j. Cost: the two are swapped.
3. SP_i = Σ_j w_j PDA_ij, SN_i = Σ_j w_j NDA_ij.
4. NSP_i = SP_i / max SP, NSN_i = 1 − SN_i / max SN.
5. AS_i = (NSP_i + NSN_i)/2. Higher is better.

## Edge cases

- AV_j = 0 (possible with negative data or all zeros): undefined, reject.
- max SP = 0 (every alternative at or below average on every criterion, only with one alternative or identical rows) or max SN = 0: undefined; Mateo should report it rather than divide by zero.
- Scaling all weights by a constant does not change NSP, NSN or AS.

## Worked example

Fixture: `packages/methods/edas/fixtures/keshavarz-ghorabaee-2015.json`. ABC inventory classification: 47 SKUs, three beneficial criteria. The paper says the weights are "equally distributed" but prints none; the printed SP and SN are plain sums, so the fixture uses weights of 1 (any equal weights give the same AS).

**Errata.** Twenty printed two-decimal values are one unit too high, all with unrounded values between x.xx45 and x.xx50: the paper rounded to three decimals and then to two. Listed as deviations.

## Fuzzy EDAS

**Candidate.** Keshavarz Ghorabaee, M., Zavadskas, E. K., Amiri, M., Turskis, Z. (2016). Extended EDAS method for fuzzy multi-criteria decision-making: An application to supplier selection. *International Journal of Computers Communications & Control*, 11(3), 358–371. DOI [10.15837/ijccc.2016.3.2557](https://doi.org/10.15837/ijccc.2016.3.2557). Open access; the authors' own extension and the most cited fuzzy EDAS.

**Verified, but not reproduced.** It uses **trapezoidal** fuzzy numbers, not TFNs, and a κ-based defuzzification of the fuzzy PDA/NDA. The intermediate table (Table 4) could not be extracted reliably enough from the PDF to reproduce the final scores, so no fixture was written.

**Proposal.** Implement fuzzy EDAS in P2.4 on trapezoidal numbers (a TFN (l, m, u) is the trapezoid (l, m, m, u)), following this paper, and write the fixture from its example when the tables can be transcribed by hand from the PDF. Until that fixture exists, mark the variant as "unverified" in the Method Library, or defer it to P3.2 if Phase 2 should ship only verified variants.

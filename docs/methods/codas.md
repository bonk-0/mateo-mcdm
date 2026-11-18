# CODAS

**Reference.** Keshavarz Ghorabaee, M., Zavadskas, E. K., Turskis, Z., Antucheviciene, J. (2016). A new combinative distance-based assessment (CODAS) method for multi-criteria decision-making. *Economic Computation and Economic Cybernetics Studies and Research*, 50(3), 25–44. RePEc [cys:ecocyb:v:50:y:2016:i:3:p:25-44](https://econpapers.repec.org/RePEc:cys:ecocyb:v:50:y:2016:i:3:p:25-44)

**Verification.** The journal issued no DOI for this volume; the RePEc handle is the stable identifier. Read from the institutional repository copy of the published paper (Vilnius Gediminas Technical University). Every printed value of Tables 2 and 3 is reproduced.

## Formulation

1. Linear max normalisation: benefit n_ij = x_ij / max_i x_ij, cost n_ij = min_i x_ij / x_ij.
2. r_ij = w_j n_ij; negative-ideal ns_j = min_i r_ij.
3. Euclidean E_i and taxicab T_i distance from the negative ideal.
4. Relative assessment h_ik = (E_i − E_k) + ψ(E_i − E_k)(T_i − T_k), with ψ(x) = 1 if |x| ≥ τ, else 0. τ is a parameter in [0.01, 0.05]; the paper uses 0.02.
5. H_i = Σ_k h_ik. Higher is better.

## Edge cases

- Cost criterion with a zero value: min/x undefined; reject (warn that the paper's normalisation needs positive data).
- τ is an absolute threshold on E, so it depends on the scale of the weights; Mateo normalises weights to sum 1 before use and documents this.

## Worked example

Fixture: `packages/methods/codas/fixtures/keshavarz-ghorabaee-2016.json`. Industrial robot selection, seven robots, five criteria (RE is a cost). Normalised and weighted matrices, E and T are reproduced at four decimals; the ranking A2 > A3 > A1 > A7 > A4 > A6 > A5 is reproduced.

**Not in the fixture.** Table 4 (relative assessment matrix and H): the readable copy is not antisymmetric (h_47 = h_74 = −0.0746). Whether that is a printing or an extraction error could not be settled. Recomputed H = 0.5122, 1.4633, 1.0715, −0.2125, −1.8515, −1.1717, 0.1887 gives the printed ranking. P2.4 should confirm Table 4 against the typeset page before adding it.

## Fuzzy CODAS

**Candidate.** Keshavarz Ghorabaee, M., Amiri, M., Zavadskas, E. K., Hooshmand, R., Antucheviciene, J. (2017). Fuzzy extension of the CODAS method for multi-criteria market segment evaluation. *Journal of Business Economics and Management*, 18(1), 1–19. DOI [10.3846/16111699.2016.1278559](https://doi.org/10.3846/16111699.2016.1278559). Open access; the authors' own extension.

**Verified, but not reproduced.** It uses **trapezoidal** fuzzy numbers, a fuzzy weighted Euclidean/Hamming distance and a normalisation that could not be pinned down from the text alone.

**Proposal.** Same as fuzzy EDAS: implement on trapezoids (TFN as (l, m, m, u)) once the example is transcribed by hand and reproduces, or defer to P3.2 together with the trapezoidal number type.

# MOORA

**Reference.** Brauers, W. K. M., Zavadskas, E. K. (2006). The MOORA method and its application to privatization in a transition economy. *Control and Cybernetics*, 35(2), 445–469. [EuDML 209425](https://eudml.org/doc/209425)

**Verification.** The journal issued no DOI; the EuDML record is the stable identifier. Read from the open-access copy in the Polish Library of Science. Every printed value of Table 1 is reproduced.

## Formulation

1. Vector normalisation x*_ij = x_ij / sqrt(Σ_i x_ij²).
2. **Ratio system:** y_i = Σ over maximised objectives of x*_ij − Σ over minimised. Higher is better. The original has no weights; the weighted variant multiplies each x*_ij by w_j (Mateo: weights optional, default equal, documented).
3. **Reference point:** r_j = best x*_ij per objective; rank by the smallest max_j |r_j − x*_ij| (Tchebycheff). Lower is better.
4. MULTIMOORA (Brauers & Zavadskas 2010) adds the full multiplicative form and dominance aggregation; it is not part of P2.

## Edge cases

- An all-zero column makes the norm zero: reject.
- Ties in the reference point are common (several alternatives share the max deviation on one objective); use competition ranking.

## Worked example

Fixture: `packages/methods/moora/fixtures/brauers-2006.json`. Three privatisation projects, seven objectives (payback minimised). Ratio system 3.16759, 2.74248, 2.49314 and both rankings reproduced.

**Errata.** The maximal deviation of B is 0.2517544 truncated to 0.25174 (rounded: 0.25175). Deviation.

## Fuzzy MOORA

**Candidate.** Brauers, W. K. M., Baležentis, A., Baležentis, T. (2011). MULTIMOORA for the EU member states updated with fuzzy number theory. *Technological and Economic Development of Economy*, 17(2), 259–290. DOI [10.3846/20294913.2011.580566](https://doi.org/10.3846/20294913.2011.580566). Open access, by the method's author; TFN ratio system and reference point with componentwise vector normalisation, vertex distance and centroid (BNP) defuzzification.

**Verified, but no fixture.** The example is the 27 EU member states on 12 TFN indicators, too large to transcribe reliably from the PDF tables.

**Proposal.** Implement the fuzzy ratio system and reference point from this paper in P2.4 (the formulas are clear), test it with property tests (crisp input gives crisp MOORA), and add a golden test from a small open-access example later, or transcribe a subset of the EU example by hand if the user wants a golden test before release.

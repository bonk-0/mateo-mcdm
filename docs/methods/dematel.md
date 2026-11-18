# DEMATEL

**Reference (method).** Gabus, A., Fontela, E. (1972). *World problems, an invitation to further thought within the framework of DEMATEL*. Battelle Geneva Research Centre; Fontela, E., Gabus, A. (1976). *The DEMATEL observer*. Battelle Geneva Research Centre.

**Verification.** The Battelle reports are not available online and could not be read. The formulation and the worked example come from an open-access paper co-authored by G.-H. Tzeng, who made DEMATEL widely used in MCDM: Chen, C.-Y., Tzeng, G.-H., Huang, J.-J. (2018). Generalized DEMATEL technique with centrality measurements. *Technological and Economic Development of Economy*, 24(2), 600–614. DOI [10.3846/20294913.2016.1216471](https://doi.org/10.3846/20294913.2016.1216471), Section 2 (Eqs. 1–4) and the classical case (α = 0) of Section 3. Metadata confirmed against Crossref.

## Formulation

1. Direct-relation matrix Z (n × n), integer scale 0–4 (no, low, medium, high, very high influence). With several experts Z is the element-wise mean.
2. Normalisation X = Z / s with s = max(max_i Σ_j z_ij, max_j Σ_i z_ij). Some papers use s = max row sum only; Mateo uses the max of both (the classical form, which guarantees convergence) and exposes the choice as a parameter.
3. Total-relation matrix T = X (I − X)⁻¹ (the limit of X + X² + …).
4. D = row sums of T (influence dispatched), R = column sums (influence received), prominence D + R, relation D − R (positive: cause group, negative: effect group).
5. Optional threshold α for the impact-relation map (common choice: the mean of T); it only affects the diagram.

## Edge cases

- I − X must be invertible. Dividing by s bounds the spectral radius of X by 1, but it can equal 1 (for example when every row sum equals s), and then the series diverges. Mateo must detect this and report a clear error rather than return a meaningless T.
- Non-zero diagonal entries are allowed by the formula. The example below has them; Mateo must **not** zero the diagonal silently, it should warn.
- An all-zero matrix gives s = 0: reject.

## Worked example

Fixture: `packages/methods/dematel/fixtures/chen-2018.json`. Six quality-control factors, one expert, s = 18. Every printed entry of X and T is reproduced at four decimals.

**Errata.** Table 2 prints D and R of S6 as 2.286 and 2.133; the sums of the printed T are 2.736 and 2.583 (their difference 0.153 matches the printed D − R, so both are typos), and D + R of S6 (4.419) follows the typos instead of 5.319. Five more D + R and D − R values are sums of rounded D and R. All are listed as deviations.

## Fuzzy DEMATEL

**Candidate.** Lin, C.-J., Wu, W.-W. (2008). A causal analytical method for group decision-making under fuzzy environment. *Expert Systems with Applications*, 34(1), 205–213. DOI [10.1016/j.eswa.2006.08.012](https://doi.org/10.1016/j.eswa.2006.08.012). Linguistic terms map to TFNs; the normalised fuzzy matrix is split into its l, m and u matrices, T is computed for each separately (T_l = X_l (I − X_l)⁻¹, and so on), and the fuzzy D + R and D − R are defuzzified (CFCS in later papers, centroid in others). This is the most cited TFN formulation.

**Not verified: paywalled.** The open-access example that was tried (Tsai et al. 2015, *PLOS ONE*) did not reproduce from its printed tables.

**Proposal.** Implement fuzzy DEMATEL in P2.4 with the Lin & Wu structure (componentwise T, normalisation by the largest upper row sum), centroid defuzzification by default and CFCS as an option, and test it with property tests: a crisp input (l = m = u) must give exactly the crisp DEMATEL result, and l ≤ m ≤ u must hold in T. Add a golden test when a reproducible open-access example is found, or defer fuzzy DEMATEL to Phase 4 if the user prefers to ship only verified variants.

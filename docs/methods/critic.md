# CRITIC

**Reference.** Diakoulaki, D., Mavrotas, G., Papayannakis, L. (1995). Determining objective weights in multiple criteria problems: The CRITIC method. *Computers & Operations Research*, 22(7), 763–770. DOI [10.1016/0305-0548(94)00059-H](https://doi.org/10.1016/0305-0548(94)00059-H)

**Verification.** Metadata confirmed against the article's first page and the NTUA repository record. Formulation and example read from a text-extracted (OCR) copy of the published article. Every printed weight is reproduced exactly.

## Formulation

For alternatives i = 1..n and criteria j = 1..m with performance f_j(a_i):

1. **Normalisation** (Eq. 2). With f_j* the ideal (best) and f_j⁻ the anti-ideal (worst) value of criterion j:
   x_ij = (f_j(a_i) − f_j⁻) / (f_j* − f_j⁻).
   For a benefit criterion f_j* = max, f_j⁻ = min; for a cost criterion the reverse. Every x_ij lies in [0, 1].
2. **Contrast intensity.** σ_j = standard deviation of column x_·j. The paper prints population standard deviations (divide by n). The final weights are the same with sample standard deviations, because the factor cancels.
3. **Conflict.** r_jk = Pearson linear correlation between columns j and k. Conflict of criterion j: Σ_k (1 − r_jk) (Eq. 4).
4. **Information content** (Eq. 5): C_j = σ_j · Σ_k (1 − r_jk).
5. **Weights** (Eq. 6): w_j = C_j / Σ_k C_k.

The paper mentions Spearman's rank correlation as a possible alternative to r_jk; Mateo uses Pearson, as in the worked example.

## Edge cases

- **Constant column** (f_j* = f_j⁻): Eq. 2 divides by zero and σ_j = 0, r_jk undefined. Not covered by the paper. Proposal for P1.5: reject with a validation error naming the criterion.
- **Fewer than two alternatives**: correlation undefined. Reject.
- **Negative values** are allowed (the example has negative profitability); Eq. 2 handles any real numbers.

## Worked example

Fixture: `packages/methods/critic/fixtures/diakoulaki-1995.json`. Eight firms, three benefit criteria (profitability, market share, productivity). Prints the input (Table 1), the normalised matrix (Table 2), σ_j and r_jk in the text, and the weights (Table 3): **0.202, 0.481, 0.317**. C_j is not printed.

## Errata and rounding

- Table 2 differs from a normalisation of Table 1 in 8 cells by 0.0005–0.008. The largest is firm C, profitability: printed 0.524, (16.3 + 34.6) / 95.6 = 0.532. The productivity column differs by up to 0.002 throughout, which suggests the authors normalised unrounded source data.
- The printed correlations r_13 = 0.811 and r_23 = −0.934 follow Table 2 as printed; from Table 1 they are 0.8117 and −0.9345.
- None of these changes the weights at the printed precision (from Table 1: 0.2022, 0.4809, 0.3169).

All 12 affected cells are listed in the fixture's `deviations`.

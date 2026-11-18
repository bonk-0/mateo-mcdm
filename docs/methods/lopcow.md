# LOPCOW

**Reference (method).** Ecer, F., Pamučar, D. (2022). A novel LOPCOW‐DOBI multi-criteria sustainability performance assessment methodology: An application in developing country banking sector. *Omega*, 112, 102690. DOI [10.1016/j.omega.2022.102690](https://doi.org/10.1016/j.omega.2022.102690)

**Verification.** Metadata confirmed against Crossref. **The article is paywalled and was not read.** The formulation below is taken from an open-access paper co-authored by the method's second author, which restates it with every intermediate value: Biswas, S., Pamučar, D., Dawn, S., Simic, V. (2024). Evaluation based on Relative Utility and Nonlinear Standardization (ERUNS) method for comparing firm performance in energy sector. *Decision Making Advances*, 2(1), 1–21. DOI [10.31181/dma21202419](https://doi.org/10.31181/dma21202419), Section 3 (Eqs. 10–13) and Tables 4–6. The same equations appear in the pymcdm reference implementation, which cites the Omega paper.

## Formulation

For m alternatives and n criteria:

1. **Min–max normalisation** (Eqs. 10–11): r_ij = (x_ij − min_i x_ij) / (max_i x_ij − min_i x_ij) for benefit criteria, r_ij = (max_i x_ij − x_ij) / (max_i x_ij − min_i x_ij) for cost criteria.
2. **Percentage value** (Eq. 12): PV_j = | ln( √( Σ_i r_ij² / m ) / σ_j ) · 100 |, where σ_j is the **sample** standard deviation (divisor m − 1) of column j of the normalised matrix.
3. **Weights** (Eq. 13): w_j = PV_j / Σ_k PV_k.

The source only says "standard deviation". The worked example fixes the convention: the sample standard deviation reproduces every printed σ, PV and weight; the population standard deviation does not (PV_1 = 49.53 instead of 42.86).

## Edge cases

- **Constant column** (max = min): normalisation divides by zero. Reject with a validation error, as CRITIC does.
- **σ_j = 0** cannot occur without a constant column. **Mean square equal to σ²** gives PV_j = 0; allowed, the criterion simply gets zero weight. If every PV is 0 the weights are undefined: reject.
- Fewer than two alternatives: the sample standard deviation is undefined. Reject.
- The absolute value makes PV ≥ 0 whatever the sign of the logarithm.

## Worked example

Fixture: `packages/methods/lopcow/fixtures/biswas-2024.json`. Eight energy-sector firms, six criteria (C4 debt-to-equity is a cost criterion). Prints the normalised matrix (Table 5), mean squares, σ, PV and their sum (Table 6) and the weights **0.1804, 0.2962, 0.2344, 0.2337, 0.0219, 0.0334**. Every printed value is reproduced; no errata.

## Fuzzy LOPCOW

**No fuzzy variant is proposed for Phase 2.** No triangular fuzzy LOPCOW with an accessible worked example was found. The fuzzy applications that exist use q-rung orthopair, Fermatean or interval-valued neutrosophic sets (for example Dhruva et al. 2024, *Informatica* 35(1), 65–98, DOI [10.15388/23-INFOR537](https://doi.org/10.15388/23-INFOR537), which reduces Fermatean numbers to crisp scores before a crisp LOPCOW). LOPCOW is an objective method computed from the data matrix, like CRITIC and MEREC, which Phase 1 also ships without a fuzzy variant. **Proposal:** drop "chosen fuzzy variant" from P2.2's LOPCOW scope; a fuzzy matrix can feed LOPCOW through the Hybrid Builder's explicit defuzzification step (P2.9). Revisit in Phase 4 together with the advanced fuzzy sets.

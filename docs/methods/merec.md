# MEREC

**Reference.** Keshavarz-Ghorabaee, M., Amiri, M., Zavadskas, E. K., Turskis, Z., Antucheviciene, J. (2021). Determination of objective weights using a new method based on the removal effects of criteria (MEREC). *Symmetry*, 13(4), 525. DOI [10.3390/sym13040525](https://doi.org/10.3390/sym13040525)

**Verification.** Read from the publisher's PDF (CC BY). Every printed value of the illustrative example (Tables 2–4, S_i, E_j, w_j) is reproduced.

## Formulation

For n alternatives and m criteria, with B the beneficial and H the non-beneficial criteria:

1. **Decision matrix** (Eq. 1). All x_ij must be > 0.
2. **Normalisation** (Eq. 2). Every criterion becomes a minimisation-type criterion:
   n_ij = min_k x_kj / x_ij if j ∈ B; n_ij = x_ij / max_k x_kj if j ∈ H.
   This is the reverse of the usual linear normalisation (the paper stresses the switch).
3. **Overall performance** (Eq. 3): S_i = ln(1 + (1/m) Σ_j |ln n_ij|).
4. **Performance with criterion j removed** (Eq. 4): S′_ij = ln(1 + (1/m) Σ_{k≠j} |ln n_ik|). The divisor stays m, not m − 1.
5. **Removal effect** (Eq. 5): E_j = Σ_i |S′_ij − S_i|.
6. **Weights** (Eq. 6): w_j = E_j / Σ_k E_k.

## Edge cases

- **x_ij ≤ 0**: the logarithm is undefined. The paper says such values "should be transformed into positive values using an appropriate technique" without naming one. Proposal for P1.5: reject with a validation error; any shift is the user's explicit choice in the editor.
- **All E_j = 0** (for example every alternative identical): weights undefined. Reject.

## Worked example

Fixture: `packages/methods/merec/fixtures/keshavarz-ghorabaee-2021.json`. Five alternatives, four criteria (C1, C2 ∈ B; C3, C4 ∈ H). Prints the decision matrix (Table 2), the normalised matrix (Table 3), S_i, S′_ij (Table 4), E_j and the weights: **0.5752, 0.0141, 0.4016, 0.0091**.

## Errata and rounding

- Step 6 prints "w1 = 1.71 / 2.97 = 0.5752". The quotient of the rounded numbers is 0.5758; the printed weights are E_j / Σ E with unrounded E (1.7087 / 2.9705). Golden tests must not round E before dividing.
- Recomputed S′_43 is 0.68497, printed 0.68; this is within tolerance.

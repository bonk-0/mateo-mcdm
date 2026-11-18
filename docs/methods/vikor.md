# VIKOR

**Reference (method).** Opricovic, S., Tzeng, G.-H. (2004). Compromise solution by MCDM methods: A comparative analysis of VIKOR and TOPSIS. *European Journal of Operational Research*, 156(2), 445–455. DOI [10.1016/S0377-2217(03)00020-1](https://doi.org/10.1016/S0377-2217(03)00020-1)

**Verification.** Metadata confirmed against Crossref. **The 2004 paper is paywalled and was not read.** The formulation and the worked example come from an open-access paper by the same two authors: Opricovic, S., Tzeng, G.-H. (2008). A comparative analysis of the DEA-CCR model and the VIKOR method. *Yugoslav Journal of Operations Research*, 18(2), 187–203. DOI [10.2298/YUJOR0802187O](https://doi.org/10.2298/YUJOR0802187O), Section 3 (Eqs. 1–4), Tables 1 and 7.

## Formulation

1. f*_j and f⁻_j: best and worst value of criterion j (max/min for benefit, min/max for cost).
2. Weights normalised to sum 1 (Mateo normalises; the paper prints unnormalised DEA weights).
3. S_i = Σ_j w_j (f*_j − f_ij) / (f*_j − f⁻_j) (group utility), R_i = max_j of the same terms (individual regret).
4. Q_i = v (S_i − S*) / (S⁻ − S*) + (1 − v)(R_i − R*) / (R⁻ − R*). Lower is better.
5. Compromise solution: rank by Q. A(1) is accepted if C1 (advantage: Q(A(2)) − Q(A(1)) ≥ DQ = 1/(J − 1)) and C2 (stability: A(1) is also best by S or R) hold. If only C2 fails, the set is {A(1), A(2)}; if C1 fails, it is every A(M) with Q(A(M)) − Q(A(1)) < DQ.

**Strategy weight v.** The 2004 paper uses v = 0.5; the 2008 paper uses v = (n + 1)/(2n). Mateo exposes v with 0.5 as the default and the 2008 rule as a named option; the fixture uses the 2008 rule because the printed Q is only reproduced with it.

## Edge cases

- A criterion with f*_j = f⁻_j has no range: its term is 0 (warn).
- S⁻ = S* or R⁻ = R* (all alternatives equal on that measure): the corresponding Q term is 0; with both, Q is undefined (error).
- J = 2 gives DQ = 1, so C1 can only hold if Q(A(2)) = 1.
- Zero weights are allowed (W5 has three).

## Implementation

`packages/methods/vikor` (P2.4). Parameters: `vRule` (`fixed`, the default, or `opricovic-tzeng-2008`), `v` (a number in [0, 1], default 0.5, used when the rule is `fixed`) and `normalizeWeights` (default on, as in the reference; Q and the ranking do not depend on it, S and R do). The fixtures' `"v": "opricovic-tzeng-2008"` is `vRule: 'opricovic-tzeng-2008'`; the golden tests use it, and a test shows that v = 0.5 does not reproduce Table 7.

The trace holds every intermediate table: best and worst values, the weighted distances, S, R, their extremes, the normalized S and R, v, Q, the rankings by S and R, DQ and the differences Q_i − Q(A(1)). The result adds the compromise solution: the set, C1 with its threshold and difference, and C2 with the rankings of A(1) by S and R. Equal Q values at the top are ranked equally; then C1 fails (the difference is 0) and the set holds every alternative within DQ. Differences within 1e-12 of DQ count as reaching it, so a difference that equals DQ in exact arithmetic is not lost to round-off.

At least two alternatives are required (DQ = 1 / (J − 1)). Criteria without a range are warned about and contribute 0. When every alternative has the same S and the same R, Q is undefined and validation fails with `vikor.no-discrimination`; if only one of the two has no range, its normalized value is 0.

## Worked example

Fixtures: `packages/methods/vikor/fixtures/opricovic-2008-w1.json` and `-w5.json`. Hydropower planning on the Drina river, six alternatives, eight criteria. S, R and Q of Table 7 are reproduced at three decimals for both weight sets; the compromise solution is {A5} for W1 and {A5, A6} for W5 (C1 fails). No errata.

## Fuzzy VIKOR

**Candidate.** Opricovic, S. (2011). Fuzzy VIKOR with an application to water resources planning. *Expert Systems with Applications*, 38(10), 12983–12990. DOI [10.1016/j.eswa.2011.04.097](https://doi.org/10.1016/j.eswa.2011.04.097). TFN version by the method's author, the most cited fuzzy VIKOR.

**Not verified: paywalled.** The open-access fuzzy VIKOR that was tried (Papathanasiou & Ploskas' book chapter) uses trapezoidal numbers and its tables could not be extracted.

**Proposal.** Defer fuzzy VIKOR until the 2011 paper or an open-access reproduction of it is available. As an interim, a TFN matrix can be run through crisp VIKOR after an explicit defuzzification step in the Hybrid Builder (P2.9), which is honest about what is computed.

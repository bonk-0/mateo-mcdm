# ARAS

**Reference.** Zavadskas, E. K., Turskis, Z. (2010). A new additive ratio assessment (ARAS) method in multicriteria decision-making. *Technological and Economic Development of Economy*, 16(2), 159–172. DOI [10.3846/tede.2010.10](https://doi.org/10.3846/tede.2010.10)

**Verification.** Read from the publisher's open-access PDF; metadata confirmed against Crossref. Every printed value of Tables 2–3 is reproduced after one input correction.

## Formulation

1. Add an optimal alternative x_0j. It is **given by the decision maker**; when none is given, x_0j = max_i x_ij for benefit and min_i x_ij for cost (Eq. 2). Mateo must accept an explicit optimal row.
2. Normalisation over all rows including row 0: benefit x_ij / Σ_i x_ij; cost first x_ij' = 1/x_ij, then x_ij' / Σ_i x_ij'.
3. S_i = Σ_j w_j x̄_ij; utility K_i = S_i / S_0. Higher is better; K_0 = 1.

## Edge cases

- Cost criterion with a zero value: 1/x undefined; reject.
- An explicit optimal row worse than some alternative is allowed (K_i > 1 then); warn.

## Worked example

Fixture: `packages/methods/aras/fixtures/zavadskas-2010.json`. Microclimate in fourteen office rooms, six criteria (air flow rate and dew point minimised), explicit optimal row (x1 = 15, x2 = 50 exceed every room).

**Errata.** Table 1 prints room 8's illumination as 400 lx; Tables 2 and 3 were computed with 390 lx (column sum 4730). The fixture uses 390 (input correction); with 400, room 8 would rank first instead of room 9.

## Fuzzy ARAS

**Candidate.** Turskis, Z., Zavadskas, E. K. (2010). A new fuzzy additive ratio assessment method (ARAS-F). Case study: The analysis of fuzzy multiple criteria in order to select the logistic centers location. *Transport*, 25(4), 423–432. DOI [10.3846/transport.2010.52](https://doi.org/10.3846/transport.2010.52). Open access, by the method's authors; TFN ratings, sum normalisation of TFNs, centroid defuzzification of S̃_i before K_i = S_i / S_0.

**Verified, but not reproduced.** The optimal-alternative row of the example is not legible in the available PDF, and every value depends on it.

**Proposal.** Implement ARAS-F in P2.4 from the paper's formulas with property tests (crisp input gives crisp ARAS); add the golden test once the optimal row can be confirmed from a clean copy of the paper, or defer ARAS-F to P3.2 if Phase 2 should ship only verified variants.

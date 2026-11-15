# SWARA and fuzzy SWARA (IMF SWARA)

## Classical SWARA

**Reference.** Keršulienė, V., Zavadskas, E. K., Turskis, Z. (2010). Selection of rational dispute resolution method by applying new step-wise weight assessment ratio analysis (SWARA). *Journal of Business Economics and Management*, 11(2), 243–258. DOI [10.3846/jbem.2010.12](https://doi.org/10.3846/jbem.2010.12)

**Verification.** Read from the journal's open-access PDF (text extraction). Every printed value of Table 1 is reproduced.

### Formulation (Fig. 2 and Table 1)

1. Experts rank the criteria from most to least important.
2. For each criterion j ≥ 2, the experts state how much more important criterion j − 1 is than criterion j: the comparative importance s_j. The paper uses the average over experts.
3. Coefficient: k_1 = 1; k_j = s_j + 1 for j ≥ 2.
4. Recalculated weight: w_1 = 1; w_j = w_{j−1} / k_j.
5. Final weight: q_j = w_j / Σ_k w_k.

The paper calls the recalculated weight w_j and the final weight q_j; many later papers swap the two letters. Mateo's step names (`recalculatedWeights`, `weights`) avoid the ambiguity.

### Edge cases

- s_j ≥ 0 by construction; s_j = 0 means equal importance (k_j = 1). Proposal for P1.5: reject s_j < 0, since the criteria must be in descending order.
- The first criterion has no s_j.

### Worked example

Fixture: `packages/methods/swara/fixtures/kersuliene-2010.json`. Six attributes of dispute resolution methods; s = (–, 0.15, 0.04, 0.29, 0.02, 0.04); final weights **0.22, 0.19, 0.18, 0.14, 0.14, 0.13**. No errata found.

## Fuzzy SWARA: choice of variant

The plan asks for a TFN variant of SWARA, chosen as the most widely cited formulation with a reproducible worked example. Two candidates were checked:

1. **Fuzzy SWARA with Chang's TFN scale** (most often cited as Mavi, Goh, Zarbakhshnia (2017), *Int. J. Adv. Manuf. Technol.* 91, 2401–2418, DOI [10.1007/s00170-016-9880-x](https://doi.org/10.1007/s00170-016-9880-x)). The paper is paywalled and could not be read. Stević, Das, Tešić, Vidas, Vojinović (2022), *Mathematics* 10(4), 635, DOI [10.3390/math10040635](https://doi.org/10.3390/math10040635), show on seven published applications that this scale gives inconsistent weights: "equally important" (1, 1, 1) halves the next weight, equal criteria cannot get equal weights, and the last criteria have almost no influence.
2. **IMF SWARA** (improved fuzzy SWARA): Vrtagić, S., Softić, E., Subotić, M., Stević, Ž., Dordevic, M., Ponjavic, M. (2021). Ranking road sections based on MCDM model: New improved fuzzy SWARA (IMF SWARA). *Axioms*, 10(2), 92. DOI [10.3390/axioms10020092](https://doi.org/10.3390/axioms10020092). Open access; it fixes the scale and keeps the SWARA procedure.

**Decision: Mateo's fuzzy SWARA is IMF SWARA.** The two variants share the algorithm and differ only in the scale, so the engine should take the scale as data. Adding Chang's scale later as a second predefined scale needs no new code, only a verified worked example.

## IMF SWARA

**Verification.** The procedure (Eqs. 9–11) was read from the Axioms paper. Its scale table is an image on the publisher's page, so the scale and the worked example come from an open-access application by co-authors of the method: Damjanović, M., Stević, Ž., Stanimirović, D., Tanackov, I., Marinković, D. (2022). Impact of the number of vehicles on traffic safety: multiphase modeling. *Facta Universitatis, Series: Mechanical Engineering*, 20(1), 177–197. DOI [10.22190/FUME220215012D](https://doi.org/10.22190/FUME220215012D), [open-access PDF](https://core.ac.uk/download/524099176.pdf), Section 3.3, Tables 2 and 4. Read through text extraction; every value of Table 4 is reproduced except the four rounding slips listed below.

### Scale (Damjanović et al. 2022, Table 2)

| Term | Abbr. | TFN |
|---|---|---|
| Absolutely less significant | ALS | (1, 1, 1) |
| Dominantly less significant | DLS | (1/2, 2/3, 1) |
| Much less significant | MLS | (2/5, 1/2, 2/3) |
| Really less significant | RLS | (1/3, 2/5, 1/2) |
| Less significant | LS | (2/7, 1/3, 2/5) |
| Moderately less significant | MDLS | (1/4, 2/7, 1/3) |
| Weakly less significant | WLS | (2/9, 1/4, 2/7) |
| Equally significant | ES | (0, 0, 0) |

### Formulation

1. Rank the criteria by descending significance.
2. For each j ≥ 2, choose the term that says how much less significant C_j is than C_{j−1}: s̃_j.
3. k̃_1 = (1, 1, 1); k̃_j = s̃_j ⊕ (1, 1, 1) for j ≥ 2.
4. q̃_1 = (1, 1, 1); q̃_j = q̃_{j−1} ⊘ k̃_j, with TFN division (l₁/u₂, m₁/m₂, u₁/l₂) (Axioms paper, Eq. 5).
5. w̃_j = q̃_j ⊘ Σ_k q̃_k, with the same division.
6. Crisp weight: graded mean (l + 4m + u) / 6 (see the notes below).

### Notes for implementation (P1.5)

- **Erratum in the Axioms paper:** Eq. 9 reads k̃_j = s̃_j for j > 1, without "+ 1". With ES = (0, 0, 0) that would divide by zero, and every worked example uses k̃_j = s̃_j + 1 (for example WLS gives k̃ = (1.22, 1.25, 1.29)). Implement k̃_j = s̃_j ⊕ 1.
- **Defuzzification** is not stated in either paper. The graded mean (l + 4m + u) / 6 and the centroid (l + m + u) / 3 both reproduce every printed crisp weight (2 decimals) and the 3-decimal weights passed to MARCOS, so the example cannot tell them apart. Decision: graded mean, the defuzzification the same authors state explicitly in Fuzzy MARCOS. The fixtures record it as `parameters.defuzzification`.
- **Crisp weights do not sum exactly to 1** (S1: 1.0003, S6: 1.0006), because defuzzification is not additive across normalised fuzzy weights. The P1.5 property "weights sum to 1 within 1e-12" therefore cannot hold for raw IMF SWARA crisp weights. Proposal: report the raw crisp weights in the trace and add an explicit, traced normalisation step before the weights feed another method. Damjanović et al. pass the 3-decimal crisp weights (0.247, 0.247, 0.309, 0.197) to MARCOS, which sum to 1.000 only after rounding.

### Worked examples

Fixtures `packages/methods/swara/fixtures/imf-swara-damjanovic-2022-{s1,s2,s3,s6}.json`, one per scenario of Table 4 (S4 and S5 repeat S1's numbers). S1, for criteria TAC, AADT, NRV, TAMD with assessments (–, WLS, ES, WLS), gives crisp weights **0.31, 0.25, 0.25, 0.20** (unrounded 0.3089, 0.2470, 0.2470, 0.1975).

### Errata and rounding

Four cells of Table 4 are printed one unit too low (S1: w̃ l = 0.23 for 0.235 twice; S6: Σq̃ u = 3.03 for 3.035 and w̃ l = 0.15 for 0.155). They are listed in the fixtures' `deviations`. Because the table was read through text extraction, these four cells should be checked against the PDF once more before the golden tests treat them as errata.

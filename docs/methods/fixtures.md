# Method fixtures

Every Phase 1 and Phase 2 method has one or more worked examples taken from a published paper and stored as JSON under `packages/methods/<method>/fixtures/`. The golden tests of P1.5, P1.6 and the Phase 2 implementation sub-phases load these files. This page describes the format and the rules for using it.

| Method | Fixture | Source |
|---|---|---|
| CRITIC | `critic/fixtures/diakoulaki-1995.json` | Original paper |
| MEREC | `merec/fixtures/keshavarz-ghorabaee-2021.json` | Original paper |
| SWARA (classical) | `swara/fixtures/kersuliene-2010.json` | Original paper |
| SWARA (fuzzy, IMF SWARA) | `swara/fixtures/imf-swara-damjanovic-2022-{s1,s2,s3,s6}.json` | Open-access application by co-authors of the method |
| MARCOS | `marcos/fixtures/damjanovic-2022-s1.json` | Open-access application co-authored by the method's first author |
| Fuzzy MARCOS | `fuzzy-marcos/fixtures/stankovic-2020.json` | Original paper |
| LOPCOW | `lopcow/fixtures/biswas-2024.json` | Open-access paper co-authored by the method's second author |
| FUCOM | `fucom/fixtures/pamucar-2018-example-{1,2}.json` | Original paper |
| BWM (nonlinear and linear) | `bwm/fixtures/rezaei-car.json` | The method author's published lecture slides |
| DEMATEL | `dematel/fixtures/chen-2018.json` | Open-access paper co-authored by G.-H. Tzeng |
| VIKOR | `vikor/fixtures/opricovic-2008-{w1,w5}.json` | Open-access paper by both authors of the method |
| EDAS | `edas/fixtures/keshavarz-ghorabaee-2015.json` | Original paper |
| CODAS | `codas/fixtures/keshavarz-ghorabaee-2016.json` | Original paper |
| WASPAS | `waspas/fixtures/zavadskas-2012.json` | Original paper (raw matrix from the authors' 2013 paper) |
| Fuzzy WASPAS (WASPAS-F) | `waspas/fixtures/turskis-2015-fuzzy.json` | Original fuzzy paper |
| COPRAS | `copras/fixtures/podvezko-2011.json` | Open-access paper from the method's school |
| Fuzzy COPRAS | `copras/fixtures/yazdani-2011-fuzzy.json` | Original fuzzy paper |
| MOORA | `moora/fixtures/brauers-2006.json` | Original paper |
| ARAS | `aras/fixtures/zavadskas-2010.json` | Original paper |

Why a fixture uses a substitute source, and which fuzzy variants have no fixture yet and why, is explained on each method's page in this folder.

## Format (schema version 1)

```jsonc
{
  "schemaVersion": 1,
  "method": "marcos",            // folder name under packages/methods
  "variant": "classical",        // e.g. "classical", "imf-swara", "tfn"
  "numberType": "crisp",         // "crisp" or "tfn"
  "title": "…",
  "source": {
    "role": "original",          // "original" paper of the method, or "substitute"
    "citation": "…",
    "doi": "10.…",               // or "url": "https://…" when the paper has no DOI
    "location": "Section 4, Tables 5-8",
    "accessedVia": "…",          // optional: open-access copy that was read
    "note": "…"
  },
  "precision": { "decimals": 3, "rule": "round-half-away-from-zero" },
  "input": { … },                // method-specific, see below
  "parameters": { … },           // method options, e.g. { "defuzzification": "graded-mean" }
  "steps": {                     // every intermediate table the paper prints
    "<stepId>": {
      "printedIn": "Table 6",
      "decimals": 3,             // overrides precision.decimals
      "rows": ["AAI", "A1", …],  // optional: which rows the paper prints
      "values": …                // number, vector, matrix; a TFN is [l, m, u]
    }
  },
  "result": { "<name>": { "printedIn": "…", "values": … } },
  "deviations": [                // printed values that the formulation does not reproduce
    { "path": "steps.sums.values[3][2]", "printed": 0.514, "recomputed": 0.5145, "note": "…" }
  ],
  "notes": ["…"]
}
```

Conventions:

- Matrices are row-major: one row per alternative, one column per criterion, in `input` order.
- A TFN is `[l, m, u]`. `null` marks a cell the paper leaves blank.
- Rows of extended matrices are labelled `AAI` (anti-ideal) and `AI` or `ID` (ideal) as in the source. When a table prints only some rows, `rows` lists them and `values` holds exactly those rows.
- Values are copied as printed. Inputs that the paper prints rounded but evidently computed with exact values (for example 2/3 printed as 0.667) are stored exactly, and a note says so.

### Input by method

| Method | `input` fields |
|---|---|
| CRITIC, MEREC | `alternatives`, `criteria` (`id`, `direction`: `benefit` or `cost`), `matrix` |
| SWARA | `criteria` in descending importance, `comparativeImportance` (s_j, `null` for the first) |
| IMF SWARA | `criteria` in descending significance, `scale` (abbreviation, term, TFN), `assessments` (scale abbreviations, `null` for the first) |
| MARCOS | as CRITIC plus `weights` |
| Fuzzy MARCOS | as MARCOS with TFN cells and TFN weights; also `scale` and `linguisticMatrix` |
| LOPCOW | as CRITIC |
| FUCOM | `criteria`, `ranking` (criterion ids, most important first) and either `comparativePriorities` (φ between consecutive ranked criteria) or `significance` (the paper's priority values per ranked criterion) |
| BWM | `criteria`, `best`, `worst`, `bestToOthers`, `othersToWorst` (in `criteria` order) |
| DEMATEL | `factors`, `directRelation` (square matrix) |
| VIKOR, EDAS, CODAS, WASPAS, COPRAS | as MARCOS |
| Fuzzy WASPAS, fuzzy COPRAS | as MARCOS with TFN cells and TFN weights (fuzzy COPRAS also `scale`) |
| MOORA | as CRITIC; optional `weights` |
| ARAS | as MARCOS plus `optimal` (the decision maker's optimal alternative, one value per criterion) |

Results may hold strings, for example VIKOR's `compromiseSolution` (alternative ids); they are compared exactly. Phase 2 `parameters` include VIKOR `v` (a number or `"opricovic-tzeng-2008"`), CODAS `tau`, WASPAS `lambda` (a number, `"optimal"` or `"pooled"`) and `relativeError`, LOPCOW `standardDeviation` and DEMATEL `normalization`. The methods take them as separate parameters (P2.4): VIKOR `v` as `vRule` (`"opricovic-tzeng-2008"`) plus `v` (a number), WASPAS `lambda` as `lambdaRule` (`"optimal"`, `"pooled"`) plus `lambda` (a number).

## How golden tests use a fixture

1. Run the method on `input` with `parameters`, without rounding any intermediate value.
2. For every printed value in `steps` and `result`, assert
   `|computed − printed| ≤ 0.5 × 10^−decimals` (plus 1e-9 for floating-point noise).
3. A value listed in `deviations` is instead asserted against `recomputed` (rounded to 4 decimals there), and the test names the deviation. A deviation is never a reason to change the formulation.
4. Rankings are compared exactly. Mateo uses standard competition ranking (1, 2, 2, 4); where a paper numbers ties differently, the fixture lists it as a deviation.

## Verification

[`verification/verify_fixtures.py`](verification/verify_fixtures.py) is an independent, dependency-free reimplementation used while preparing the fixtures. It recomputes every method from `input`, compares every printed value with the rule above, and fails if a mismatch is not documented in `deviations` or a documented deviation no longer deviates. It is a review aid, not part of CI. Phase 2 methods live in `verification/phase2.py`; `verification/lp.py` is a small exact simplex used for BWM. A step without its own `decimals` uses `precision.decimals`:

```sh
python3 docs/methods/verification/verify_fixtures.py          # all fixtures pass
python3 docs/methods/verification/verify_fixtures.py --list   # also print documented deviations
```

`packages/methods/src/fixtures.test.ts` checks the structure of every fixture in CI.

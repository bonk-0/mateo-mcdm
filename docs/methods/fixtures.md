# Method fixtures

Every Phase 1 method has one or more worked examples taken from a published paper and stored as JSON under `packages/methods/<method>/fixtures/`. The golden tests of P1.5 and P1.6 load these files. This page describes the format and the rules for using it.

| Method | Fixture | Source |
|---|---|---|
| CRITIC | `critic/fixtures/diakoulaki-1995.json` | Original paper |
| MEREC | `merec/fixtures/keshavarz-ghorabaee-2021.json` | Original paper |
| SWARA (classical) | `swara/fixtures/kersuliene-2010.json` | Original paper |
| SWARA (fuzzy, IMF SWARA) | `swara/fixtures/imf-swara-damjanovic-2022-{s1,s2,s3,s6}.json` | Open-access application by co-authors of the method |
| MARCOS | `marcos/fixtures/damjanovic-2022-s1.json` | Open-access application co-authored by the method's first author |
| Fuzzy MARCOS | `fuzzy-marcos/fixtures/stankovic-2020.json` | Original paper |

Why two fixtures use a substitute source is explained in [marcos.md](marcos.md) and [swara.md](swara.md).

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
    "doi": "10.…",
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

## How golden tests use a fixture

1. Run the method on `input` with `parameters`, without rounding any intermediate value.
2. For every printed value in `steps` and `result`, assert
   `|computed − printed| ≤ 0.5 × 10^−decimals` (plus 1e-9 for floating-point noise).
3. A value listed in `deviations` is instead asserted against `recomputed` (rounded to 4 decimals there), and the test names the deviation. A deviation is never a reason to change the formulation.
4. Rankings are compared exactly. Mateo uses standard competition ranking (1, 2, 2, 4); where a paper numbers ties differently, the fixture lists it as a deviation.

## Verification

[`verification/verify_fixtures.py`](verification/verify_fixtures.py) is an independent, dependency-free reimplementation used while preparing the fixtures. It recomputes every method from `input`, compares every printed value with the rule above, and fails if a mismatch is not documented in `deviations` or a documented deviation no longer deviates. It is a review aid, not part of CI:

```sh
python3 docs/methods/verification/verify_fixtures.py          # all fixtures pass
python3 docs/methods/verification/verify_fixtures.py --list   # also print documented deviations
```

`packages/methods/src/fixtures.test.ts` checks the structure of every fixture in CI.

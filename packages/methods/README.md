# @mateo/methods

MCDM method implementations, one folder per method, each with its reference fixtures from
P1.4 (`docs/methods/fixtures.md`) and a golden test that reproduces the fixture.

| Folder          | Method             | Sub-phase | Formulation                                                        |
| --------------- | ------------------ | --------- | ------------------------------------------------------------------ |
| `marcos/`       | MARCOS             | P1.6      | [docs/methods/marcos.md](../../docs/methods/marcos.md)             |
| `fuzzy-marcos/` | Fuzzy MARCOS (TFN) | P1.6      | [docs/methods/fuzzy-marcos.md](../../docs/methods/fuzzy-marcos.md) |

`src/index.ts` exports every method, its issue codes and `METHODS_MESSAGES` (English and
Turkish texts for every step, label, parameter and validation key the methods emit).
`src/testing/golden.ts` compares a trace with a fixture following the rules of
`docs/methods/fixtures.md`; new methods reuse it.

A method folder holds `<method>.ts`, `<method>.test.ts`, `index.ts` and `fixtures/`. Add the
folder to `include` in `tsconfig.json`. See `packages/engine/README.md` for the method contract.

```sh
pnpm --filter @mateo/methods test            # golden, contract and validation tests
pnpm --filter @mateo/methods test:coverage   # fails below 90 % coverage
```

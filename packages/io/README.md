# @mateo/io

Excel and CSV import (sub-phase P1.9, `docs/plan.md` §9). Export arrives in P1.16. Pure
TypeScript with no UI: the import wizard (P1.10) shows what this package decides and lets
the user change it.

```ts
import { importFile, profileFromImport } from '@mateo/io';

const result = importFile(bytes, { fileName: 'veri.xlsx' });
result.decisions; // what was detected: sheet, encoding, delimiter, number format, header...
result.validation; // errors block the import; warnings are stored with the dataset
result.model; // the proposed model: alternatives, criteria, values and their source cells

// The user changes a decision: import again with an override.
importFile(bytes, { fileName: 'veri.xlsx', overrides: { numberFormat: 'comma' } });

// Save the final decisions as a reusable import profile.
const profile = profileFromImport(result); // JSON-safe; stored by @mateo/project
```

## Principles

- **Nothing is invented.** A cell without a valid value is `null` in the model and has an
  error with its address (`import.cell.missing`, `import.cell.invalid-number`...).
  Directions the file does not give stay `null` with a warning; they are never assumed.
- **Nothing is guessed.** When the file allows two readings (a number format, a linguistic
  scale) the decision is `ambiguous` and the affected cells are errors until the caller
  chooses through `overrides`.
- **Nothing is executed.** Spreadsheets are read with SheetJS, cached values only:
  formulas are not evaluated, macros are not read, links are not followed. A formula
  without a cached value is reported.
- **Every value is traceable.** `model.origins[i][j]` lists the source cells (and text or
  linguistic term) of `model.values[i][j]`.

## Pipeline

| Step          | File                  | What it does                                                                                                     |
| ------------- | --------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Read          | `import/read.ts`      | XLSX, XLSM, XLS via SheetJS; CSV/TSV via Papa Parse. Format from the content (ZIP/CFB/text), not the extension.  |
| Encoding      | `import/encoding.ts`  | Byte order marks, strict UTF-8, else Windows-1254 (confirmed by Turkish-only letters, otherwise a warning).      |
| Delimiter     | `import/delimiter.ts` | Comma, semicolon or tab: the one that splits lines into the most consistent field count.                         |
| Number format | `import/numbers.ts`   | `1.234,56` vs `1,234.56`, spaces, apostrophes, `%`, exponents, Unicode minus. Ambiguous samples are reported.    |
| Structure     | `import/detect.ts`    | Title rows, header (one row, or group row + l/m/u row), alternative column, row numbers, special rows, criteria. |
| Values        | `import/build.ts`     | Number format and scale decisions, names, directions, values, weights and units; every problem with its cell.    |
| Profiles      | `import/profile.ts`   | `profileFromImport` and `parseImportProfile` (format version 1).                                                 |
| Messages      | `messages/`           | English and Turkish texts for every `validation.import.*` key.                                                   |

### What the structure detection recognises

- **Header** above the data, below any title rows; a merged group row above a row of
  `l / m / u` (also `low / mid / up`, `alt / orta / üst`).
- **Alternative column**: the leftmost mostly-text column (an id header such as
  `Alternatif`, `Supplier`, `Yıl` wins). A `No` / `Sıra` / `#` column of 1, 2, 3... is
  ignored as row numbers. Without one, names `A1, A2...` are generated with a warning.
- **Directions**: a row of `benefit / cost`, `max / min`, `fayda / maliyet`, `+ / −`,
  `↑ / ↓` (also `B / C` in a row labelled `Yön`, `Type`...), above or below the header; or
  a header suffix such as `Fiyat (min)`, `Quality [max]`, `Risk ↓`.
- **Special rows**, kept out of the alternatives: units (`Birim`), weights (`Ağırlık`,
  offered as `model.weights` but never applied), totals and averages, the AI/AAI rows of
  printed MARCOS tables, blank rows and notes below the table.
- **Criterion layouts**: crisp numbers; TFN columns (`C1_l, C1_m, C1_u`, `Kalite (m)`...,
  or a two-row header); TFNs in one cell (`(1; 2; 3)`, `[0,2; 0,3; 0,5]`); linguistic
  terms matched by id, abbreviation or English/Turkish label against the candidate scales
  (default: the predefined rating scales of `@mateo/fuzzy`).
- **Missing markers**: empty cells, `-`, `N/A`, `yok`, `?`... are reported as missing.

## Fixtures

`fixtures/files` holds 28 real-world-like files (TR and EN, CSV/TSV/TXT in UTF-8,
UTF-8 with BOM, UTF-16 and Windows-1254, XLSX, XLSM and XLS) written by
`fixtures/generate.ts`. Their expected structure, values and issues are in
`src/import/fixtures.test.ts`, which also checks for every file that no value is
invented and every missing value is reported.

```sh
node packages/io/fixtures/generate.ts    # rewrite the fixtures after changing the generator
pnpm --filter @mateo/io test             # unit, structure and fixture tests
pnpm --filter @mateo/io test:coverage    # fails below 90 % coverage
```

## Dependencies

- `xlsx` is SheetJS 0.20.3 through the `@e965/xlsx` npm mirror, which republishes the
  official SheetJS builds with npm provenance. The `xlsx` package on the npm registry stops
  at 0.18.5, which has known vulnerabilities when reading untrusted files
  (CVE-2023-30533, CVE-2024-22363); SheetJS distributes newer versions from its own CDN.
- `papaparse` for CSV/TSV.

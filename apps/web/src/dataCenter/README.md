# Data Center and import wizard (P1.10)

The `/data-center` route lists the datasets, original files, import history and import profiles of the open project, and runs the import wizard on top of the headless engine of `@mateo/io` (P1.9). It loads on first visit.

| File                 | What it does                                                                                                          |
| -------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `DataCenterPage.tsx` | Route: datasets, original files (download), import history with stored warnings, profiles, paste listener             |
| `ImportWizard.tsx`   | The dialog: step navigation, profile choice, confirm                                                                  |
| `steps.tsx`          | One component per step: file, worksheet, structure, columns, data types, missing values, validation, preview, confirm |
| `wizard.ts`          | Pure helpers: step list, readiness, override changes, pasted text as a file                                           |
| `dataset.ts`         | Pure: a confirmed `ProposedModel` → `Dataset` and the undoable command that adds it (plus scales)                     |
| `commit.ts`          | Confirm: stores the original file, adds the dataset, saves a profile, records the import                              |

## Rules the wizard follows

- **The wizard never decides for the user.** Every change (sheet, header row, number format, directions, left-out columns) becomes an `ImportOverrides` field and the file is imported again; `@mateo/io` is the only place that interprets files.
- **Errors block confirming.** That includes missing cells (never filled in) and criteria without a benefit/cost direction (never assumed: the user picks one in the Columns step). Warnings are listed and saved in the import history with the dataset.
- **Nothing reaches the project before the last step.** Confirming adds the original file byte for byte, the dataset as one undo step, and an import record (decisions, overrides, warnings).
- **Profiles** are `profileFromImport(result)` stored through `session.saveImportProfile`; choosing one in the first step starts the import with its overrides.
- **Pasted ranges** become a UTF-8 `.tsv` file, so they take the same path (and are stored like any other original file).
- File-derived text (headers, alternative names, column letters) is marked `translate="no"`; everything else is in the `dataCenter` catalog (`en` and `tr`).
- A weights row found in a file is shown in the preview but not stored yet; weights are set when a method runs (P1.12).

## Tests

- `pnpm test`: `dataCenter.test.ts` (readiness, overrides, dataset conversion with fixtures), `test/dataCenter.test.tsx` (the wizard end to end in jsdom: TR XLSX, EN CSV with fuzzy cells, ambiguous number format, pasted range, profiles, pseudo-locale and Turkish).
- `pnpm e2e` (builds first): `e2e/dataCenter.e2e.ts` imports a TR-locale XLSX and an EN-locale CSV with l/m/u columns into editable models, checks the stored files and history after a reload, and pastes a range.

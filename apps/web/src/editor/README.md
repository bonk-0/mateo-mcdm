# Decision matrix editor (P1.11)

The `/matrix` route edits the decision model of the open project; `/settings/scales` manages its linguistic scales.
Both load on first visit, so the spreadsheet grid does not slow down the start of the app.

| File                                        | What it does                                                                                       |
| ------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `EditorPage.tsx`                            | Route: no-project and no-dataset states, toolbar, validation summary, clipboard and undo shortcuts |
| `MatrixGrid.tsx`                            | AG Grid wrapper: columns, cell selection, keyboard, row and column drag                            |
| `CellEditor.tsx`                            | Popup editor: one input (crisp), three inputs l / m / u with live `l ≤ m ≤ u` check, term list     |
| `Panels.tsx`                                | Criteria and alternatives panels                                                                   |
| `BulkEditDialog.tsx`                        | Set, clear, add or multiply the selected cells                                                     |
| `ScaleManager.tsx`                          | Predefined and custom scales, term table, validation, static preview                               |
| `MembershipChart.tsx`                       | SVG chart of the terms' triangles                                                                  |
| `actions.ts`, `plan.ts`                     | What an edit does to the model (pure, tested without a browser)                                    |
| `cellText.ts`, `numbers.ts`, `clipboard.ts` | Parsing and formatting of typed and pasted text                                                    |
| `rows.ts`                                   | Row objects kept stable across edits, per-row issue counts                                         |

## Rules the editor follows

- **Every model edit is a command** from `@mateo/project` run through `session.execute`, so undo and redo, the dirty flag and autosave work for free. A paste that also adds rows and columns is one undo step (`composeCommands`).
- **Nothing is invented.** Empty cells stay empty; bulk add and multiply skip them. Text that does not fit its criterion (a word in a number column, a TFN with `l > m`) is refused and counted, never guessed.
- **AG Grid Community has no range selection or clipboard** (both are Enterprise). Selection (click, drag, Shift+click, Shift+arrows, row numbers) and copy, cut and paste are implemented here. Paste understands what Excel puts on the clipboard (tab-separated, quoted cells) and grows the grid when the data is larger than it.
- **Sorting and filtering only change the view.** Row dragging is paused while the view is sorted or filtered, because the display order is then not the model order.
- Texts of the packages (validation messages, scale names, undo labels) come through `useMessage` from the `packages` i18n namespace; everything else is in `packages/i18n/src/catalogs/*/matrix.json`.

## Tests

- `pnpm test`: unit tests of parsing, paste planning, actions, the 500 × 50 edit cost, and the pages with a stubbed grid.
- `pnpm e2e` (builds first): Playwright against the production build. It pastes 10 × 6 cells, edits, undoes, redoes, waits for autosave, reloads and reopens the project; checks the TFN rejection; and measures an edit at 500 × 50 (about 15 ms; the limit is 100 ms).

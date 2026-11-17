# Mateo — Phase 1 release notes

First usable release. Everything works offline, in English and Turkish.

## What you can do

- **Import** a decision matrix from Excel or CSV, or type it in a spreadsheet-style editor. Crisp numbers, fuzzy triangular numbers and linguistic scales are supported.
- **Weight** criteria with CRITIC, MEREC or SWARA.
- **Rank** alternatives with MARCOS or fuzzy MARCOS.
- **Explain** every result step by step, with formulas, values and a plain-language story.
- **Check sensitivity** by changing weights and seeing how the ranking responds.
- **Export** results.
- **Method Library** with worked examples you can open and run.

## Reliability

- Projects are saved automatically to a single `.mateo` file. The file is a transactional database, so an unexpected exit never leaves it half written; you reopen it with your last saved state.
- Large problems (500 alternatives × 50 criteria) run in well under a few seconds.

## Accessibility

Phase 1 screens are built to WCAG 2.1 AA: keyboard operation, visible focus, screen reader labels, and reduced-motion support.

## Known limits

- Windows installers are not code-signed yet, so Windows may warn on first run.
- Only CRITIC, MEREC, SWARA and MARCOS (crisp and fuzzy) are available. More methods follow in later phases.

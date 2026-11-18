# Mateo — Phase 1 release notes

First usable release. Mateo runs in your browser, in English and Turkish. After the first visit it also works offline, and you can install it from the browser like an app.

## What you can do

- **Import** a decision matrix from Excel or CSV, or type it in a spreadsheet-style editor. Crisp numbers, fuzzy triangular numbers and linguistic scales are supported.
- **Weight** criteria with CRITIC, MEREC or SWARA.
- **Rank** alternatives with MARCOS or fuzzy MARCOS.
- **Explain** every result step by step, with formulas, values and a plain-language story.
- **Check sensitivity** by changing weights and seeing how the ranking responds.
- **Export** results.
- **Method Library** with worked examples you can open and run.

## Reliability

- Projects are saved automatically in your browser, each as a single `.mateo` file. Every save replaces the file in one step, so an unexpected exit never leaves it half written; you reopen it with your last saved state.
- Download a project as a `.mateo` file to keep a copy anywhere or to open it on another computer, and open such a file again from the project menu or by dropping it on the start page.
- Large problems (500 alternatives × 50 criteria) run in well under a few seconds.

## Accessibility

Phase 1 screens are built to WCAG 2.1 AA: keyboard operation, visible focus, screen reader labels, and reduced-motion support.

## Known limits

- Only CRITIC, MEREC, SWARA and MARCOS (crisp and fuzzy) are available. More methods follow in later phases.

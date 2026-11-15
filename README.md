# Mateo

Mateo is a local-first desktop application for classical and fuzzy multi-criteria decision making (MCDM), with MARCOS and Fuzzy MARCOS as its flagship methods and animated, step-by-step explanations of every calculation.

- [`docs/plan.md`](docs/plan.md): product and technical plan (current).
- [`docs/phases/`](docs/phases/README.md): main phases and sub-phases.
- [`base-plan.md`](base-plan.md): original idea foundation.
- [`CONTRIBUTING.md`](CONTRIBUTING.md): setup, commands, layout and branch/commit/PR conventions.

## Quick start

```sh
corepack enable
pnpm install
pnpm verify       # typecheck, lint, format check, i18n check, tests
pnpm dev          # web app in the browser at http://localhost:5173
pnpm dev:desktop  # desktop app (needs Rust and the Tauri system libraries)
```

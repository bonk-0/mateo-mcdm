# Contributing to Mateo

Mateo is built in sub-phases (see [`docs/phases/`](docs/phases/README.md)). Each sub-phase is delivered on its own branch through one pull request (two at most if the work naturally splits). Read [`docs/plan.md`](docs/plan.md) and the sub-phase section before starting; the plan wins over `base-plan.md`.

All code, comments, docs and commit messages are in English. User-facing text goes through i18n with both `en` and `tr` entries (once P1.7 is merged).

## Setup

Requirements: the Node version in [`.nvmrc`](.nvmrc) and the pnpm version in the `packageManager` field of [`package.json`](package.json). With Corepack this is automatic:

```sh
nvm use            # or any Node version manager that reads .nvmrc
corepack enable    # provides the pinned pnpm
pnpm install
```

## Everyday commands

| Command            | What it does                                                      |
| ------------------ | ----------------------------------------------------------------- |
| `pnpm typecheck`   | Strict TypeScript check of the root config and every workspace.   |
| `pnpm lint`        | ESLint (type-aware) with zero warnings allowed.                   |
| `pnpm format`      | Formats the repo with Prettier (`format:check` only checks).      |
| `pnpm test`        | Runs Vitest for every package, app and the repo tooling.          |
| `pnpm test:watch`  | Vitest in watch mode.                                             |
| `pnpm i18n:check`  | Fails on missing or unused keys between `en` and `tr`.            |
| `pnpm dev`         | Web app with hot reload at http://localhost:5173.                 |
| `pnpm dev:desktop` | Desktop app (Tauri) around the same dev server.                   |
| `pnpm build`       | Production build of the web app into `apps/web/dist`.             |
| `pnpm verify`      | Everything CI runs, in the same order (except the desktop build). |

Run a single package with a filter, for example `pnpm --filter @mateo/engine test`.

## Repository layout

```
apps/
  web/          React UI (P1.7)
  desktop/      Tauri shell (P1.7)
packages/
  engine/       Pure calculation engine
  fuzzy/        Fuzzy number types and arithmetic
  methods/      One folder per MCDM method
  io/           Excel/CSV import and export
  project/      .mateo file format and storage
  explain/      Traces to animation timelines
  i18n/         Translation catalogs and formatting
  ui/           Shared UI components
tooling/        Repo-level tests (e.g. lint boundary checks)
```

Each workspace is an internal, source-first package: its `package.json` `exports` points at `src/index.ts`, and nothing is built before it is consumed. Import another workspace through its package name (`@mateo/engine`) and add it to `dependencies` as `"workspace:*"`; never reach into another package with a relative path. The same names resolve through the `paths` alias in [`tsconfig.base.json`](tsconfig.base.json).

### Shared configuration

- [`tsconfig.base.json`](tsconfig.base.json): strict settings for every package, no DOM and no Node types. Pure packages extend it directly, so browser or Node globals in engine code fail the type check.
- [`tsconfig.dom.json`](tsconfig.dom.json): adds DOM libraries and JSX for `ui`, `web` and `desktop`.
- [`eslint.config.js`](eslint.config.js): one flat config for the whole repo.
- [`.prettierrc.json`](.prettierrc.json): formatting. ESLint does not check formatting; Prettier does.
- [`vitest.config.ts`](vitest.config.ts): one Vitest project per workspace plus `tooling`.

### Engine purity

`engine`, `fuzzy`, `methods`, `io` and `project` must stay free of UI code (plan §4). ESLint rejects imports of `@mateo/ui`, `@mateo/explain`, the apps, React and Tauri from these packages, including relative paths that climb into them. [`tooling/lint-boundaries.test.ts`](tooling/lint-boundaries.test.ts) proves the rule keeps working. The engine is also deterministic: no I/O, no randomness, no clock.

## Desktop app

The desktop app is a Tauri 2 wrapper around the web build (`apps/desktop/src-tauri`). It needs a Rust toolchain and the [Tauri system prerequisites](https://v2.tauri.app/start/prerequisites/) for your OS. `pnpm dev:desktop` starts the web dev server and opens it in a native window; `pnpm --filter @mateo/desktop build` builds installers. CI builds a Linux `.deb` on every pull request.

The native menu (File: New, Open, Open Recent, Save, Save As) is built by the UI through the Tauri menu API, so its labels follow the UI language. Menu items and buttons trigger app commands (`apps/web/src/commands`); project file handling registers the real handlers in P1.8. Files opened through the `.mateo` association reach the UI as a `file.open` command.

The app icon comes from `apps/desktop/icons/source.svg`. After changing it, export a 1024×1024 `source.png` next to it and run `pnpm --filter @mateo/desktop icons`.

## Translations

All user-facing text goes through i18n (`packages/i18n`), including accessible labels such as `aria-label`.

- Catalogs live in `packages/i18n/src/catalogs/<language>/<namespace>.json`. English (`en`) is the source; Turkish (`tr`) must have exactly the same keys.
- Messages use ICU syntax: `{name}` for values, `{count, plural, one {# item} other {# items}}` for plurals. Use the typographic apostrophe (’) in text; a plain `'` is an escape character in ICU.
- In components use `useTranslation('<namespace>')`. Keys are type-checked against the English catalog.
- Method names (MARCOS, CRITIC…) stay as they are in every language. Mark text that must never be translated, such as method names and formatted numbers, with `translate="no"`.
- Format numbers and dates with the helpers from `useFormatters()` (apps/web) or `@mateo/i18n`, never with `toFixed` or string concatenation. The UI language, display number format and import number format are separate settings.
- `pnpm i18n:check` fails on missing or unused keys, invalid ICU messages and placeholders that differ between languages. A test in `apps/web` renders every screen with a pseudo-locale and fails on any visible text or label that bypassed i18n.

To add a namespace, add the JSON file to every language folder and register it in `packages/i18n/src/catalogs/index.ts`.

## Branches

- Branch from `main`. Never push directly to `main`.
- Name branches after the sub-phase: `p<phase>.<sub>/<short-slug>`, for example `p1.2/engine-core`. Small fixes outside a sub-phase use `fix/<slug>` or `docs/<slug>`. Branches created by automated agents (such as `claude/...`) are fine as long as the PR follows the rules below.
- Keep the branch up to date by merging `main` into it.

## Commits

- Imperative mood, capitalised, no trailing period, subject line at most 72 characters: `Add TFN arithmetic`, not `added tfn arithmetic.`
- Prefix the sub-phase ID when it helps: `P1.2: Add step trace types`.
- Explain the why in the body when it is not obvious from the diff.
- One logical change per commit; do not mix formatting churn with behaviour changes.

## Pull requests

- Title: `P<phase>.<sub> <sub-phase title>` for sub-phase work, otherwise a short imperative summary.
- Description: what changed, how it was checked, and a checklist of the sub-phase's **Done when** criteria.
- Stay inside the sub-phase scope. Anything needed outside it goes into the PR description instead of the diff. If a decision in `docs/plan.md` turns out to be wrong, propose the change in the PR rather than silently deviating.
- CI must be green: type check, lint, format check, tests (and, from P1.7 on, the i18n missing-key check).
- Every method implementation ships with a golden test that reproduces its reference paper's worked example.
- Squash or merge commits are both fine; keep the history readable.

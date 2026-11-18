# @mateo/solver

The engine's `LinearSolver` (see [`packages/engine/README.md`](../engine/README.md),
"Methods that solve optimization models") implemented with [HiGHS](https://highs.dev),
compiled to WebAssembly by the [`highs`](https://www.npmjs.com/package/highs) package
(sub-phase P2.2, `docs/plan.md` §5).

```ts
import { runMethod } from '@mateo/engine';
import { bwmMethod } from '@mateo/methods';
import { loadHighsSolver } from '@mateo/solver';

const solver = await loadHighsSolver(); // compiles the WebAssembly module: once
const record = runMethod(bwmMethod, input, { model: 'nonlinear' }, { solver });
```

- **Offline.** The binary (`highs/runtime`, about 3.5 MB) ships with the app. In the browser
  pass `locateFile` (or `wasmBinary`) so the loader finds the bundled file; the web app does
  this in `apps/web/src/workspace/solver.ts` and loads the solver only when a method needs
  it. In Node the file next to the package is found without options.
- **Deterministic.** Each solve uses a fresh native model with fixed options: no output, a
  fixed random seed, no time or iteration limit, feasibility tolerances of 1e-9. The same
  programme always gives the same bits with the same HiGHS build, which is why traces record
  the solver's name and version.
- **Statuses.** `optimal`, `infeasible` and `unbounded` map to the engine's statuses; every
  other HiGHS outcome is `failed`, with the HiGHS status in `reason`.
- **Version pin.** `highs` is pinned to an exact version here and in `apps/web` (which
  imports the binary's URL). Upgrading it can change the last digits of stored optima, so
  bump the versions of the methods that use the solver at the same time.

```sh
pnpm --filter @mateo/solver test
pnpm --filter @mateo/solver test:coverage   # fails below 90 % coverage
```

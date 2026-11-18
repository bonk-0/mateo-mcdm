import type { LinearSolver } from '@mateo/engine';
import { loadHighsSolver } from '@mateo/solver';
// The WebAssembly binary is emitted with the app build, so the solver works offline.
import highsWasmUrl from 'highs/runtime?url';

let loading: Promise<LinearSolver> | undefined;

/**
 * The optimization solver (HiGHS), loaded on first use and kept for the lifetime of the
 * worker. A failed load is not cached, so a later run tries again.
 */
export function loadSolver(): Promise<LinearSolver> {
  loading ??= loadHighsSolver({ locateFile: () => highsWasmUrl }).catch((error: unknown) => {
    loading = undefined;
    throw error;
  });
  return loading;
}

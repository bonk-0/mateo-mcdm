/**
 * @mateo/solver — the engine's `LinearSolver` implemented with HiGHS (WebAssembly).
 *
 * Methods never import this package: they receive a solver through `runMethod`. The app
 * loads it once, in the Web Worker that runs methods, and only when a method needs it.
 */
export const PACKAGE_NAME = '@mateo/solver';

export { createHighsSolver, loadHighsSolver } from './highs';

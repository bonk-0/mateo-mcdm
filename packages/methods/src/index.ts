/**
 * @mateo/methods — MCDM method implementations, one folder per method.
 *
 * - `critic`, `merec`: objective weighting methods (P1.5).
 * - `swara`: SWARA and fuzzy SWARA (IMF SWARA) (P1.5).
 * - `marcos`: MARCOS (P1.6).
 * - `fuzzy-marcos`: Fuzzy MARCOS with triangular fuzzy numbers (P1.6).
 * - `lopcow`, `fucom`, `bwm`: the remaining weighting methods (P2.2). BWM solves linear
 *   programmes and needs a `LinearSolver` (`@mateo/solver`) passed to `runMethod`.
 * - `vikor`, `edas`, `codas`, `waspas` (with `fuzzy-waspas`): the first ranking methods of
 *   Phase 2 (P2.4). Fuzzy VIKOR is deferred; fuzzy EDAS and CODAS use trapezoidal numbers
 *   and wait for P3.2 (docs/phases/phase-2.md, P2.1 decisions).
 * - `REFERENCE_FIXTURES`: the P1.4 worked examples as data (P1.17).
 */
export const PACKAGE_NAME = '@mateo/methods';

export * from '../bwm';
export * from '../codas';
export * from '../critic';
export * from '../edas';
export * from '../fucom';
export * from '../fuzzy-marcos';
export * from '../lopcow';
export * from '../marcos';
export * from '../merec';
export * from '../swara';
export * from '../vikor';
export * from '../waspas';
export * from './messages';
export * from './reference';

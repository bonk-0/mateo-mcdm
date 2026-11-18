/**
 * @mateo/methods — MCDM method implementations, one folder per method.
 *
 * - `critic`, `merec`: objective weighting methods (P1.5).
 * - `swara`: SWARA and fuzzy SWARA (IMF SWARA) (P1.5).
 * - `marcos`: MARCOS (P1.6).
 * - `fuzzy-marcos`: Fuzzy MARCOS with triangular fuzzy numbers (P1.6).
 * - `lopcow`, `fucom`, `bwm`: the remaining weighting methods (P2.2). BWM solves linear
 *   programmes and needs a `LinearSolver` (`@mateo/solver`) passed to `runMethod`.
 * - `copras`, `moora`, `aras`: the ranking methods of P2.5, each with its fuzzy variant
 *   (`fuzzy-copras`: defuzzification, then COPRAS; `fuzzy-moora` and `fuzzy-aras` (ARAS-F) are
 *   not yet verified against a published example).
 * - `dematel`: DEMATEL and fuzzy DEMATEL, with weights from prominence (P2.3).
 * - `REFERENCE_FIXTURES`: the P1.4 worked examples as data (P1.17).
 */
export const PACKAGE_NAME = '@mateo/methods';

export * from '../aras';
export * from '../bwm';
export * from '../copras';
export * from '../critic';
export * from '../dematel';
export * from '../fucom';
export * from '../fuzzy-marcos';
export * from '../lopcow';
export * from '../marcos';
export * from '../merec';
export * from '../moora';
export * from '../swara';
export * from './messages';
export * from './reference';

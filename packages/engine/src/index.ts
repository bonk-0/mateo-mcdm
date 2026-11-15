/**
 * @mateo/engine — the pure calculation core every method builds on.
 *
 * - `model`: criteria, alternatives, decision matrices, weight vectors.
 * - `validation`: errors and warnings with stable codes, plus shared input checks.
 * - `trace`: the step trace model, the `TraceBuilder`, traced crisp arithmetic and the
 *   trace auditor.
 * - `math`: normalization, reductions and ranking.
 * - `method`: the `Method` contract, parameters, the registry and `runMethod`.
 * - `determinism`: the guard that proves a method gives identical output on every run.
 *
 * See the package README for the guide to writing a method.
 */
export const PACKAGE_NAME = '@mateo/engine';

export * from './determinism';
export * from './errors';
export * from './math';
export * from './messages';
export * from './method';
export * from './model';
export * from './trace';
export * from './validation';

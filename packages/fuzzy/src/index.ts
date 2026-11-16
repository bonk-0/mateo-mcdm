/**
 * @mateo/fuzzy — triangular fuzzy numbers (TFN) for every fuzzy method of Mateo.
 *
 * - `tfn`: the `TFN` type `(l, m, u)` and its validation.
 * - `arithmetic`, `aggregation`, `defuzzification`: pure, separately named operations.
 * - `trace`: TFN cells in step traces and the traced operations `tfnOps`.
 * - `validation`: checks for TFN matrices and weights.
 * - `scales`, `predefined-scales`: linguistic scales and term → TFN conversion.
 *
 * See the package README for the guide to using it in a method.
 */
export const PACKAGE_NAME = '@mateo/fuzzy';

export * from './aggregation';
export * from './arithmetic';
export * from './defuzzification';
export * from './messages';
export * from './predefined-scales';
export * from './scales';
export {
  TFN_NUMBER_TYPE,
  fromCrisp,
  fromTuple,
  isDegenerate,
  isTfn,
  tfn,
  tfnEquals,
  tfnProblem,
  toTuple,
} from './tfn';
export type { TFN, TfnProblem, TfnTuple } from './tfn';
export * from './trace';
export * from './validation';

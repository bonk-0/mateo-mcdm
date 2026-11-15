import type { NumberTypeId } from '../model/number-type';
import type { WeightVector } from '../model/weights';
import type { Trace } from '../trace/types';
import type { ValidationResult } from '../validation/types';
import type { ParameterSchema, ParameterValuesOf } from './parameters';

export type MethodCategory = 'weighting' | 'ranking' | 'relationship' | 'risk';

export const METHOD_CATEGORIES: readonly MethodCategory[] = [
  'weighting',
  'ranking',
  'relationship',
  'risk',
];

export type InputKind =
  | 'decision-matrix'
  | 'weights'
  | 'criteria-order'
  | 'expert-judgements'
  | 'pairwise-comparisons'
  | (string & Record<never, never>);

/** One thing a method needs. Together the slots describe the shape of `TInput`. */
export interface InputSlot {
  /** Property name in the input object; also used in validation locations and traces. */
  readonly name: string;
  readonly kind: InputKind;
  readonly required: boolean;
  /** Number types the slot accepts. */
  readonly numberTypes: readonly NumberTypeId[];
  readonly descriptionKey?: string;
}

export type OutputKind =
  'weights' | 'ranking' | 'scores' | 'relationship' | (string & Record<never, never>);

/**
 * One thing a method produces. Declared so that pipelines can be checked without running
 * anything: a `weights` output can feed a `weights` input of the same number type
 * (docs/plan.md §6.4).
 */
export interface OutputSlot {
  /** Property name in the result object. */
  readonly name: string;
  readonly kind: OutputKind;
  readonly numberTypes: readonly NumberTypeId[];
}

/** A verified citation for the formulation a method implements. */
export interface Reference {
  /** Citation key, unique within the method (for example `stevic2020`). */
  readonly id: string;
  readonly authors: readonly string[];
  readonly year: number;
  readonly title: string;
  /** Journal, book or report series. */
  readonly source: string;
  readonly volume?: string;
  readonly issue?: string;
  readonly pages?: string;
  readonly doi?: string;
  /** Stable identifier or URL when there is no DOI. */
  readonly url?: string;
  readonly note?: string;
}

export interface MethodRun<TResult> {
  /** Plain JSON data: it is stored in the project file and compared between runs. */
  readonly result: TResult;
  readonly trace: Trace;
}

/**
 * The contract every method implements (docs/plan.md §6.1).
 *
 * `validate` and `run` must be pure: no I/O, no randomness, no clock, no mutation of
 * their arguments. The same input and parameters always give the same result and trace.
 *
 * `run` may assume that `validate` reported no errors for the same arguments. Callers go
 * through `runMethod`, which enforces that order.
 */
export interface Method<TInput, TSchema extends ParameterSchema, TResult> {
  /** Stable kebab-case id, for example `fuzzy-marcos`. */
  readonly id: string;
  /**
   * Semantic version of the implementation. Any change that can alter a result or the
   * trace of an existing input bumps it, because stored analyses are compared by it.
   */
  readonly version: string;
  readonly category: MethodCategory;
  /** i18n key of the display name. */
  readonly nameKey: string;
  readonly supportedNumberTypes: readonly NumberTypeId[];
  readonly inputSchema: readonly InputSlot[];
  readonly outputSchema: readonly OutputSlot[];
  /** Options with their defaults. Use `NO_PARAMETERS` when there are none. */
  readonly parameters: TSchema;
  readonly references: readonly Reference[];
  /**
   * Reports every problem of the input. Input comes from files and stored projects, so
   * `validate` must not trust its static type: use the `check*` helpers, which accept
   * `unknown`.
   */
  validate(input: TInput, params: ParameterValuesOf<TSchema>): ValidationResult;
  run(input: TInput, params: ParameterValuesOf<TSchema>): MethodRun<TResult>;
}

/** A method whose input, parameter and result types are not statically known. */
export type AnyMethod = Method<unknown, ParameterSchema, unknown>;

/** Declares a method and infers its type parameters. */
export function defineMethod<TInput, const TSchema extends ParameterSchema, TResult>(
  method: Method<TInput, TSchema, TResult>,
): Method<TInput, TSchema, TResult> {
  return method;
}

/** Result shape shared by weighting methods. */
export interface WeightingResult<T = number> {
  readonly weights: WeightVector<T>;
}

export interface RankedAlternative {
  readonly alternativeId: string;
  /** The value the ranking is based on. */
  readonly score: number;
  /** 1 is best. Tied alternatives share a rank according to the method's tie rule. */
  readonly rank: number;
}

/** Result shape shared by ranking methods. `ranking` is in input (alternative) order. */
export interface RankingResult {
  readonly ranking: readonly RankedAlternative[];
}

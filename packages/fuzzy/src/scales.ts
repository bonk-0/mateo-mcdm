/**
 * Linguistic scales: ordered lists of terms ("Poor", "Good"...) with the TFN each term
 * stands for, and the conversion of linguistic input to TFNs.
 */
import type { DecisionMatrix, Reference, TextRef, ValidationResult } from '@mateo/engine';
import {
  EngineError,
  ISSUE_CODES,
  checkMatrixStructure,
  createValidation,
  isMissing,
} from '@mateo/engine';
import type { MatrixStructureOptions } from '@mateo/engine';
import type { TFN } from './tfn';
import { TFN_NUMBER_TYPE, tfnProblem } from './tfn';
import { FUZZY_ISSUE_CODES } from './validation';

export interface LinguisticTerm {
  /** Stable id, unique within the scale. This is what a project file stores. */
  readonly id: string;
  /** An i18n key for predefined scales, literal text for scales made by the user. */
  readonly label: TextRef;
  /** Short form shown in matrix cells and accepted on import, for example `VG`. */
  readonly abbreviation: string;
  readonly value: TFN;
}

/**
 * `rating`: terms that rate an alternative on a criterion (decision matrix cells).
 * `comparison`: terms that compare one criterion with another (IMF SWARA).
 */
export type LinguisticScaleKind = 'rating' | 'comparison';

export interface LinguisticScale {
  /** Stable id, unique among the scales of a project. */
  readonly id: string;
  readonly name: TextRef;
  readonly kind: LinguisticScaleKind;
  /** From the lowest to the highest term. */
  readonly terms: readonly LinguisticTerm[];
  /** Where the scale was published, for the scales of reference papers. */
  readonly references?: readonly Reference[];
}

export interface ScaleCheckOptions {
  /** Name used in issue locations. Default `scale`. */
  readonly input?: string;
  /**
   * What to report when the terms are not in ascending order. Default `error`: a scale
   * is an ordered list by definition.
   */
  readonly notMonotonic?: 'ignore' | 'warning' | 'error';
}

/** How a term is matched: ids and abbreviations ignore case and surrounding spaces. */
function tokenOf(text: string): string {
  return text.trim().toLowerCase();
}

function isTextRef(value: unknown): value is TextRef {
  if (typeof value !== 'object' || value === null) return false;
  const { key, text } = value as { key?: unknown; text?: unknown };
  return (typeof key === 'string' && key !== '') || (typeof text === 'string' && text !== '');
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim() !== '';
}

/** True when `b` is higher than `a`: no component decreases and at least one increases. */
function isAbove(a: TFN, b: TFN): boolean {
  return a.l <= b.l && a.m <= b.m && a.u <= b.u && (a.l < b.l || a.m < b.m || a.u < b.u);
}

/**
 * Validates a scale that comes from the editor, an import or a project file. Never throws.
 *
 * A scale is valid when it has at least two terms; every term has an id, a label, an
 * abbreviation and a valid TFN; ids and abbreviations identify one term each (ignoring
 * case, and an abbreviation may not be the id of another term); and the terms are
 * monotonic: from each term to the next no component of the TFN decreases and at least
 * one increases.
 */
export function checkLinguisticScale(
  scale: unknown,
  options: ScaleCheckOptions = {},
): ValidationResult {
  const input = options.input ?? 'scale';
  const notMonotonic = options.notMonotonic ?? 'error';
  const v = createValidation();
  const candidate = scale as Partial<Record<keyof LinguisticScale, unknown>> | null;
  if (
    typeof candidate !== 'object' ||
    candidate === null ||
    !isNonEmptyString(candidate.id) ||
    !isTextRef(candidate.name) ||
    (candidate.kind !== 'rating' && candidate.kind !== 'comparison') ||
    !Array.isArray(candidate.terms)
  ) {
    v.error(ISSUE_CODES.inputMalformed, { params: { input }, location: { input } });
    return v.result();
  }

  const terms = candidate.terms as readonly unknown[];
  if (terms.length < 2) {
    v.error(FUZZY_ISSUE_CODES.scaleTooFewTerms, {
      params: { count: terms.length },
      location: { input },
    });
  }

  const owners = new Map<string, number>();
  const values: (TFN | undefined)[] = [];
  terms.forEach((term, index) => {
    const { id, label, abbreviation, value } = (
      typeof term === 'object' && term !== null ? term : {}
    ) as Partial<Record<keyof LinguisticTerm, unknown>>;
    const row = typeof id === 'string' ? { index, id } : { index };
    const location = { input, row };
    if (!isNonEmptyString(id) || !isNonEmptyString(abbreviation) || !isTextRef(label)) {
      v.error(FUZZY_ISSUE_CODES.scaleInvalidTerm, { params: { position: index + 1 }, location });
      values.push(undefined);
      return;
    }
    for (const name of new Set([tokenOf(id), tokenOf(abbreviation)])) {
      if (owners.has(name)) {
        v.error(FUZZY_ISSUE_CODES.scaleDuplicateTerm, { params: { term: name }, location });
      } else {
        owners.set(name, index);
      }
    }
    const problem = tfnProblem(value);
    if (problem === 'order') {
      const { l, m, u } = value as TFN;
      v.error(FUZZY_ISSUE_CODES.tfnInvalidOrder, { params: { l, m, u }, location });
    } else if (problem !== undefined) {
      v.error(FUZZY_ISSUE_CODES.tfnInvalidValue, { location });
    }
    values.push(problem === undefined ? (value as TFN) : undefined);
  });

  if (notMonotonic !== 'ignore') {
    for (let index = 1; index < values.length; index += 1) {
      const previous = values[index - 1];
      const current = values[index];
      if (previous === undefined || current === undefined || isAbove(previous, current)) continue;
      const term = terms[index] as LinguisticTerm;
      const issue = {
        params: { term: term.id, previous: (terms[index - 1] as LinguisticTerm).id },
        location: { input, row: { index, id: term.id } },
      };
      if (notMonotonic === 'error') v.error(FUZZY_ISSUE_CODES.scaleNotMonotonic, issue);
      else v.warning(FUZZY_ISSUE_CODES.scaleNotMonotonic, issue);
    }
  }
  return v.result();
}

function deepFreeze<T>(value: T): T {
  if (typeof value === 'object' && value !== null && !Object.isFrozen(value)) {
    Object.freeze(value);
    Object.values(value).forEach(deepFreeze);
  }
  return value;
}

/**
 * Declares a scale in code. Throws `EngineError('INVALID_ARGUMENT')` listing the problems
 * when the scale is not valid, and returns it deeply frozen. Scales made by the user are
 * validated with {@link checkLinguisticScale} instead.
 */
export function defineScale(scale: LinguisticScale): LinguisticScale {
  const result = checkLinguisticScale(scale);
  if (!result.ok) {
    throw new EngineError(
      'INVALID_ARGUMENT',
      `The linguistic scale "${String((scale as { id?: unknown } | null)?.id)}" is not valid: ` +
        result.errors.map((issue) => issue.code).join(', '),
      { issues: result.errors },
    );
  }
  return deepFreeze(structuredCloneScale(scale));
}

function structuredCloneScale(scale: LinguisticScale): LinguisticScale {
  return {
    ...scale,
    terms: scale.terms.map((term) => ({ ...term, value: { ...term.value } })),
    ...(scale.references === undefined
      ? {}
      : { references: scale.references.map((reference) => ({ ...reference })) }),
  };
}

const lookupCache = new WeakMap<LinguisticScale, ReadonlyMap<string, LinguisticTerm>>();

function lookupOf(scale: LinguisticScale): ReadonlyMap<string, LinguisticTerm> {
  let lookup = lookupCache.get(scale);
  if (lookup === undefined) {
    const built = new Map<string, LinguisticTerm>();
    // Ids win over abbreviations; within each, the first term wins. A valid scale has no clash.
    for (const term of scale.terms) {
      if (!built.has(tokenOf(term.id))) built.set(tokenOf(term.id), term);
    }
    for (const term of scale.terms) {
      if (!built.has(tokenOf(term.abbreviation))) built.set(tokenOf(term.abbreviation), term);
    }
    lookup = built;
    lookupCache.set(scale, lookup);
  }
  return lookup;
}

/**
 * The term a piece of linguistic input names: its id or its abbreviation, ignoring case and
 * surrounding spaces (`"VG"`, `" vg "`, `"very-good"`). `undefined` for anything else.
 */
export function findTerm(scale: LinguisticScale, term: unknown): LinguisticTerm | undefined {
  return typeof term === 'string' ? lookupOf(scale).get(tokenOf(term)) : undefined;
}

/**
 * Linguistic term → TFN. Throws `EngineError('INVALID_ARGUMENT')` for a term the scale does
 * not have; use {@link findTerm} or {@link linguisticMatrixToTfn} to validate user data.
 */
export function termToTfn(scale: LinguisticScale, term: string): TFN {
  const found = findTerm(scale, term);
  if (found === undefined) {
    throw new EngineError(
      'INVALID_ARGUMENT',
      `The linguistic scale "${scale.id}" has no term "${String(term)}".`,
      { scale: scale.id, term },
    );
  }
  return found.value;
}

export interface LinguisticMatrixConversion {
  readonly validation: ValidationResult;
  /** Present only when the validation has no errors. */
  readonly matrix?: DecisionMatrix<TFN>;
}

/**
 * Converts a decision matrix of linguistic terms (ids or abbreviations) to TFNs. Every
 * cell that is not a term of the scale is reported as `scale.unknown-term` with its
 * location; nothing is guessed or skipped. The criteria of the converted matrix have the
 * number type `tfn`.
 */
export function linguisticMatrixToTfn(
  scale: LinguisticScale,
  matrix: unknown,
  options: MatrixStructureOptions = {},
): LinguisticMatrixConversion {
  const input = options.input ?? 'matrix';
  const v = createValidation();
  const structure = checkMatrixStructure(matrix, options);
  v.add(structure);
  if (structure.errors.some((issue) => issue.code === ISSUE_CODES.inputMalformed)) {
    return { validation: v.result() };
  }

  const source = matrix as DecisionMatrix<unknown>;
  const values = source.values.map((cells, rowIndex) => {
    const alternative = source.alternatives[rowIndex];
    const row =
      alternative === undefined ? { index: rowIndex } : { index: rowIndex, id: alternative.id };
    return cells.map((cell, columnIndex) => {
      const term = findTerm(scale, cell);
      const criterion = source.criteria[columnIndex];
      if (term === undefined && !isMissing(cell) && criterion !== undefined) {
        v.error(FUZZY_ISSUE_CODES.scaleUnknownTerm, {
          params: {
            term: typeof cell === 'string' || typeof cell === 'number' ? cell : typeof cell,
            scale: scale.id,
          },
          location: { input, row, column: { index: columnIndex, id: criterion.id } },
        });
      }
      return term?.value;
    });
  });

  const validation = v.result();
  if (!validation.ok) return { validation };
  return {
    validation,
    matrix: {
      alternatives: source.alternatives,
      criteria: source.criteria.map((criterion) => ({ ...criterion, numberType: TFN_NUMBER_TYPE })),
      values: values as TFN[][],
    },
  };
}

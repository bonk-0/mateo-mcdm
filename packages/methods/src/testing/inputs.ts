/** Builds method inputs from the P1.4 reference fixtures. */
import type { DecisionMatrix, NumberTypeId, WeightVector } from '@mateo/engine';
import { textLiteral } from '@mateo/engine';
import type { TFN } from '@mateo/fuzzy';

interface FixtureInput<T> {
  readonly alternatives: readonly string[];
  readonly criteria: readonly {
    readonly id: string;
    readonly name?: string;
    readonly direction: string;
  }[];
  readonly matrix: readonly (readonly T[])[];
  readonly weights: readonly T[];
}

/** Alternative ids are the fixture's alternative names, so fixture row labels address them. */
function matrixFrom<T, U>(
  input: Omit<FixtureInput<T>, 'weights'>,
  numberType: NumberTypeId,
  convert: (value: T) => U,
): DecisionMatrix<U> {
  return {
    alternatives: input.alternatives.map((id) => ({ id, name: textLiteral(id) })),
    criteria: input.criteria.map((criterion) => ({
      id: criterion.id,
      name: textLiteral(criterion.name ?? criterion.id),
      direction: criterion.direction as 'benefit' | 'cost',
      numberType,
    })),
    values: input.matrix.map((row) => row.map(convert)),
  };
}

function weightsFrom<T, U>(
  input: FixtureInput<T>,
  numberType: NumberTypeId,
  convert: (value: T) => U,
): WeightVector<U> {
  return {
    numberType,
    entries: input.criteria.map((criterion, j) => ({
      criterionId: criterion.id,
      value: convert(input.weights[j] as T),
    })),
  };
}

export function crispInput(input: FixtureInput<number>) {
  const id = (x: number) => x;
  return { matrix: matrixFrom(input, 'crisp', id), weights: weightsFrom(input, 'crisp', id) };
}

const toTfn = (tuple: readonly number[]): TFN => ({
  l: tuple[0] as number,
  m: tuple[1] as number,
  u: tuple[2] as number,
});

export function tfnInput(input: FixtureInput<readonly number[]>) {
  return { matrix: matrixFrom(input, 'tfn', toTfn), weights: weightsFrom(input, 'tfn', toTfn) };
}

/** The decision matrix of a weighting-method fixture, which has no weights. */
export function crispMatrixInput(input: Omit<FixtureInput<number>, 'weights'>) {
  return { matrix: matrixFrom(input, 'crisp', (x: number) => x) };
}

/** A SWARA input from a fixture: criteria in importance order and the expert assessments. */
export function orderedCriteria(criteria: readonly { id: string; name: string }[]) {
  return criteria.map(({ id, name }) => ({ id, name: textLiteral(name) }));
}

/**
 * A small hand-made input for validation and property tests: alternatives `a1…`, criteria
 * `c1…` and, when given, the weights.
 */
export function smallCrispInput(
  values: readonly (readonly number[])[],
  directions: readonly ('benefit' | 'cost')[],
  weights: readonly number[] = directions.map(() => 1 / directions.length),
) {
  return crispInput({
    alternatives: values.map((_, i) => `a${i + 1}`),
    criteria: directions.map((direction, j) => ({ id: `c${j + 1}`, direction })),
    matrix: values,
    weights,
  });
}

/** As `smallCrispInput`, for triangular fuzzy numbers given as `[l, m, u]` tuples. */
export function smallTfnInput(
  values: readonly (readonly (readonly number[])[])[],
  directions: readonly ('benefit' | 'cost')[],
  weights: readonly (readonly number[])[],
) {
  return tfnInput({
    alternatives: values.map((_, i) => `a${i + 1}`),
    criteria: directions.map((direction, j) => ({ id: `c${j + 1}`, direction })),
    matrix: values,
    weights,
  });
}

/** A small crisp decision matrix with generated ids `a1…`, `c1…`, for property and validation tests. */
export function smallMatrix(
  values: readonly (readonly number[])[],
  directions: readonly ('benefit' | 'cost')[],
): DecisionMatrix<number> {
  return {
    alternatives: values.map((_, i) => ({ id: `a${i + 1}`, name: textLiteral(`A${i + 1}`) })),
    criteria: directions.map((direction, j) => ({
      id: `c${j + 1}`,
      name: textLiteral(`C${j + 1}`),
      direction,
      numberType: 'crisp',
    })),
    values: values.map((row) => [...row]),
  };
}

/** The crisp weight vector of {@link smallMatrix}: one value per criterion. */
export function smallWeights(...values: number[]): WeightVector {
  return {
    numberType: 'crisp',
    entries: values.map((value, j) => ({ criterionId: `c${j + 1}`, value })),
  };
}

/** A small TFN decision matrix with generated ids, like {@link smallMatrix}. */
export function smallTfnMatrix(
  values: readonly (readonly TFN[])[],
  directions: readonly ('benefit' | 'cost')[],
): DecisionMatrix<TFN> {
  return {
    alternatives: values.map((_, i) => ({ id: `a${i + 1}`, name: textLiteral(`A${i + 1}`) })),
    criteria: directions.map((direction, j) => ({
      id: `c${j + 1}`,
      name: textLiteral(`C${j + 1}`),
      direction,
      numberType: 'tfn',
    })),
    values: values.map((row) => [...row]),
  };
}

/** The TFN weight vector of {@link smallTfnMatrix}. */
export function smallTfnWeights(...values: TFN[]): WeightVector<TFN> {
  return {
    numberType: 'tfn',
    entries: values.map((value, j) => ({ criterionId: `c${j + 1}`, value })),
  };
}

/** The degenerate-TFN copy `(x, x, x)` of a crisp matrix, for crisp-equivalence tests. */
export function asTfnMatrix(matrix: DecisionMatrix<number>): DecisionMatrix<TFN> {
  return {
    alternatives: matrix.alternatives,
    criteria: matrix.criteria.map((criterion) => ({ ...criterion, numberType: 'tfn' })),
    values: matrix.values.map((row) => row.map((x) => ({ l: x, m: x, u: x }))),
  };
}

/** The degenerate-TFN copy of crisp weights. */
export function asTfnWeights(weights: WeightVector): WeightVector<TFN> {
  return {
    numberType: 'tfn',
    entries: weights.entries.map((entry) => ({
      criterionId: entry.criterionId,
      value: { l: entry.value, m: entry.value, u: entry.value },
    })),
  };
}

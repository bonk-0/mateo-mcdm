/** Builds method inputs from the P1.4 reference fixtures. */
import type { DecisionMatrix, NumberTypeId, WeightVector } from '@mateo/engine';
import { textLiteral } from '@mateo/engine';
import type { TFN } from '@mateo/fuzzy';

interface FixtureInput<T> {
  readonly alternatives: readonly string[];
  readonly criteria: readonly {
    readonly id: string;
    readonly name: string;
    readonly direction: string;
  }[];
  readonly matrix: readonly (readonly T[])[];
  readonly weights: readonly T[];
}

/** Alternative ids are the fixture's alternative names, so fixture row labels address them. */
function matrixFrom<T, U>(
  input: FixtureInput<T>,
  numberType: NumberTypeId,
  convert: (value: T) => U,
): DecisionMatrix<U> {
  return {
    alternatives: input.alternatives.map((id) => ({ id, name: textLiteral(id) })),
    criteria: input.criteria.map((criterion) => ({
      id: criterion.id,
      name: textLiteral(criterion.name),
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

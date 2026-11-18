/**
 * English texts for the keys the engine itself emits (ICU message format).
 * English is the source language; `tr.ts` must define exactly the same keys.
 */
export const en = {
  'trace.axis.weight': 'Weight',

  'validation.input.malformed':
    'The {input} input is missing or does not have the expected structure.',

  'validation.matrix.no-alternatives': 'The decision matrix has no alternatives.',
  'validation.matrix.no-criteria': 'The decision matrix has no criteria.',
  'validation.matrix.too-few-alternatives':
    'This method needs at least {min, number} alternatives; the matrix has {count, number}.',
  'validation.matrix.too-few-criteria':
    'This method needs at least {min, number} criteria; the matrix has {count, number}.',
  'validation.matrix.row-count-mismatch':
    'The matrix has {rows, number} rows of values for {alternatives, number} alternatives.',
  'validation.matrix.column-count-mismatch':
    'This row has {cells, number} values for {criteria, number} criteria.',
  'validation.matrix.duplicate-alternative': 'The alternative id "{id}" is used more than once.',
  'validation.matrix.duplicate-criterion': 'The criterion id "{id}" is used more than once.',
  'validation.matrix.invalid-direction':
    'Criterion "{id}" must be marked as either benefit or cost.',
  'validation.matrix.unsupported-number-type':
    'Criterion "{id}" uses the number type "{numberType}", which this method does not support.',
  'validation.matrix.missing-value':
    'This cell is empty. Missing values are never filled in automatically.',
  'validation.matrix.invalid-value': 'This cell does not contain a valid number.',
  'validation.matrix.negative-value':
    'This cell contains {value, number}; this method does not accept negative values.',
  'validation.matrix.non-positive-value':
    'This cell contains {value, number}; this method needs values greater than zero.',
  'validation.matrix.constant-criterion':
    'Every alternative has the same value on criterion "{id}", so it cannot distinguish between them.',

  'validation.weights.empty': 'No criterion weights were given.',
  'validation.weights.missing': 'Criterion "{id}" has no weight.',
  'validation.weights.unknown-criterion':
    'A weight was given for "{id}", which is not a criterion of this model.',
  'validation.weights.duplicate': 'Criterion "{id}" has more than one weight.',
  'validation.weights.invalid-value': 'The weight of criterion "{id}" is not a valid number.',
  'validation.weights.negative':
    'The weight of criterion "{id}" is {value, number}; weights cannot be negative.',
  'validation.weights.zero-sum': 'All weights are zero.',
  'validation.weights.not-normalized': 'The weights sum to {sum, number}, not 1.',

  'validation.parameter.unknown': 'This method has no parameter named "{name}".',
  'validation.parameter.invalid-type': 'The value of parameter "{name}" has the wrong type.',
  'validation.parameter.out-of-range':
    'The value {value, number} of parameter "{name}" is outside the allowed range.',
  'validation.parameter.not-integer':
    'Parameter "{name}" must be a whole number; {value, number} is not.',
  'validation.parameter.invalid-option': '"{value}" is not a valid option for parameter "{name}".',

  'validation.solver.unavailable':
    'This method needs the optimization solver, which could not be loaded.',
  'validation.solver.failed':
    'The optimization solver ({solver}) could not solve this model (status: {status}). Check the input values and try again.',
} as const;

export type EngineMessageKey = keyof typeof en;

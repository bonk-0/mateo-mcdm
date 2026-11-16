import type { Trace, TraceValue } from '@mateo/engine';
import { walkDerivation } from '@mateo/engine';

/** The numbers of a trace value: the number itself, or the components of a composite. */
export function numbersOf(value: TraceValue): number[] {
  if (typeof value === 'number') return [value];
  if (value !== null && typeof value === 'object') return Object.values(value.components);
  return [];
}

/**
 * Every number a trace holds: the value of every cell and of every node of every
 * derivation. The provenance tests use it to prove that nothing shown was made up.
 */
export function traceNumbers(trace: Trace): Set<number> {
  const numbers = new Set<number>();
  const add = (value: TraceValue) => {
    for (const number of numbersOf(value)) numbers.add(number);
  };
  for (const step of trace.steps) {
    for (const row of step.output.cells) {
      for (const cell of row) {
        add(cell.value);
        walkDerivation(cell.derivation, (node) => {
          if (node.kind !== 'range') add(node.value);
        });
      }
    }
  }
  return numbers;
}

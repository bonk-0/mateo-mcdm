import { EngineError } from '../errors';
import type { LinearSolver } from '../solver/linear-program';
import type { Method } from '../method/method';
import type { ParameterSchema, ParameterValuesOf } from '../method/parameters';
import type { MethodRunRecord } from '../method/run';
import { runMethod } from '../method/run';
import { canonicalJson, deepClone, deepFreeze } from './canonical';

export interface DeterminismOptions {
  /** How many times to run. Default 3, minimum 2. */
  readonly runs?: number;
  /** Passed to `runMethod` for methods that need a solver. */
  readonly solver?: LinearSolver;
}

/**
 * The determinism guard (docs/plan.md §2 principle 6, §13). Runs a method several times
 * on deeply frozen copies of the input and throws `EngineError('NON_DETERMINISTIC')`
 * unless every run returns exactly the same record: result, trace, parameters and
 * warnings. A method that mutates its input fails too, because the input is frozen.
 *
 * Every method package calls this in its tests. Returns the record of the first run.
 */
export function assertDeterministic<TInput, TSchema extends ParameterSchema, TResult>(
  method: Method<TInput, TSchema, TResult>,
  input: TInput,
  params?: Partial<ParameterValuesOf<TSchema>>,
  options: DeterminismOptions = {},
): MethodRunRecord<TResult, TSchema> {
  const runs = Math.max(2, Math.trunc(options.runs ?? 3));
  const frozenParams = params === undefined ? undefined : deepFreeze(deepClone(params));
  let first: MethodRunRecord<TResult, TSchema> | undefined;
  let expected = '';

  for (let run = 1; run <= runs; run += 1) {
    // A fresh copy per run: identical output must not depend on object identity.
    const record = runMethod(
      method,
      deepFreeze(deepClone(input)),
      frozenParams,
      options.solver === undefined ? {} : { solver: options.solver },
    );
    const actual = canonicalJson(record);
    if (first === undefined) {
      first = record;
      expected = actual;
    } else if (actual !== expected) {
      throw new EngineError(
        'NON_DETERMINISTIC',
        `Method "${method.id}" is not deterministic: run ${run} differs from run 1 at ${firstDifference(expected, actual)}.`,
        { methodId: method.id, run },
      );
    }
  }
  return first as MethodRunRecord<TResult, TSchema>;
}

function firstDifference(a: string, b: string): string {
  let index = 0;
  while (index < a.length && index < b.length && a[index] === b[index]) index += 1;
  const from = Math.max(0, index - 40);
  return `character ${index}: "…${a.slice(from, index + 20)}" vs "…${b.slice(from, index + 20)}"`;
}

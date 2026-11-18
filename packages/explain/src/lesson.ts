import type { CellRef, Trace, TraceStep } from '@mateo/engine';
import { findStep, getStep } from '@mateo/engine';
import { formulaOfCell } from './cell';
import { ExplainError } from './errors';
import { buildRankingStory, orderValue } from './story';
import type { ExplainSequence, Lesson, LessonFocus, LessonStep } from './types';

function sourcesOf(trace: Trace, steps: readonly TraceStep[]): string[] {
  const own = new Set(steps.map((step) => step.id));
  const sources = new Set<string>();
  for (const step of steps) {
    for (const source of step.sources) {
      if (source.kind === 'step' && !own.has(source.step)) sources.add(source.step);
    }
  }
  return trace.steps.filter((step) => sources.has(step.id)).map((step) => step.id);
}

/**
 * The lesson of a method run: the lesson steps of its sequence with the trace steps each one
 * covers, the parts the learner goes through and the earlier steps drawn beside them.
 *
 * Throws {@link ExplainError} when the sequence and the trace do not fit: every step of the
 * trace must be taught by exactly one lesson step, in trace order, so a new step of a method
 * can never be left unexplained silently.
 */
export function buildLesson(trace: Trace, sequence: ExplainSequence): Lesson {
  if (trace.methodId !== sequence.methodId) {
    throw new ExplainError(
      'METHOD_MISMATCH',
      `The lesson of "${sequence.methodId}" cannot explain a trace of "${trace.methodId}".`,
      { sequence: sequence.methodId, trace: trace.methodId },
    );
  }
  const taught = new Map<string, string>();
  for (const plan of sequence.lesson) {
    for (const id of plan.steps) {
      const other = taught.get(id);
      if (other !== undefined) {
        throw new ExplainError(
          'INVALID_PLAN',
          `The step "${id}" is taught by both "${other}" and "${plan.id}".`,
          { step: id },
        );
      }
      taught.set(id, plan.id);
      if (findStep(trace, id) === undefined && !plan.optional?.includes(id)) {
        throw new ExplainError('MISSING_STEP', `The trace has no step "${id}".`, { step: id });
      }
    }
  }
  for (const step of trace.steps) {
    if (!taught.has(step.id)) {
      throw new ExplainError(
        'UNPLANNED_STEP',
        `The lesson of "${sequence.methodId}" does not teach the step "${step.id}".`,
        { step: step.id },
      );
    }
  }

  let last = -1;
  const steps = sequence.lesson.map((plan, index): LessonStep => {
    const present = plan.steps.flatMap((id) => findStep(trace, id) ?? []);
    for (const step of present) {
      if (step.index < last) {
        throw new ExplainError(
          'INVALID_PLAN',
          `The step "${step.id}" is taught after a later step of the trace.`,
          { step: step.id },
        );
      }
      last = step.index;
    }
    return {
      id: plan.id,
      index,
      steps: present.map((step) => step.id),
      parts: present.filter((step) => step.formulas.length > 0).map((step) => step.id),
      sources: sourcesOf(trace, present),
      story: plan.story === true,
    };
  });
  return { methodId: trace.methodId, textKey: sequence.textKey, steps };
}

/** Whether the trace can be explained with this sequence, without throwing. */
export function fitsLesson(trace: Trace, sequence: ExplainSequence): boolean {
  try {
    buildLesson(trace, sequence);
    return true;
  } catch (error) {
    if (error instanceof ExplainError) return false;
    throw error;
  }
}

/**
 * What a lesson on the user's own data follows: the alternative that ranks first and the
 * criterion with the largest weight. Both are read from the trace; fuzzy weights are compared
 * by their most likely value.
 */
export function resultFocus(trace: Trace, sequence: ExplainSequence): LessonFocus {
  const winner = sequence.story
    ? buildRankingStory(trace, sequence.story)?.winner.item.id
    : undefined;
  let heaviest: string | undefined;
  const weights = sequence.weights === undefined ? undefined : findStep(trace, sequence.weights);
  if (weights !== undefined && weights.output.rows.length === 1) {
    let best = -Infinity;
    weights.output.columns.forEach((column, c) => {
      const value = orderValue(weights.output.cells[0]?.[c]?.value ?? null);
      if (value !== null && value > best) {
        best = value;
        heaviest = column.id;
      }
    });
  }
  return {
    ...(winner === undefined ? {} : { row: winner }),
    ...(heaviest === undefined ? {} : { column: heaviest }),
  };
}

/**
 * The cell of a step that is explained when the learner has not picked one: a cell produced
 * by a formula, on the focus row and column where the step has them, else on the focus row,
 * else on the focus column, else the first one. Rows of reference solutions come after the
 * alternatives. A step without formulas gives its first cell.
 */
export function exampleCell(trace: Trace, stepId: string, focus: LessonFocus = {}): CellRef | null {
  const step = getStep(trace, stepId);
  const { rows, columns, cells } = step.output;
  const candidates: { row: number; column: number; score: number }[] = [];
  rows.forEach((row, r) => {
    columns.forEach((column, c) => {
      const cell = cells[r]?.[c];
      if (cell === undefined) return;
      const computed = formulaOfCell(step, cell) !== null;
      const score =
        (computed ? 8 : 0) +
        (row.kind === 'reference' ? 0 : 4) +
        (row.id === focus.row ? 2 : 0) +
        (column.id === focus.column ? 1 : 0);
      candidates.push({ row: r, column: c, score });
    });
  });
  let best: (typeof candidates)[number] | undefined;
  for (const candidate of candidates)
    if (best === undefined || candidate.score > best.score) best = candidate;
  return best === undefined
    ? null
    : { step: step.id, row: rows[best.row]!.id, column: columns[best.column]!.id };
}

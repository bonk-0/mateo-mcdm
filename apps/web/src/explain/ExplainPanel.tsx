import type { Trace } from '@mateo/engine';
import type { ExplainSequence, Lesson } from '@mateo/explain';
import { buildLesson, fitsLesson, resultFocus, sequenceFor } from '@mateo/explain';
import { useMemo, type ReactNode } from 'react';
import { LessonView } from './Lesson';

export interface Explanation {
  readonly sequence: ExplainSequence;
  readonly lesson: Lesson;
}

/**
 * The lesson of a stored trace, or `null` when its method has no lesson or the trace was
 * written by a version of the method whose steps the lesson does not know.
 */
export function explanationOf(trace: Trace): Explanation | null {
  const sequence = sequenceFor(trace.methodId);
  if (!sequence || !fitsLesson(trace, sequence)) return null;
  return { sequence, lesson: buildLesson(trace, sequence) };
}

/**
 * "How was this calculated?" of one analysis: the method's lesson on the user's own data.
 * With `followResult` it follows the alternative that ranks first and the heaviest criterion,
 * so that the lesson answers why the result is what it is.
 */
export function ExplainPanel({
  trace,
  explanation,
  followResult = false,
  finish,
}: {
  trace: Trace;
  explanation: Explanation;
  followResult?: boolean;
  finish?: ReactNode;
}) {
  const { sequence, lesson } = explanation;
  const focus = useMemo(
    () => (followResult ? resultFocus(trace, sequence) : {}),
    [followResult, trace, sequence],
  );
  return (
    <LessonView trace={trace} sequence={sequence} lesson={lesson} focus={focus} finish={finish} />
  );
}

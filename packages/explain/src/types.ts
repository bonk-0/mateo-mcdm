/**
 * A lesson step: one idea of a method, taught on one or more steps of the trace.
 *
 * Its texts live in the `explain` catalog under `lessons.<textKey>.steps.<id>`: `title`
 * (a short name), `idea` (one sentence: what is done) and `why` (why it is done). Each
 * formula of its trace steps has `how` (the calculation in words) and `meaning` (how to
 * read the result) under `lessons.<textKey>.formulas.<stepId>.<formulaId>`.
 */
export interface LessonStepPlan {
  readonly id: string;
  /** Trace step ids, in trace order. Every step of the trace belongs to exactly one lesson step. */
  readonly steps: readonly string[];
  /** Steps of `steps` that only exist for some parameter values or method versions. */
  readonly optional?: readonly string[];
  /** The lesson step tells the story of the ranking instead of explaining a cell. */
  readonly story?: boolean;
}

/** Where a ranking method keeps what the story of its result needs. */
export interface StoryPlan {
  /** Column vector of the final scores, one row per alternative. */
  readonly scores: string;
  /** Column vector of the ranks, one row per alternative. */
  readonly ranks: string;
  /** Matrix of what each criterion contributes to each alternative. */
  readonly contributions: string;
}

/** The lesson of a method: its steps in the order of the method's reference formulation. */
export interface ExplainSequence {
  readonly methodId: string;
  /** Name of the method's texts in the `explain` catalog (`lessons.<textKey>`). */
  readonly textKey: string;
  readonly lesson: readonly LessonStepPlan[];
  /** The step that holds the weight of each criterion (one column per criterion). */
  readonly weights?: string;
  readonly story?: StoryPlan;
}

/** A lesson step as it applies to one trace. */
export interface LessonStep {
  readonly id: string;
  /** Position in the lesson, from 0. */
  readonly index: number;
  /** The trace steps of this lesson step that the trace has, in trace order. */
  readonly steps: readonly string[];
  /** The ones among them that have formulas: the parts the learner goes through. */
  readonly parts: readonly string[];
  /** Earlier trace steps whose values these steps read, drawn beside them. */
  readonly sources: readonly string[];
  readonly story: boolean;
}

/** The lesson of one method run. */
export interface Lesson {
  readonly methodId: string;
  readonly textKey: string;
  readonly steps: readonly LessonStep[];
}

/** The row and column a lesson explains when the learner has not picked a cell. */
export interface LessonFocus {
  /** The alternative to follow, for example the winner. */
  readonly row?: string;
  /** The criterion to follow, for example the heaviest one. */
  readonly column?: string;
}

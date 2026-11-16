import type { CellRef, TextParams, TextRef, TraceAxisItem, TraceValue } from '@mateo/engine';

/**
 * A part of a scene's own progress. A scene runs from 0 to 1; `{ start: 0.2, end: 0.5 }`
 * is active between 20% and 50% of it. Spans only depend on the position of a cell in its
 * table, never on a value.
 */
export interface Span {
  readonly start: number;
  readonly end: number;
}

/** An output cell of the scene's step that becomes visible during the scene. */
export interface CellReveal {
  readonly ref: CellRef;
  /** The value of the cell in the trace. */
  readonly value: TraceValue;
  /** The cell is visible from `at.end`. */
  readonly at: Span;
}

/**
 * A value that visibly moves from a cell of an earlier step to the cell it helps to
 * produce. `value` is the value of the source cell, copied from the trace.
 */
export interface CellFlight {
  readonly from: CellRef;
  readonly to: CellRef;
  readonly value: TraceValue;
  /** Formula term the source stands for in the derivation of the target cell. */
  readonly term?: string;
  /** The target cell is the source value itself, carried over unchanged. */
  readonly carried: boolean;
  readonly at: Span;
}

/** How the output of a step is drawn. */
export type SceneView = 'matrix' | 'bars' | 'ranking' | 'value';

interface SceneBase {
  /** Unique within the timeline: the step id, or `step/formula` for a formula scene. */
  readonly id: string;
  /** Position in the timeline, from 0. */
  readonly index: number;
  readonly stepId: string;
  /** Position of the step in the trace, from 0. */
  readonly stepIndex: number;
  readonly nameKey: string;
  readonly explanationKey: string;
  readonly explanationParams?: TextParams;
  /** Earlier steps drawn beside the output, because their cells are the operands. */
  readonly sources: readonly string[];
  readonly reveals: readonly CellReveal[];
  readonly flights: readonly CellFlight[];
  /** Length of the scene in beats. The player decides how long a beat is. */
  readonly beats: number;
}

/**
 * Introduces one formula of a step on one example cell: the formula, its numeric
 * substitution, and the operands flying into the example cell.
 */
export interface FormulaScene extends SceneBase {
  readonly kind: 'formula';
  readonly formulaId: string;
  /** The first cell of the step that this formula produced. */
  readonly example: CellRef;
  /** Text written for this formula by the method's explain sequence. */
  readonly narration?: TextRef;
}

/** Fills the whole output matrix of a step, cell by cell. */
export interface MatrixScene extends SceneBase {
  readonly kind: 'matrix';
  readonly view: 'matrix';
  readonly highlightRows: readonly string[];
  readonly highlightColumns: readonly string[];
}

/** One entry of a vector scene: a labelled value of the step's output. */
export interface VectorItem {
  readonly item: TraceAxisItem;
  readonly ref: CellRef;
  readonly value: TraceValue;
}

/** Fills a vector or a single value, drawn as bars, as a ranking or as one number. */
export interface VectorScene extends SceneBase {
  readonly kind: 'vector';
  readonly view: 'bars' | 'ranking' | 'value';
  /** The entries in the order of the trace. */
  readonly items: readonly VectorItem[];
  /**
   * For a ranking: the ids of `items` from best to worst (ties keep the order of the
   * trace). Found by comparing the rank values of the trace, not by calculating.
   */
  readonly order?: readonly string[];
}

export type Scene = FormulaScene | MatrixScene | VectorScene;

/** A step of the trace and where its scenes are in the timeline. */
export interface TimelineStep {
  readonly stepId: string;
  readonly stepIndex: number;
  readonly nameKey: string;
  readonly firstScene: number;
  readonly sceneCount: number;
}

/**
 * The animated explanation of one method run. Every value in it is a copy of a value of
 * the trace it was built from.
 */
export interface Timeline {
  readonly methodId: string;
  readonly methodVersion: string;
  readonly scenes: readonly Scene[];
  readonly steps: readonly TimelineStep[];
}

/** What can be decided per step by a method's explain sequence. */
export interface StepPlan {
  /** How the output is drawn. Default: the step's visualization hint and shape. */
  readonly view?: SceneView;
  /** Steps drawn beside the output. Default: the steps this one consumed. */
  readonly sources?: readonly string[];
  /**
   * Which operands fly into the output cells. `all`: every cell the output cell was
   * derived from. `direct`: only single cells, not whole rows or columns (for example the
   * own score of a rank). `none`: no flights. Default: `all`.
   */
  readonly flights?: 'all' | 'direct' | 'none';
  /** A scene per formula before the output is filled. Default: true. */
  readonly formulaScenes?: boolean;
  /** Translation key of the text of each formula scene, by formula id. */
  readonly narration?: Readonly<Record<string, string>>;
  /** The step only exists for some parameter values. */
  readonly optional?: boolean;
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

/**
 * The explanation of a method: one plan per step of its trace, in the order of the
 * method's reference formulation.
 */
export interface ExplainSequence {
  readonly methodId: string;
  readonly steps: Readonly<Record<string, StepPlan>>;
  readonly story?: StoryPlan;
}

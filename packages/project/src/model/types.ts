import type { CriterionDirection, NumberTypeId, TextRef } from '@mateo/engine';
import type { JsonValue } from '../json';

/**
 * The in-memory shape of a project.
 *
 * All of it is plain, immutable JSON data: an edit produces a new object that shares
 * every unchanged part with the previous one. That is what makes undo/redo cheap, lets
 * the UI compare by reference, and lets `save` write only what changed.
 */

/** A triangular fuzzy number. Structurally the same as the `TFN` of `@mateo/fuzzy`. */
export interface TfnValue {
  readonly l: number;
  readonly m: number;
  readonly u: number;
}

/**
 * The content of one matrix cell.
 *
 * - `crisp`: a number.
 * - `tfn`: a triangular fuzzy number typed or imported as three numbers.
 * - `term`: a linguistic term, by its id in the scale of the cell's criterion. The fuzzy
 *   number is looked up in the scale, so editing the scale changes the cell.
 *
 * A cell without a value does not exist in the grid. Mateo never fills missing values.
 * Storage keeps whatever finite numbers it is given: whether a TFN is ordered or a value
 * fits the criterion is decided by validation, not here.
 */
export type CellValue =
  | { readonly kind: 'crisp'; readonly value: number }
  | { readonly kind: 'tfn'; readonly value: TfnValue }
  | { readonly kind: 'term'; readonly termId: string };

export type CellKind = CellValue['kind'];

/** Cells of a matrix: `cells[alternativeId][criterionId]`. Missing keys are empty cells. */
export type CellGrid = Readonly<Record<string, Readonly<Record<string, CellValue>>>>;

export interface ModelCriterion {
  /** Stable id, unique within the project file. Never shown to the user. */
  readonly id: string;
  /** Short user-visible identifier such as `C1`. */
  readonly code: string;
  readonly name: string;
  readonly description: string;
  readonly direction: CriterionDirection;
  /** Free-form measurement unit, for display only. */
  readonly unit: string;
  /** How the cells of this criterion are represented. */
  readonly numberType: NumberTypeId;
  /** Linguistic scale used for `term` cells of this criterion. */
  readonly scaleId: string | null;
}

export interface ModelAlternative {
  /** Stable id, unique within the project file. Never shown to the user. */
  readonly id: string;
  /** Short user-visible identifier such as `A1`. */
  readonly code: string;
  readonly name: string;
  readonly description: string;
  /** Free-form group label used to organise alternatives. */
  readonly group: string;
}

/**
 * What a matrix is for. Phase 1 uses one `decision` matrix per dataset; group decisions
 * (Phase 3) add one matrix per expert. A new role needs a schema version bump.
 */
export type MatrixRole = 'decision';

export interface ModelMatrix {
  readonly id: string;
  readonly name: string;
  readonly role: MatrixRole;
  readonly cells: CellGrid;
}

/** One decision problem: criteria, alternatives and the matrices over them. */
export interface Dataset {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  /** ISO 8601 UTC timestamp. */
  readonly createdAt: string;
  readonly criteria: readonly ModelCriterion[];
  readonly alternatives: readonly ModelAlternative[];
  readonly matrices: readonly ModelMatrix[];
}

export interface ScaleTerm {
  /** Unique within the scale. */
  readonly id: string;
  /** Translation key (predefined scales) or literal text (custom scales). */
  readonly label: TextRef;
  readonly abbreviation: string;
  readonly value: TfnValue;
}

/**
 * A linguistic scale used by the project. Predefined scales are copied into the project
 * when they are first used, so a file always carries every scale it depends on.
 */
export interface LinguisticScale {
  readonly id: string;
  readonly name: TextRef;
  /** Id of the predefined scale this one was copied from, if any. */
  readonly sourceId: string | null;
  /** Number type of the term values. Only `tfn` in schema version 1. */
  readonly numberType: 'tfn';
  /** Ordered from the lowest to the highest term. */
  readonly terms: readonly ScaleTerm[];
}

/** The part of a project that model edits (and undo/redo) act on. */
export interface ProjectModel {
  readonly datasets: readonly Dataset[];
  readonly scales: readonly LinguisticScale[];
}

export interface ProjectInfo {
  /** Identity of the project. A copy made with "Save As" keeps it. */
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly createdAt: string;
  /** Time of the last save that changed something. */
  readonly updatedAt: string;
  /** App version that created the file. */
  readonly createdWith: string;
  /** App version that last wrote the file. */
  readonly updatedWith: string;
}

/** Project-level settings: any JSON value under a namespaced key such as `editor.precision`. */
export type ProjectSettings = Readonly<Record<string, JsonValue>>;

/** Everything of a project that is kept in memory and written by `save`. */
export interface ProjectDocument {
  readonly info: ProjectInfo;
  readonly model: ProjectModel;
  readonly settings: ProjectSettings;
}

export const EMPTY_MODEL: ProjectModel = Object.freeze({
  datasets: Object.freeze([]),
  scales: Object.freeze([]),
});

/**
 * @mateo/explain — turns engine step traces into animation timelines (docs/plan.md §8).
 *
 * - `buildTimeline`: a trace and a method's explain sequence become scenes (formula
 *   scenes, matrix scenes, vector scenes) with cell flights and reveal timing.
 * - `explainCell`, `substitutionLatex`: how one cell was produced, for linked
 *   highlighting, numeric substitution and "How was this calculated?".
 * - `playerReducer`: the timeline player as a pure state machine.
 * - `buildRankingStory`: the story of a final ranking.
 * - `sequences`: the explain sequences of MARCOS and Fuzzy MARCOS.
 *
 * The package has no arithmetic of its own: every value it hands out is a copy of a value
 * in the trace, and it never imports a UI library.
 */
export const PACKAGE_NAME = '@mateo/explain';

export * from './cell';
export * from './errors';
export * from './focus';
export * from './latex';
export * from './numbers';
export * from './player';
export * from './sequences';
export * from './story';
export * from './timeline';
export * from './types';

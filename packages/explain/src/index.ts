/**
 * @mateo/explain — turns engine step traces into lessons (docs/plan.md §8).
 *
 * - `buildLesson`: a trace and a method's sequence become lesson steps, each covering one
 *   or more trace steps, with the earlier steps it reads from.
 * - `exampleCell`, `resultFocus`: which cell a lesson explains, and on the user's own data
 *   the winner and the heaviest criterion.
 * - `explainCell`, `substitutionLatex`: how one cell was produced, for linked
 *   highlighting, numeric substitution and "How was this calculated?".
 * - `buildRankingStory`: the story of a final ranking.
 * - `sequences`: the lessons of every Phase 1 method.
 *
 * The package has no arithmetic of its own: every value it hands out is a copy of a value
 * in the trace, and it never imports a UI library.
 */
export const PACKAGE_NAME = '@mateo/explain';

export * from './cell';
export * from './errors';
export * from './focus';
export * from './latex';
export * from './lesson';
export * from './numbers';
export * from './sequences';
export * from './story';
export * from './types';

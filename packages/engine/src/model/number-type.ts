/**
 * Identifier of a number representation a method can work with.
 *
 * The engine only knows crisp numbers. Other packages add their own ids (`tfn` in
 * `@mateo/fuzzy`, later `trapezoidal` and the advanced sets), so the type is open.
 */
export type NumberTypeId = 'crisp' | 'tfn' | (string & Record<never, never>);

export const CRISP: NumberTypeId = 'crisp';

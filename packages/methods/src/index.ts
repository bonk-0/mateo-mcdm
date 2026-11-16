/**
 * @mateo/methods — MCDM method implementations, one folder per method.
 *
 * - `critic`, `merec`: objective weighting methods (P1.5).
 * - `swara`: SWARA and fuzzy SWARA (IMF SWARA) (P1.5).
 * - `marcos`: MARCOS (P1.6).
 * - `fuzzy-marcos`: Fuzzy MARCOS with triangular fuzzy numbers (P1.6).
 */
export const PACKAGE_NAME = '@mateo/methods';

export * from '../critic';
export * from '../fuzzy-marcos';
export * from '../marcos';
export * from '../merec';
export * from '../swara';
export * from './messages';

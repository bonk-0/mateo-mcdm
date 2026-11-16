/**
 * The output of an import: a proposed model the user confirms in the import wizard.
 */
import type {
  Alternative,
  CriterionDirection,
  NumberTypeId,
  TextLiteral,
  ValidationResult,
} from '@mateo/engine';
import type { TFN } from '@mateo/fuzzy';
import type { CriterionLayout, ImportDecision, SheetRef } from './decisions';
import type { Delimiter, SourceFormat, TextEncodingId } from './types';

export type ImportedValue = number | TFN;

export interface ProposedCriterion {
  readonly id: string;
  readonly name: TextLiteral;
  /**
   * `null` when the file does not say. Never assumed: the user sets it before a method
   * can run.
   */
  readonly direction: CriterionDirection | null;
  readonly numberType: NumberTypeId;
  readonly layout: CriterionLayout;
  readonly unit?: string;
  /** For linguistic criteria: the scale the terms were converted with. */
  readonly scaleId?: string;
}

/** Where a value of the proposed model came from. */
export interface CellOrigin {
  /** A1 addresses of the source cells: one, or three for l/m/u columns. */
  readonly cells: readonly string[];
  /** The text the value was read from, when the cell held text. */
  readonly text?: string;
  /** The id of the linguistic term, for linguistic cells. */
  readonly term?: string;
}

export interface ProposedWeights {
  /** 0-based sheet row of the weights. */
  readonly row: number;
  /** One per criterion, in criterion order; `null` where the weight is missing or invalid. */
  readonly values: readonly (ImportedValue | null)[];
}

/**
 * A decision matrix as the file holds it. `values[i][j]` is `null` wherever the file has
 * no valid value; each such cell has an error in the validation result. No value is ever
 * filled in.
 */
export interface ProposedModel {
  readonly alternatives: readonly Alternative[];
  readonly criteria: readonly ProposedCriterion[];
  readonly values: readonly (readonly (ImportedValue | null)[])[];
  /** Same shape as `values`. */
  readonly origins: readonly (readonly CellOrigin[])[];
  /** A weights row found in the file, offered but never applied by the import itself. */
  readonly weights?: ProposedWeights;
}

export interface ImportSourceSummary {
  readonly format: SourceFormat;
  readonly sheetNames: readonly string[];
  readonly sheet?: SheetRef;
  readonly encoding?: TextEncodingId;
  readonly delimiter?: Delimiter;
}

export interface ImportResult {
  /** Missing when the file could not be read. */
  readonly source?: ImportSourceSummary;
  /** Missing when no table was found. */
  readonly model?: ProposedModel;
  readonly decisions: readonly ImportDecision[];
  /** Errors block confirming the import; warnings are stored with the dataset. */
  readonly validation: ValidationResult;
}

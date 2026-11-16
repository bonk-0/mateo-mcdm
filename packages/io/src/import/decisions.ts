/**
 * Structure decisions: everything the import engine decided about a file, in a form the
 * import wizard (P1.10) can show and change. Each decision says whether it was detected,
 * is ambiguous, was not found, or came from an override (the user or an import profile).
 * Changing a decision means importing again with the matching field of
 * {@link ImportOverrides} set.
 */
import type { CriterionDirection } from '@mateo/engine';
import type { EncodingStatus } from './encoding';
import type { NumberFormatDetection, NumberFormatId } from './numbers';
import type { Delimiter, SourceFormat, TextEncodingId } from './types';

export type DecisionStatus =
  /** Found in the file. */
  | 'detected'
  /** The file allows more than one reading; `value` is a proposal or `null`. */
  | 'ambiguous'
  /** Looked for and not found. */
  | 'not-found'
  /** Set by the caller (the user or an import profile). */
  | 'override';

/** How the values of a criterion are laid out in the file. */
export type CriterionLayout =
  /** One column of crisp numbers. */
  | 'crisp'
  /** Three columns holding l, m and u (`C1_l`, `C1_m`, `C1_u` or a two-row header). */
  | 'tfn-columns'
  /** One column of TFNs written in a cell, such as `(1; 2; 3)`. */
  | 'tfn-text'
  /** One column of linguistic terms converted with a scale. */
  | 'linguistic';

/** Where the direction of a criterion came from. */
export type DirectionSource = 'direction-row' | 'header' | 'override';

/** Why a row of the table is not an alternative. */
export type ExcludedRowReason =
  | 'title'
  | 'blank'
  | 'direction'
  | 'units'
  | 'weights'
  /** A computed row such as Total, Average, Max or Min. */
  | 'aggregate'
  /** The ideal (AI) or anti-ideal (AAI) row of a printed MARCOS table. */
  | 'ideal'
  /** Notes or a source line below the table. */
  | 'footer';

/** Why a column of the table is not a criterion. */
export type IgnoredColumnReason =
  | 'row-number'
  | 'text'
  /** Part of an l/m/u group with a component missing or repeated. */
  | 'incomplete-tfn'
  | 'override';

export interface SheetRef {
  readonly name: string;
  readonly index: number;
}

interface Decision<K extends string, V> {
  readonly kind: K;
  readonly status: DecisionStatus;
  readonly value: V;
  /** Other values the file allows, for the ones the user may want to pick instead. */
  readonly candidates?: readonly V[];
}

export type FormatDecision = Decision<'format', SourceFormat>;
export type EncodingDecision = Decision<'encoding', TextEncodingId> & {
  readonly evidence: EncodingStatus;
};
export type DelimiterDecision = Decision<'delimiter', Delimiter>;
export type SheetDecision = Decision<'sheet', SheetRef>;
export type NumberFormatDecision = Decision<'number-format', NumberFormatId | null> & {
  readonly evidence?: NumberFormatDetection;
};
/** 0-based sheet rows of the header: one row, or two for a group row above l/m/u. */
export type HeaderDecision = Decision<'header', { readonly rows: readonly number[] } | null>;
export type IdColumnDecision = Decision<
  'id-column',
  { readonly column: number; readonly header?: string } | null
>;
export type IgnoredColumnDecision = Decision<
  'ignored-column',
  { readonly column: number; readonly header?: string; readonly reason: IgnoredColumnReason }
>;
export type DirectionRowDecision = Decision<'direction-row', { readonly row: number } | null>;
export type ExcludedRowDecision = Decision<
  'excluded-row',
  { readonly row: number; readonly reason: ExcludedRowReason; readonly label?: string }
>;
export type CriterionDecision = Decision<
  'criterion',
  {
    readonly criterionId: string;
    readonly name: string;
    /** 0-based sheet columns, in l, m, u order for `tfn-columns`. */
    readonly columns: readonly number[];
    readonly layout: CriterionLayout;
    readonly direction: CriterionDirection | null;
    readonly directionSource: DirectionSource | null;
  }
>;
export type ScaleDecision = Decision<'scale', string | null>;
export type DataRowsDecision = Decision<'data-rows', { readonly rows: readonly number[] }>;

export type ImportDecision =
  | FormatDecision
  | EncodingDecision
  | DelimiterDecision
  | SheetDecision
  | NumberFormatDecision
  | HeaderDecision
  | IdColumnDecision
  | IgnoredColumnDecision
  | DirectionRowDecision
  | ExcludedRowDecision
  | CriterionDecision
  | ScaleDecision
  | DataRowsDecision;

export type ImportDecisionKind = ImportDecision['kind'];

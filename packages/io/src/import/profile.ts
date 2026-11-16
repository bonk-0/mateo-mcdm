/**
 * Import profiles: the decisions of one import saved so they can be re-applied to similar
 * files (the same monthly export, the same lab template). A profile is a set of
 * {@link ImportOverrides}; columns are stored by header text where the file has a header,
 * so the profile still fits when columns move.
 *
 * `@mateo/project` stores the definition as JSON with its `formatVersion`
 * (`ImportProfile.definition`).
 */
import type { CriterionDirection, ValidationResult } from '@mateo/engine';
import { createValidation, isCriterionDirection } from '@mateo/engine';
import { IMPORT_ISSUE_CODES as CODES } from './codes';
import type { ImportResult } from './model';
import { NUMBER_FORMATS } from './numbers';
import type { ColumnRef, ImportOverrides } from './overrides';
import type { SourceFormat } from './types';
import { DELIMITERS, SOURCE_FORMATS, TEXT_ENCODINGS } from './types';

export const IMPORT_PROFILE_FORMAT_VERSION = 1;

export interface ImportProfileDefinition {
  readonly formatVersion: typeof IMPORT_PROFILE_FORMAT_VERSION;
  /** The format of the file the profile was made from. Informative only. */
  readonly sourceFormat?: SourceFormat;
  readonly overrides: ImportOverrides;
}

/** Captures the final decisions of an import (detected or overridden) as a profile. */
export function profileFromImport(result: ImportResult): ImportProfileDefinition {
  const overrides: {
    -readonly [K in keyof ImportOverrides]: ImportOverrides[K];
  } = {};
  const ignore: ColumnRef[] = [];
  const directions: Record<string, CriterionDirection> = {};
  const ref = (column: number, header: string | undefined): ColumnRef =>
    header === undefined ? { column } : { header };
  for (const decision of result.decisions) {
    switch (decision.kind) {
      case 'sheet':
        overrides.sheet = decision.value.name;
        break;
      case 'encoding':
        overrides.encoding = decision.value;
        break;
      case 'delimiter':
        overrides.delimiter = decision.value;
        break;
      case 'number-format':
        if (decision.value !== null) overrides.numberFormat = decision.value;
        break;
      case 'header':
        overrides.headerRows = decision.value === null ? null : [...decision.value.rows];
        break;
      case 'id-column':
        overrides.idColumn =
          decision.value === null ? null : ref(decision.value.column, decision.value.header);
        break;
      case 'ignored-column':
        ignore.push(ref(decision.value.column, decision.value.header));
        break;
      case 'criterion':
        if (decision.value.direction !== null)
          directions[decision.value.name] = decision.value.direction;
        break;
      case 'scale':
        if (decision.value !== null) overrides.scaleId = decision.value;
        break;
      default:
        break;
    }
  }
  if (ignore.length > 0) overrides.ignoreColumns = ignore;
  if (Object.keys(directions).length > 0) overrides.directions = directions;
  return {
    formatVersion: IMPORT_PROFILE_FORMAT_VERSION,
    ...(result.source === undefined ? {} : { sourceFormat: result.source.format }),
    overrides,
  };
}

export interface ParsedImportProfile {
  readonly validation: ValidationResult;
  /** Present only when the validation has no errors. */
  readonly definition?: ImportProfileDefinition;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isIndex(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0;
}

function isColumnRef(value: unknown): value is ColumnRef {
  if (!isRecord(value)) return false;
  const keys = Object.keys(value);
  if (keys.length !== 1) return false;
  return (
    (keys[0] === 'header' && typeof value['header'] === 'string' && value['header'] !== '') ||
    (keys[0] === 'column' && isIndex(value['column']))
  );
}

const CHECKS: Readonly<Record<keyof ImportOverrides, (value: unknown) => boolean>> = {
  sheet: (value) => (typeof value === 'string' && value !== '') || isIndex(value),
  encoding: (value) => (TEXT_ENCODINGS as readonly unknown[]).includes(value),
  delimiter: (value) => (DELIMITERS as readonly unknown[]).includes(value),
  numberFormat: (value) => (NUMBER_FORMATS as readonly unknown[]).includes(value),
  headerRows: (value) =>
    value === null ||
    (Array.isArray(value) && value.length >= 1 && value.length <= 2 && value.every(isIndex)),
  idColumn: (value) => value === null || isColumnRef(value),
  ignoreColumns: (value) => Array.isArray(value) && value.every(isColumnRef),
  directionRow: (value) => value === null || isIndex(value),
  directions: (value) =>
    isRecord(value) && Object.values(value).every((direction) => isCriterionDirection(direction)),
  scaleId: (value) => typeof value === 'string' && value !== '',
};

/**
 * Validates a profile definition read from a project file. Unknown fields and values of
 * the wrong type are errors; a newer `formatVersion` is an error rather than a guess.
 */
export function parseImportProfile(value: unknown): ParsedImportProfile {
  const v = createValidation();
  if (!isRecord(value) || !isRecord(value['overrides'])) {
    v.error(CODES.profileInvalid, { params: { field: 'overrides' } });
    return { validation: v.result() };
  }
  if (value['formatVersion'] !== IMPORT_PROFILE_FORMAT_VERSION) {
    v.error(CODES.profileVersion, {
      params: { version: String(value['formatVersion']), supported: IMPORT_PROFILE_FORMAT_VERSION },
    });
    return { validation: v.result() };
  }
  const sourceFormat = value['sourceFormat'];
  if (
    sourceFormat !== undefined &&
    !(SOURCE_FORMATS as readonly unknown[]).includes(sourceFormat)
  ) {
    v.error(CODES.profileInvalid, { params: { field: 'sourceFormat' } });
  }
  for (const [key, field] of Object.entries(value['overrides'])) {
    const check = (CHECKS as Readonly<Record<string, (value: unknown) => boolean>>)[key];
    if (check === undefined || !check(field)) {
      v.error(CODES.profileInvalid, { params: { field: `overrides.${key}` } });
    }
  }
  const validation = v.result();
  if (!validation.ok) return { validation };
  return { validation, definition: value as unknown as ImportProfileDefinition };
}

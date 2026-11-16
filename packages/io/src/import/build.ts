/**
 * Reads the values of a detected layout into a proposed model: number format, linguistic
 * scale, names, directions, values and their origins. Every cell without a valid value
 * stays `null` and is reported with its address; nothing is filled in.
 */
import type {
  Alternative,
  CriterionDirection,
  TextParams,
  ValidationCollector,
  ValidationLocation,
} from '@mateo/engine';
import { textLiteral } from '@mateo/engine';
import type { LinguisticScale } from '@mateo/fuzzy';
import { TFN_NUMBER_TYPE } from '@mateo/fuzzy';
import { splitTfnText } from './cells';
import { IMPORT_ISSUE_CODES as CODES } from './codes';
import type { DirectionSource, ImportDecision } from './decisions';
import type { Layout, LayoutCriterion } from './detect';
import { directionWord, isMissingPlaceholder } from './keywords';
import type { CellOrigin, ImportedValue, ProposedCriterion, ProposedModel } from './model';
import type { NumberFormatId } from './numbers';
import { detectNumberFormat, readNumberText } from './numbers';
import type { ImportOverrides } from './overrides';
import type { SheetView } from './sheet-view';
import { termOf, scalesCovering } from './terms';
import { cellAddress, cleanLabel, columnLetters, fold } from './text';

interface Context {
  readonly view: SheetView;
  readonly layout: Layout;
  readonly overrides: ImportOverrides;
  readonly v: ValidationCollector;
  readonly decisions: ImportDecision[];
}

type Read<T> =
  | { readonly ok: true; readonly value: T; readonly text?: string }
  | {
      readonly ok: false;
      readonly code: string;
      readonly params?: TextParams;
      readonly missing?: true;
    };

// --- Number format ------------------------------------------------------------------------

function numberSamples(ctx: Context): string[] {
  const { view, layout } = ctx;
  const rows = [...layout.dataRows, ...(layout.weightsRow === null ? [] : [layout.weightsRow])];
  const samples: string[] = [];
  for (const criterion of layout.criteria) {
    if (criterion.layout === 'linguistic') continue;
    for (const row of rows) {
      for (const column of criterion.columns) {
        const cell = view.cell(row, column);
        if (cell?.type !== 'text') continue;
        if (view.kind(row, column) === 'numeric-text') samples.push(cell.value);
        else if (criterion.layout === 'tfn-text') samples.push(...(splitTfnText(cell.value) ?? []));
      }
    }
  }
  return samples;
}

function decideNumberFormat(ctx: Context): NumberFormatId | undefined {
  const detection = detectNumberFormat(numberSamples(ctx));
  const override = ctx.overrides.numberFormat;
  if (override !== undefined) {
    ctx.decisions.push({
      kind: 'number-format',
      status: 'override',
      value: override,
      evidence: detection,
    });
    const against = override === 'point' ? detection.counts.comma : detection.counts.point;
    if (against > 0) {
      ctx.v.warning(CODES.numberFormatOverrideConflict, {
        params: {
          count: against,
          example:
            (override === 'point' ? detection.examples.comma : detection.examples.point)[0] ?? '',
        },
      });
    }
    return override;
  }
  switch (detection.status) {
    case 'detected':
      ctx.decisions.push({
        kind: 'number-format',
        status: 'detected',
        value: detection.format ?? null,
        evidence: detection,
      });
      return detection.format;
    case 'not-needed':
      ctx.decisions.push({
        kind: 'number-format',
        status: 'not-found',
        value: null,
        evidence: detection,
      });
      return undefined;
    case 'ambiguous':
      ctx.decisions.push({
        kind: 'number-format',
        status: 'ambiguous',
        value: null,
        candidates: ['point', 'comma'],
        evidence: detection,
      });
      ctx.v.error(CODES.numberFormatAmbiguous, {
        params: {
          count: detection.counts.ambiguous,
          example: detection.examples.ambiguous[0] ?? '',
        },
      });
      return undefined;
    case 'conflict':
      ctx.decisions.push({
        kind: 'number-format',
        status: 'ambiguous',
        value: null,
        candidates: ['point', 'comma'],
        evidence: detection,
      });
      ctx.v.error(CODES.numberFormatConflict, {
        params: {
          point: detection.examples.point[0] ?? '',
          comma: detection.examples.comma[0] ?? '',
        },
      });
      return undefined;
  }
}

// --- Linguistic scale ----------------------------------------------------------------------

function decideScale(ctx: Context): LinguisticScale | undefined {
  const { view, layout } = ctx;
  const linguistic = layout.criteria.filter((criterion) => criterion.layout === 'linguistic');
  if (linguistic.length === 0) return undefined;
  const texts = new Set<string>();
  for (const criterion of linguistic) {
    for (const row of layout.dataRows) {
      const column = criterion.columns[0] as number;
      if (view.kind(row, column) === 'term') texts.add(view.text(row, column));
    }
  }
  const scales = view.terms.scales;
  if (ctx.overrides.scaleId !== undefined) {
    const scale = scales.find((item) => item.id === ctx.overrides.scaleId);
    ctx.decisions.push({ kind: 'scale', status: 'override', value: scale?.id ?? null });
    if (scale === undefined) {
      ctx.v.error(CODES.scaleNotFound, { params: { scale: ctx.overrides.scaleId } });
    }
    return scale;
  }
  const covering = scalesCovering(view.terms, texts);
  const candidates = covering.map((scale) => scale.id);
  if (covering.length === 1) {
    ctx.decisions.push({ kind: 'scale', status: 'detected', value: candidates[0] as string });
    return covering[0];
  }
  ctx.decisions.push({
    kind: 'scale',
    status: covering.length === 0 ? 'not-found' : 'ambiguous',
    value: null,
    candidates: covering.length === 0 ? scales.map((scale) => scale.id) : candidates,
  });
  if (covering.length === 0) {
    ctx.v.error(CODES.scaleNoMatch, { params: { terms: [...texts].slice(0, 5).join(', ') } });
  } else {
    ctx.v.error(CODES.scaleAmbiguous, { params: { scales: candidates.join(', ') } });
  }
  return undefined;
}

// --- Cells ----------------------------------------------------------------------------------

function readNumberCell(
  view: SheetView,
  row: number,
  column: number,
  format: NumberFormatId | undefined,
): Read<number> {
  const cell = view.cell(row, column);
  if (cell === null) return { ok: false, code: CODES.cellMissing, missing: true };
  switch (cell.type) {
    case 'number':
      if (cell.date) return { ok: false, code: CODES.cellDate };
      return { ok: true, value: cell.value };
    case 'error':
      return { ok: false, code: CODES.cellFormulaError, params: { value: cell.value } };
    case 'formula':
      return { ok: false, code: CODES.cellFormulaWithoutValue, params: { formula: cell.formula } };
    case 'boolean':
      return { ok: false, code: CODES.cellInvalidNumber, params: { text: String(cell.value) } };
    case 'text':
      return readNumberString(cell.value, format);
  }
}

function readNumberString(text: string, format: NumberFormatId | undefined): Read<number> {
  const trimmed = cleanLabel(text);
  if (trimmed === '') return { ok: false, code: CODES.cellMissing, missing: true };
  if (isMissingPlaceholder(trimmed)) {
    return { ok: false, code: CODES.cellMissing, params: { text: trimmed }, missing: true };
  }
  const parsed = readNumberText(trimmed, format);
  if (parsed === 'ambiguous') {
    return { ok: false, code: CODES.cellNeedsNumberFormat, params: { text: trimmed } };
  }
  if (parsed === 'invalid')
    return { ok: false, code: CODES.cellInvalidNumber, params: { text: trimmed } };
  return { ok: true, value: parsed.value, text: trimmed };
}

interface ReadCell {
  readonly value: ImportedValue | null;
  readonly origin: CellOrigin;
  readonly issues: readonly {
    readonly code: string;
    readonly params: TextParams;
    readonly missing?: true;
  }[];
  /** The value was written as a percentage and divided by 100. */
  readonly percent?: boolean;
}

function readCriterionCell(
  ctx: Context,
  criterion: LayoutCriterion,
  row: number,
  format: NumberFormatId | undefined,
  scale: LinguisticScale | undefined,
): ReadCell {
  const { view } = ctx;
  const cells = criterion.columns.map((column) => cellAddress(row, column));
  const first = criterion.columns[0] as number;
  const address = cells[0] as string;
  const fail = (read: Extract<Read<unknown>, { ok: false }>, cell = address): ReadCell => ({
    value: null,
    origin: { cells },
    issues: [
      {
        code: read.code,
        params: { ...read.params, cell },
        ...(read.missing ? { missing: true as const } : {}),
      },
    ],
  });

  switch (criterion.layout) {
    case 'crisp': {
      const read = readNumberCell(view, row, first, format);
      if (!read.ok) return fail(read);
      const percent = read.text?.includes('%') ?? false;
      return {
        value: read.value,
        origin: read.text === undefined ? { cells } : { cells, text: read.text },
        issues: [],
        ...(percent ? { percent } : {}),
      };
    }
    case 'tfn-columns': {
      const reads = criterion.columns.map((column) => readNumberCell(view, row, column, format));
      const issues: ReadCell['issues'][number][] = [];
      reads.forEach((read, index) => {
        if (!read.ok) {
          issues.push({
            code: read.code,
            params: { ...read.params, cell: cells[index] as string },
            ...(read.missing ? { missing: true as const } : {}),
          });
        }
      });
      if (issues.length > 0) return { value: null, origin: { cells }, issues };
      const [l, m, u] = reads.map((read) => (read.ok ? read.value : Number.NaN)) as [
        number,
        number,
        number,
      ];
      if (!(l <= m && m <= u)) {
        return {
          value: null,
          origin: { cells },
          issues: [
            { code: CODES.cellTfnOrder, params: { cell: `${cells[0]}:${cells[2]}`, l, m, u } },
          ],
        };
      }
      return { value: { l, m, u }, origin: { cells }, issues: [] };
    }
    case 'tfn-text': {
      const cell = view.cell(row, first);
      if (cell === null) return fail({ ok: false, code: CODES.cellMissing, missing: true });
      if (cell.type !== 'text') {
        const read = readNumberCell(view, row, first, format);
        if (!read.ok) return fail(read);
        return fail({
          ok: false,
          code: CODES.cellInvalidTfn,
          params: { text: String(read.value) },
        });
      }
      const text = cleanLabel(cell.value);
      if (isMissingPlaceholder(text)) {
        return fail({ ok: false, code: CODES.cellMissing, params: { text }, missing: true });
      }
      const parts = splitTfnText(text);
      if (parts === undefined)
        return fail({ ok: false, code: CODES.cellInvalidTfn, params: { text } });
      const reads = parts.map((part) => readNumberString(part, format));
      const failed = reads.find((read) => !read.ok);
      if (failed !== undefined && !failed.ok) {
        return fail({
          ok: false,
          code:
            failed.code === CODES.cellNeedsNumberFormat
              ? CODES.cellNeedsNumberFormat
              : CODES.cellInvalidTfn,
          params: { text },
        });
      }
      const [l, m, u] = reads.map((read) => (read.ok ? read.value : Number.NaN)) as [
        number,
        number,
        number,
      ];
      if (!(l <= m && m <= u)) {
        return fail({ ok: false, code: CODES.cellTfnOrder, params: { l, m, u } });
      }
      return { value: { l, m, u }, origin: { cells, text }, issues: [] };
    }
    case 'linguistic': {
      const text = view.text(row, first);
      const cell = view.cell(row, first);
      if (cell?.type === 'error') {
        return fail({ ok: false, code: CODES.cellFormulaError, params: { value: cell.value } });
      }
      if (cell?.type === 'formula') {
        return fail({
          ok: false,
          code: CODES.cellFormulaWithoutValue,
          params: { formula: cell.formula },
        });
      }
      if (cell === null || text === '' || isMissingPlaceholder(text)) {
        return fail({
          ok: false,
          code: CODES.cellMissing,
          ...(text === '' ? {} : { params: { text } }),
          missing: true,
        });
      }
      if (scale === undefined)
        return fail({ ok: false, code: CODES.cellNeedsScale, params: { text } });
      const term = termOf(view.terms, scale.id, text);
      if (term === undefined) {
        return fail({ ok: false, code: CODES.cellUnknownTerm, params: { text, scale: scale.id } });
      }
      return { value: term.value, origin: { cells, text, term: term.id }, issues: [] };
    }
  }
}

// --- Directions ------------------------------------------------------------------------------

function decideDirection(
  ctx: Context,
  criterion: LayoutCriterion,
  name: string,
  location: ValidationLocation,
): { direction: CriterionDirection | null; source: DirectionSource | null } {
  const { view, layout, overrides, v } = ctx;
  const override = Object.entries(overrides.directions ?? {}).find(
    ([key]) => fold(key) === fold(name),
  )?.[1];
  if (override !== undefined) return { direction: override, source: 'override' };

  let fromRow: CriterionDirection | undefined;
  if (layout.directionRow !== null) {
    const row = layout.directionRow;
    const found = new Set<CriterionDirection>();
    for (const column of criterion.columns) {
      const text = view.text(row, column);
      if (text === '') continue;
      const direction = directionWord(text, { letters: true });
      if (direction === undefined) {
        v.error(CODES.directionInvalid, {
          params: { cell: cellAddress(row, column), text },
          location,
        });
      } else found.add(direction);
    }
    if (found.size > 1) {
      v.error(CODES.directionConflict, { params: { criterion: name }, location });
      return { direction: null, source: null };
    }
    fromRow = [...found][0];
  }
  if (
    fromRow !== undefined &&
    criterion.headerDirection !== undefined &&
    fromRow !== criterion.headerDirection
  ) {
    v.error(CODES.directionConflict, { params: { criterion: name }, location });
    return { direction: null, source: null };
  }
  if (fromRow !== undefined) return { direction: fromRow, source: 'direction-row' };
  if (criterion.headerDirection !== undefined) {
    return { direction: criterion.headerDirection, source: 'header' };
  }
  v.warning(CODES.directionMissing, { params: { criterion: name }, location });
  return { direction: null, source: null };
}

// --- Model -----------------------------------------------------------------------------------

export function buildModel(
  view: SheetView,
  layout: Layout,
  overrides: ImportOverrides,
  v: ValidationCollector,
  decisions: ImportDecision[],
): ProposedModel {
  const ctx: Context = { view, layout, overrides, v, decisions };
  const format = decideNumberFormat(ctx);
  const scale = decideScale(ctx);

  // Criteria.
  const criteria: ProposedCriterion[] = layout.criteria.map((criterion, index) => {
    const id = `c${index + 1}`;
    const location: ValidationLocation = { input: 'matrix', column: { index, id } };
    let name = criterion.name ?? '';
    if (name === '') {
      name = criterion.columns.map(columnLetters).join('\u2013');
      v.warning(CODES.criterionNameMissing, { params: { column: name }, location });
    }
    const { direction, source } = decideDirection(ctx, criterion, name, location);
    const unit =
      layout.unitsRow === null
        ? ''
        : (criterion.columns
            .map((column) => view.text(layout.unitsRow as number, column))
            .find((text) => text !== '') ?? '');
    decisions.push({
      kind: 'criterion',
      status: 'detected',
      value: {
        criterionId: id,
        name,
        columns: criterion.columns,
        layout: criterion.layout,
        direction,
        directionSource: source,
      },
    });
    return {
      id,
      name: textLiteral(name),
      direction,
      numberType: criterion.layout === 'crisp' ? 'crisp' : TFN_NUMBER_TYPE,
      layout: criterion.layout,
      ...(unit === '' ? {} : { unit }),
      ...(criterion.layout === 'linguistic' && scale !== undefined ? { scaleId: scale.id } : {}),
    };
  });
  reportDuplicates(
    criteria.map((criterion) => criterion.name.text),
    (index, name) =>
      v.error(CODES.criterionDuplicate, {
        params: { name },
        location: { input: 'matrix', column: { index, id: `c${index + 1}` } },
      }),
  );

  // Alternatives and values.
  const alternatives: Alternative[] = [];
  const values: (ImportedValue | null)[][] = [];
  const origins: CellOrigin[][] = [];
  let percentCells = 0;
  let firstPercent = '';
  if (layout.idColumn === null && layout.dataRows.length > 0) {
    v.warning(CODES.alternativeNamesGenerated, { params: { count: layout.dataRows.length } });
  }
  layout.dataRows.forEach((row, index) => {
    const id = `a${index + 1}`;
    let name: string;
    if (layout.idColumn === null) name = `A${index + 1}`;
    else {
      name = view.text(row, layout.idColumn);
      if (name === '') {
        v.error(CODES.alternativeNameMissing, {
          params: { cell: cellAddress(row, layout.idColumn) },
          location: { input: 'matrix', row: { index, id } },
        });
      }
    }
    alternatives.push({ id, name: textLiteral(name) });
    const rowValues: (ImportedValue | null)[] = [];
    const rowOrigins: CellOrigin[] = [];
    layout.criteria.forEach((criterion, column) => {
      const read = readCriterionCell(ctx, criterion, row, format, scale);
      const location: ValidationLocation = {
        input: 'matrix',
        row: { index, id },
        column: { index: column, id: criteria[column]?.id ?? `c${column + 1}` },
      };
      for (const issue of read.issues) v.error(issue.code, { params: issue.params, location });
      if (read.percent) {
        percentCells += 1;
        if (firstPercent === '') firstPercent = read.origin.cells[0] ?? '';
      }
      rowValues.push(read.value);
      rowOrigins.push(read.origin);
    });
    values.push(rowValues);
    origins.push(rowOrigins);
  });
  if (percentCells > 0) {
    v.warning(CODES.cellPercent, { params: { count: percentCells, cell: firstPercent } });
  }
  reportDuplicates(
    alternatives.map((alternative) => ('text' in alternative.name ? alternative.name.text : '')),
    (index, name) =>
      v.error(CODES.alternativeDuplicate, {
        params: { name },
        location: { input: 'matrix', row: { index, id: `a${index + 1}` } },
      }),
  );
  if (alternatives.length === 0) v.error(CODES.noAlternatives);
  if (criteria.length === 0) v.error(CODES.noCriteria);

  // Weights row: offered, never applied.
  let weights: ProposedModel['weights'];
  if (layout.weightsRow !== null) {
    const row = layout.weightsRow;
    weights = {
      row,
      values: layout.criteria.map((criterion, index) => {
        const read = readCriterionCell(ctx, criterion, row, format, scale);
        for (const issue of read.issues) {
          v.warning(CODES.weightInvalid, {
            params: { cell: issue.params['cell'] ?? '', text: issue.params['text'] ?? '' },
            location: { input: 'weights', column: { index, id: criteria[index]?.id ?? '' } },
          });
        }
        return read.value;
      }),
    };
  }

  return { alternatives, criteria, values, origins, ...(weights === undefined ? {} : { weights }) };
}

function reportDuplicates(
  names: readonly string[],
  report: (index: number, name: string) => void,
): void {
  const seen = new Set<string>();
  names.forEach((name, index) => {
    const key = fold(name);
    if (key === '') return;
    if (seen.has(key)) report(index, name);
    seen.add(key);
  });
}

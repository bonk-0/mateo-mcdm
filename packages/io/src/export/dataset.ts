import type { TextRef } from '@mateo/engine';
import type {
  CellValue,
  Dataset,
  LinguisticScale,
  ModelCriterion,
  ProjectInfo,
} from '@mateo/project';
import type { ExportCell, ExportInfo, ExportMerge, ExportTable, Translate } from './types';

/** A text reference in the export language: a literal as it is, a key through `t`. */
export function textOf(ref: TextRef, t: Translate): string {
  return 'text' in ref ? ref.text : t(ref.key, ref.params);
}

export function directionText(direction: string, t: Translate): string {
  return t(`export.direction.${direction === 'cost' ? 'cost' : 'benefit'}`);
}

export function numberTypeText(numberType: string, t: Translate): string {
  return numberType === 'crisp' || numberType === 'tfn'
    ? t(`export.numberType.${numberType}`)
    : numberType;
}

function scaleOf(scales: readonly LinguisticScale[], id: string | null) {
  return id === null ? undefined : scales.find((scale) => scale.id === id);
}

/** How a criterion's column is written in the matrix sheet. */
type ColumnPlan = 'crisp' | 'term' | 'tfn';

function cellsOf(
  dataset: Dataset,
  matrixId: string | undefined,
  criterion: ModelCriterion,
): (CellValue | undefined)[] {
  const matrix = matrixId
    ? dataset.matrices.find((item) => item.id === matrixId)
    : dataset.matrices[0];
  return dataset.alternatives.map((alt) => matrix?.cells[alt.id]?.[criterion.id]);
}

function planOf(criterion: ModelCriterion, cells: readonly (CellValue | undefined)[]): ColumnPlan {
  const present = cells.filter((cell): cell is CellValue => cell !== undefined);
  if (present.length > 0 && present.every((cell) => cell.kind === 'term')) return 'term';
  if (criterion.numberType !== 'crisp' || present.some((cell) => cell.kind === 'tfn')) {
    return 'tfn';
  }
  return 'crisp';
}

function triple(
  cell: CellValue | undefined,
  scale: LinguisticScale | undefined,
): [ExportCell, ExportCell, ExportCell] {
  if (cell === undefined) return [null, null, null];
  if (cell.kind === 'tfn') return [cell.value.l, cell.value.m, cell.value.u];
  if (cell.kind === 'crisp') return [cell.value, cell.value, cell.value];
  const term = scale?.terms.find((item) => item.id === cell.termId);
  return term ? [term.value.l, term.value.m, term.value.u] : [null, null, null];
}

/**
 * The decision matrix as a table the import engine reads back: a header row (two rows
 * with merged groups and `l / m / u` when the matrix has fuzzy criteria), a direction row,
 * a unit row when any criterion has a unit, then one row per alternative. Crisp and fuzzy
 * criteria can be mixed. Empty cells stay empty; nothing is filled in.
 *
 * - Linguistic cells are written as the term's label when every cell of the criterion is a
 *   term, so the file reads back as the same terms.
 * - Otherwise a fuzzy criterion takes three columns. A crisp number in it is written as
 *   `(v, v, v)` and a term as the numbers of its scale.
 */
export function matrixTable(
  dataset: Dataset,
  scales: readonly LinguisticScale[],
  t: Translate,
  options: { readonly matrixId?: string; readonly title?: string; readonly id?: string } = {},
): ExportTable {
  const columns = dataset.criteria.map((criterion) => {
    const cells = cellsOf(dataset, options.matrixId, criterion);
    return { criterion, cells, plan: planOf(criterion, cells) };
  });
  const fuzzy = columns.some((column) => column.plan === 'tfn');
  const headerRows = fuzzy ? 2 : 1;
  const hasUnits = dataset.criteria.some((criterion) => criterion.unit.trim() !== '');

  const top: ExportCell[] = [t('export.column.alternative')];
  const sub: ExportCell[] = [null];
  const direction: ExportCell[] = [t('export.column.direction')];
  const unit: ExportCell[] = [t('export.column.unit')];
  const merges: ExportMerge[] = [];
  if (fuzzy) merges.push({ top: 0, left: 0, bottom: 1, right: 0 });

  for (const { criterion, plan } of columns) {
    const left = top.length;
    const name = criterion.name.trim() === '' ? criterion.code : criterion.name;
    const width = plan === 'tfn' ? 3 : 1;
    for (let k = 0; k < width; k += 1) {
      top.push(k === 0 ? name : null);
      sub.push(plan === 'tfn' ? t(`export.component.${(['l', 'm', 'u'] as const)[k]!}`) : null);
      direction.push(k === 0 ? directionText(criterion.direction, t) : null);
      unit.push(k === 0 ? criterion.unit : null);
    }
    if (plan === 'tfn') merges.push({ top: 0, left, bottom: 0, right: left + 2 });
    else if (fuzzy) merges.push({ top: 0, left, bottom: 1, right: left });
  }

  const rows: ExportCell[][] = fuzzy ? [top, sub] : [top];
  rows.push(direction);
  if (hasUnits) rows.push(unit);
  dataset.alternatives.forEach((alternative, a) => {
    const row: ExportCell[] = [
      alternative.name.trim() === '' ? alternative.code : alternative.name,
    ];
    for (const { criterion, cells, plan } of columns) {
      const cell = cells[a];
      const scale = scaleOf(scales, criterion.scaleId);
      if (plan === 'crisp') {
        row.push(cell?.kind === 'crisp' ? cell.value : null);
      } else if (plan === 'term') {
        const term =
          cell?.kind === 'term' ? scale?.terms.find((item) => item.id === cell.termId) : undefined;
        row.push(term ? textOf(term.label, t) : null);
      } else {
        row.push(...triple(cell, scale));
      }
    }
    rows.push(row);
  });

  return {
    id: options.id ?? 'data',
    title: options.title ?? t('export.sheet.data'),
    rows,
    headerRows,
    headerColumns: 1,
    merges,
  };
}

export function criteriaTable(
  dataset: Dataset,
  scales: readonly LinguisticScale[],
  t: Translate,
): ExportTable {
  const header = ['code', 'name', 'description', 'direction', 'unit', 'numberType', 'scale'].map(
    (key) => t(`export.column.${key}`),
  );
  return {
    id: 'criteria',
    title: t('export.sheet.criteria'),
    headerRows: 1,
    headerColumns: 0,
    rows: [
      header,
      ...dataset.criteria.map((criterion) => {
        const scale = scaleOf(scales, criterion.scaleId);
        return [
          criterion.code,
          criterion.name,
          criterion.description,
          directionText(criterion.direction, t),
          criterion.unit,
          numberTypeText(criterion.numberType, t),
          scale ? textOf(scale.name, t) : null,
        ];
      }),
    ],
  };
}

export function alternativesTable(dataset: Dataset, t: Translate): ExportTable {
  const header = ['code', 'name', 'description', 'group'].map((key) => t(`export.column.${key}`));
  return {
    id: 'alternatives',
    title: t('export.sheet.alternatives'),
    headerRows: 1,
    headerColumns: 0,
    rows: [
      header,
      ...dataset.alternatives.map((alt) => [alt.code, alt.name, alt.description, alt.group]),
    ],
  };
}

/** Every linguistic scale the criteria use, one row per term, with its fuzzy number. */
export function scalesTable(
  dataset: Dataset,
  scales: readonly LinguisticScale[],
  t: Translate,
): ExportTable | null {
  const used = new Set(dataset.criteria.map((criterion) => criterion.scaleId));
  const rows: ExportCell[][] = [];
  for (const scale of scales) {
    if (!used.has(scale.id)) continue;
    for (const term of scale.terms) {
      rows.push([
        textOf(scale.name, t),
        textOf(term.label, t),
        term.abbreviation,
        term.value.l,
        term.value.m,
        term.value.u,
      ]);
    }
  }
  if (rows.length === 0) return null;
  return {
    id: 'scales',
    title: t('export.sheet.scales'),
    headerRows: 1,
    headerColumns: 0,
    rows: [
      [
        t('export.column.scale'),
        t('export.column.term'),
        t('export.column.abbreviation'),
        t('export.component.l'),
        t('export.component.m'),
        t('export.component.u'),
      ],
      ...rows,
    ],
  };
}

export function infoTable(
  project: Pick<ProjectInfo, 'name' | 'description'>,
  dataset: Dataset,
  info: ExportInfo,
  t: Translate,
  extra: readonly (readonly [string, ExportCell])[] = [],
): ExportTable {
  const rows: (readonly [string, ExportCell])[] = [
    [t('export.info.project'), project.name],
    [t('export.info.description'), project.description],
    [t('export.info.dataset'), dataset.name],
    ...extra,
    [t('export.info.exportDate'), info.exportedAt],
    [t('export.info.appVersion'), info.appVersion],
    [t('export.info.language'), info.language],
  ];
  return {
    id: 'info',
    title: t('export.sheet.info'),
    headerRows: 0,
    headerColumns: 1,
    rows: rows.map(([label, value]) => [label, value]),
  };
}

/**
 * The tables of a dataset: the matrix first (so that importing the workbook reads it),
 * then criteria, alternatives and scales.
 */
export function datasetTables(
  dataset: Dataset,
  scales: readonly LinguisticScale[],
  project: Pick<ProjectInfo, 'name' | 'description'>,
  info: ExportInfo,
  t: Translate,
  options: { readonly matrixId?: string } = {},
): ExportTable[] {
  const scalesSheet = scalesTable(dataset, scales, t);
  return [
    matrixTable(dataset, scales, t, options),
    criteriaTable(dataset, scales, t),
    alternativesTable(dataset, t),
    ...(scalesSheet ? [scalesSheet] : []),
    infoTable(project, dataset, info, t),
  ];
}

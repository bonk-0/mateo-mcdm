import type {
  AnyMethod,
  ParameterDefinition,
  Reference,
  TraceTable,
  TraceValue,
} from '@mateo/engine';
import type { Dataset, LinguisticScale, ProjectInfo, StoredAnalysis } from '@mateo/project';
import {
  alternativesTable,
  criteriaTable,
  infoTable,
  matrixTable,
  numberTypeText,
  scalesTable,
  textOf,
} from './dataset';
import type { ExportCell, ExportInfo, ExportMerge, ExportTable, Translate } from './types';

const COMPONENT_ORDER = ['l', 'm', 'u'] as const;

function componentName(name: string, t: Translate): string {
  return (COMPONENT_ORDER as readonly string[]).includes(name)
    ? t(`export.component.${name}`)
    : name;
}

function isComposite(value: TraceValue): value is Extract<TraceValue, object> {
  return value !== null && typeof value === 'object';
}

/**
 * A step output as a table. A column of fuzzy numbers takes one sub-column per component
 * (`l`, `m`, `u`) under a merged heading, so every number is a number in its own cell.
 */
export function traceTable(
  table: TraceTable,
  t: Translate,
  meta: { readonly id: string; readonly title: string },
): ExportTable {
  const components = table.columns.map((_, c) => {
    for (const row of table.cells) {
      const value = row[c]?.value;
      if (value !== undefined && isComposite(value)) return Object.keys(value.components);
    }
    return null;
  });
  const fuzzy = components.some((entry) => entry !== null);
  const top: ExportCell[] = [null];
  const sub: ExportCell[] = [null];
  const merges: ExportMerge[] = [];
  if (fuzzy) merges.push({ top: 0, left: 0, bottom: 1, right: 0 });
  table.columns.forEach((column, c) => {
    const names = components[c];
    const label = textOf(column.label, t);
    const left = top.length;
    if (names === null || names === undefined) {
      top.push(label);
      sub.push(null);
      if (fuzzy) merges.push({ top: 0, left, bottom: 1, right: left });
    } else {
      names.forEach((name, k) => {
        top.push(k === 0 ? label : null);
        sub.push(componentName(name, t));
      });
      if (names.length > 1)
        merges.push({ top: 0, left, bottom: 0, right: left + names.length - 1 });
    }
  });
  const rows: ExportCell[][] = fuzzy ? [top, sub] : [top];
  table.rows.forEach((row, r) => {
    const line: ExportCell[] = [textOf(row.label, t)];
    table.columns.forEach((_, c) => {
      const value = table.cells[r]?.[c]?.value ?? null;
      const names = components[c];
      if (names === null || names === undefined) {
        line.push(isComposite(value) ? null : value);
      } else if (isComposite(value)) {
        for (const name of names) line.push(value.components[name] ?? null);
      } else {
        for (const _name of names) line.push(null);
      }
    });
    rows.push(line);
  });
  return { ...meta, rows, headerRows: fuzzy ? 2 : 1, headerColumns: 1, merges };
}

/** A column-oriented copy of a vector step: criteria down the side, one value (or l/m/u) across. */
function asColumnVector(table: TraceTable): TraceTable {
  if (table.shape !== 'row-vector') return table;
  return {
    shape: 'column-vector',
    rows: table.columns,
    columns: table.rows,
    cells: table.columns.map((_, c) => table.cells.map((row) => row[c]!)),
  };
}

interface RankingShape {
  readonly ranking: readonly { alternativeId: string; score: number; rank: number }[];
}

function rankingOf(result: unknown): RankingShape['ranking'] | null {
  if (typeof result !== 'object' || result === null) return null;
  const ranking = (result as Partial<RankingShape>).ranking;
  return Array.isArray(ranking) ? ranking : null;
}

function columnValues(table: TraceTable, columnId: string): Map<string, number> {
  const c = table.columns.findIndex((column) => column.id === columnId);
  const out = new Map<string, number>();
  if (c < 0) return out;
  table.rows.forEach((row, r) => {
    const value = table.cells[r]?.[c]?.value;
    const crisp =
      typeof value === 'number'
        ? value
        : isComposite(value ?? null)
          ? (value as { components: Record<string, number> }).components['m']
          : undefined;
    if (typeof crisp === 'number') out.set(row.id, crisp);
  });
  return out;
}

/** The ranking, best first, with the crisp utility functions when the trace has them. */
function rankingTable(
  analysis: StoredAnalysis,
  dataset: Dataset,
  t: Translate,
): ExportTable | null {
  const ranking = rankingOf(analysis.record.result);
  if (ranking === null) return null;
  const names = new Map(dataset.alternatives.map((alt) => [alt.id, alt.name || alt.code]));
  let minus = new Map<string, number>();
  let plus = new Map<string, number>();
  for (const id of ['defuzzification', 'utility-functions']) {
    const step = analysis.record.trace.steps.find((item) => item.id === id);
    if (!step) continue;
    const a = columnValues(step.output, 'f-k-minus');
    const b = columnValues(step.output, 'f-k-plus');
    if (a.size === 0 || b.size === 0) continue;
    minus = a;
    plus = b;
    break;
  }
  const withUtility = minus.size > 0;
  const ordered = ranking
    .map((entry, index) => ({ entry, index }))
    .sort((x, y) => x.entry.rank - y.entry.rank || x.index - y.index);
  return {
    id: 'results',
    title: t('export.sheet.results'),
    headerRows: 1,
    headerColumns: 0,
    rows: [
      [
        t('export.column.rank'),
        t('export.column.alternative'),
        t('export.column.score'),
        ...(withUtility ? [t('export.column.fMinus'), t('export.column.fPlus')] : []),
      ],
      ...ordered.map(({ entry }) => [
        entry.rank,
        names.get(entry.alternativeId) ?? entry.alternativeId,
        entry.score,
        ...(withUtility
          ? [minus.get(entry.alternativeId) ?? null, plus.get(entry.alternativeId) ?? null]
          : []),
      ]),
    ],
  };
}

function parametersAndVersion(
  method: AnyMethod | undefined,
  analysis: StoredAnalysis,
  t: Translate,
): ExportTable {
  const rows: ExportCell[][] = [
    [t('export.column.parameter'), t('export.column.value')],
    [t('export.info.method'), method ? t(method.nameKey) : analysis.methodId],
    ['ID', analysis.methodId],
    [t('export.info.methodVersion'), analysis.methodVersion],
    [t('export.info.numberType'), numberTypeText(analysis.numberType, t)],
  ];
  const parameters = analysis.record.parameters as Readonly<Record<string, unknown>>;
  for (const [name, value] of Object.entries(parameters)) {
    const definition: ParameterDefinition | undefined = method?.parameters[name];
    const label = definition ? t(definition.labelKey) : name;
    let shown: ExportCell = null;
    if (typeof value === 'number' || typeof value === 'boolean') shown = value;
    else if (typeof value === 'string') {
      const option =
        definition?.type === 'enum' ? definition.options.find((o) => o.value === value) : undefined;
      shown = option ? t(option.labelKey) : value;
    }
    rows.push([label, shown]);
  }
  return {
    id: 'method',
    title: t('export.sheet.method'),
    headerRows: 1,
    headerColumns: 1,
    rows,
  };
}

function referencesTable(references: readonly Reference[], t: Translate): ExportTable | null {
  if (references.length === 0) return null;
  const keys = ['authors', 'year', 'title', 'source', 'volume', 'issue', 'pages', 'doi', 'url'];
  return {
    id: 'references',
    title: t('export.sheet.references'),
    headerRows: 1,
    headerColumns: 0,
    rows: [
      keys.map((key) => t(`export.column.${key}`)),
      ...references.map((ref) => [
        ref.authors.join('; '),
        ref.year,
        ref.title,
        ref.source,
        ref.volume ?? null,
        ref.issue ?? null,
        ref.pages ?? null,
        ref.doi ?? null,
        ref.url ?? null,
      ]),
    ],
  };
}

export interface AnalysisExportInput {
  readonly analysis: StoredAnalysis;
  /** The dataset and scales the analysis was run on (its snapshot). */
  readonly dataset: Dataset;
  readonly scales: readonly LinguisticScale[];
  readonly project: Pick<ProjectInfo, 'name' | 'description'>;
  /** The method definition, for parameter labels and references. */
  readonly method?: AnyMethod;
  /** The dataset changed after the analysis was run. */
  readonly stale?: boolean;
  /** Further tables to append, such as the scenarios of a sensitivity analysis. */
  readonly extraTables?: readonly ExportTable[];
}

/**
 * Every table of an analysis, in the order of a workbook: info, original data, criteria,
 * alternatives, scales, method with its parameters and version, references, results,
 * weights, every step of the calculation, then any extra tables.
 */
export function analysisTables(
  input: AnalysisExportInput,
  info: ExportInfo,
  t: Translate,
): ExportTable[] {
  const { analysis, dataset, scales } = input;
  const matrixId = (analysis.configuration as { matrixId?: unknown } | null)?.matrixId;
  const tables: ExportTable[] = [];
  const infoSheet = infoTable(input.project, dataset, info, t, [
    [
      t('export.info.analysis'),
      analysis.name || (input.method ? t(input.method.nameKey) : analysis.methodId),
    ],
    [t('export.info.method'), input.method ? t(input.method.nameKey) : analysis.methodId],
    [t('export.info.methodVersion'), analysis.methodVersion],
    [t('export.info.numberType'), numberTypeText(analysis.numberType, t)],
    [t('export.info.analysisDate'), analysis.createdAt],
    ...(input.stale ? ([[t('export.info.stale'), t('export.info.yes')]] as const) : []),
  ]);
  tables.push(infoSheet);
  tables.push(
    matrixTable(dataset, scales, t, typeof matrixId === 'string' ? { matrixId } : {}),
    criteriaTable(dataset, scales, t),
    alternativesTable(dataset, t),
  );
  const scalesSheet = scalesTable(dataset, scales, t);
  if (scalesSheet) tables.push(scalesSheet);
  tables.push(parametersAndVersion(input.method, analysis, t));
  const references = referencesTable(input.method?.references ?? [], t);
  if (references) tables.push(references);
  const results = rankingTable(analysis, dataset, t);
  if (results) tables.push(results);
  const weights = analysis.record.trace.steps.find((step) => step.id === 'weights');
  if (weights) {
    tables.push(
      traceTable(asColumnVector(weights.output), t, {
        id: 'weights',
        title: t('export.sheet.weights'),
      }),
    );
  }
  for (const step of analysis.record.trace.steps) {
    tables.push(
      traceTable(step.output, t, {
        id: `step-${step.id}`,
        title: t('export.sheet.step', {
          index: step.index + 1,
          name: t(step.nameKey),
        }),
      }),
    );
  }
  tables.push(...(input.extraTables ?? []));
  return tables;
}

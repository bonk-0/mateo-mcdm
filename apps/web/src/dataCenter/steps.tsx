import type { ValidationIssue } from '@mateo/engine';
import {
  columnLetters,
  DEFAULT_IMPORT_SCALES,
  parseNumberText,
  type CriterionLayout,
  type Delimiter,
  type ImportOverrides,
  type ImportResult,
  type NumberFormatDecision,
  type NumberFormatId,
  type TextEncodingId,
} from '@mateo/io';
import type { ImportProfile } from '@mateo/project';
import { Badge, Button } from '@mateo/ui';
import { AlertTriangle, CheckCircle2, ClipboardPaste, FileSpreadsheet, Upload } from 'lucide-react';
import { useId, useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useFormatters } from '../hooks/preferences';
import { useMessage, useTextRef } from '../editor/messages';
import { fieldClass, labelClass } from '../editor/ui';
import {
  clipboardInput,
  criteriaOf,
  decisionOf,
  ignoredColumnsOf,
  isColumnIgnoredByUser,
  isTextFormat,
  missingCellIssues,
  otherIssues,
  withColumnsIgnored,
  withDelimiter,
  withDirection,
  withDirectionRow,
  withEncoding,
  withHeaderRows,
  withIdColumn,
  withNumberFormat,
  withScale,
  withSheet,
  type ImportInput,
} from './wizard';

interface StepProps {
  readonly result: ImportResult;
  readonly overrides: ImportOverrides;
  readonly onOverrides: (next: ImportOverrides) => void;
}

/** `t` for keys built at run time (all of them are in the catalog). */
type Translate = (key: string, values?: Record<string, string | number>) => string;
function useDynamicT(): Translate {
  const { t } = useTranslation('dataCenter');
  return t as unknown as Translate;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function Field({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <label htmlFor={htmlFor} className={labelClass}>
        {label}
      </label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function StepIntro({ children }: { children: ReactNode }) {
  return <p className="text-sm text-muted-foreground">{children}</p>;
}

/** Issues as a list: the message of each, with its severity. */
export function IssueList({
  issues,
  testId,
}: {
  issues: readonly ValidationIssue[];
  testId?: string;
}) {
  const message = useMessage();
  const { t } = useTranslation('dataCenter');
  return (
    <ul className="flex flex-col gap-1.5" data-testid={testId}>
      {issues.map((issue, index) => (
        <li
          key={`${issue.code}-${index}`}
          className="flex items-start gap-2 rounded-md border border-border bg-surface px-3 py-2 text-sm"
        >
          <AlertTriangle
            className={
              issue.severity === 'error'
                ? 'mt-0.5 size-4 shrink-0 text-danger'
                : 'mt-0.5 size-4 shrink-0 text-warning'
            }
            aria-hidden
          />
          <span>
            <span className="sr-only">
              {issue.severity === 'error' ? t('severity.error') : t('severity.warning')}:{' '}
            </span>
            {message(issue.messageKey, issue.params)}
          </span>
        </li>
      ))}
    </ul>
  );
}

// --- 1. Upload ------------------------------------------------------------------------

export function UploadStep({
  input,
  onInput,
  profiles,
  profileId,
  onProfile,
  profileProblem,
  readIssues,
}: {
  input: ImportInput | null;
  onInput: (input: ImportInput) => void;
  profiles: readonly ImportProfile[];
  profileId: string;
  onProfile: (id: string) => void;
  profileProblem: string | null;
  readIssues: readonly ValidationIssue[];
}) {
  const { t } = useTranslation('dataCenter');
  const fileId = useId();
  const pasteId = useId();
  const profileSelectId = useId();
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [pasted, setPasted] = useState('');

  const readFile = async (file: File) => {
    const bytes = new Uint8Array(await file.arrayBuffer());
    onInput({ name: file.name, bytes, mediaType: file.type, pasted: false });
  };

  return (
    <div className="flex flex-col gap-5">
      <StepIntro>{t('upload.description')}</StepIntro>
      <div
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          const file = event.dataTransfer.files[0];
          if (file) void readFile(file);
        }}
        className={`flex flex-col items-center gap-3 rounded-xl border-2 border-dashed p-8 text-center transition-colors ${
          dragging ? 'border-primary bg-accent' : 'border-border bg-surface'
        }`}
      >
        <FileSpreadsheet className="size-8 text-muted-foreground" aria-hidden />
        <p className="text-sm">{t('upload.drop')}</p>
        <input
          ref={inputRef}
          id={fileId}
          data-testid="import-file-input"
          type="file"
          className="sr-only"
          accept=".xlsx,.xlsm,.xls,.csv,.tsv,.txt"
          aria-label={t('upload.choose')}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void readFile(file);
            event.target.value = '';
          }}
        />
        <Button variant="outline" onClick={() => inputRef.current?.click()}>
          <Upload aria-hidden />
          {t('upload.choose')}
        </Button>
        <p className="text-xs text-muted-foreground">{t('upload.accepted')}</p>
      </div>

      <Field label={t('upload.paste.label')} htmlFor={pasteId} hint={t('upload.paste.hint')}>
        <textarea
          id={pasteId}
          value={pasted}
          rows={3}
          spellCheck={false}
          placeholder={t('upload.paste.placeholder')}
          className={`${fieldClass} h-auto py-2 font-mono`}
          onChange={(event) => setPasted(event.target.value)}
        />
      </Field>
      <div>
        <Button
          variant="outline"
          disabled={pasted.trim() === ''}
          onClick={() => onInput(clipboardInput(pasted, t('upload.paste.fileName')))}
        >
          <ClipboardPaste aria-hidden />
          {t('upload.paste.use')}
        </Button>
      </div>

      {profiles.length > 0 && (
        <Field
          label={t('upload.profile.label')}
          htmlFor={profileSelectId}
          hint={t('upload.profile.hint')}
        >
          <select
            id={profileSelectId}
            className={fieldClass}
            value={profileId}
            onChange={(event) => onProfile(event.target.value)}
          >
            <option value="">{t('upload.profile.none')}</option>
            {profiles.map((profile) => (
              <option key={profile.id} value={profile.id}>
                {profile.name}
              </option>
            ))}
          </select>
        </Field>
      )}
      {profileProblem && (
        <p role="alert" className="text-sm text-danger">
          {profileProblem}
        </p>
      )}

      {input && (
        <p
          className="flex items-center gap-2 rounded-md bg-accent px-3 py-2 text-sm text-accent-foreground"
          data-testid="import-selected-file"
        >
          <CheckCircle2 className="size-4" aria-hidden />
          {t('upload.selected', { name: input.name, size: formatSize(input.bytes.length) })}
        </p>
      )}
      {readIssues.length > 0 && <IssueList issues={readIssues} testId="read-issues" />}
    </div>
  );
}

// --- 2. Sheet -------------------------------------------------------------------------

export function SheetStep({ result, overrides, onOverrides }: StepProps) {
  const { t } = useTranslation('dataCenter');
  const id = useId();
  const decision = decisionOf(result, 'sheet');
  const names = result.source?.sheetNames ?? [];
  const usable = new Set((decision?.candidates ?? []).map((candidate) => candidate.name));
  return (
    <div className="flex flex-col gap-4">
      <StepIntro>{t('sheet.description')}</StepIntro>
      <Field label={t('sheet.label')} htmlFor={id}>
        <select
          id={id}
          className={fieldClass}
          value={decision?.value.name ?? ''}
          onChange={(event) => onOverrides(withSheet(overrides, event.target.value))}
        >
          {names.map((name) => (
            <option key={name} value={name}>
              {usable.has(name) ? name : `${name} (${t('sheet.empty')})`}
            </option>
          ))}
        </select>
      </Field>
      <p className="text-xs text-muted-foreground">{t('sheet.resetNote')}</p>
    </div>
  );
}

// --- 3. Structure ---------------------------------------------------------------------

const ROW_CHOICES = 15;

function StatusBadge({ status }: { status: string }) {
  const t = useDynamicT();
  return (
    <Badge variant={status === 'ambiguous' || status === 'not-found' ? 'outline' : 'accent'}>
      {t(`status.${status}`)}
    </Badge>
  );
}

export function StructureStep({ result, overrides, onOverrides }: StepProps) {
  const { t } = useTranslation('dataCenter');
  const td = useDynamicT();
  const headerId = useId();
  const idColumnId = useId();
  const directionRowId = useId();
  const header = decisionOf(result, 'header');
  const idColumn = decisionOf(result, 'id-column');
  const directionRow = decisionOf(result, 'direction-row');
  const excluded = result.decisions.filter((d) => d.kind === 'excluded-row');
  const dataRows = decisionOf(result, 'data-rows');

  const columns = new Map<number, string>();
  for (const criterion of criteriaOf(result)) {
    criterion.value.columns.forEach((column) => columns.set(column, criterion.value.name));
  }
  for (const ignored of ignoredColumnsOf(result)) {
    columns.set(ignored.value.column, ignored.value.header ?? '');
  }
  if (idColumn?.value) columns.set(idColumn.value.column, idColumn.value.header ?? '');
  const columnOptions = [...columns.entries()].sort((a, b) => a[0] - b[0]);

  const headerValue = !header?.value
    ? 'none'
    : header.value.rows.map((row) => String(row)).join(',');
  const headerOptions = new Set<string>(['none']);
  for (let row = 0; row < ROW_CHOICES; row += 1) headerOptions.add(String(row));
  headerOptions.add(headerValue);
  const rowLabel = (value: string) =>
    value === 'none'
      ? t('structure.header.none')
      : value
          .split(',')
          .map((row) => Number(row) + 1)
          .join('–');

  return (
    <div className="flex flex-col gap-5">
      <StepIntro>{t('structure.description')}</StepIntro>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label={t('structure.header.label')} htmlFor={headerId}>
          <select
            id={headerId}
            className={fieldClass}
            value={headerValue}
            onChange={(event) => {
              const value = event.target.value;
              onOverrides(
                withHeaderRows(overrides, value === 'none' ? null : value.split(',').map(Number)),
              );
            }}
          >
            {[...headerOptions].map((value) => (
              <option key={value} value={value}>
                {value === 'none' ? rowLabel(value) : t('structure.row', { row: rowLabel(value) })}
              </option>
            ))}
          </select>
        </Field>
        <Field label={t('structure.idColumn.label')} htmlFor={idColumnId}>
          <select
            id={idColumnId}
            className={fieldClass}
            value={idColumn?.value ? String(idColumn.value.column) : 'none'}
            onChange={(event) =>
              onOverrides(
                withIdColumn(
                  overrides,
                  event.target.value === 'none' ? null : Number(event.target.value),
                ),
              )
            }
          >
            <option value="none">{t('structure.idColumn.none')}</option>
            {columnOptions.map(([column, name]) => (
              <option key={column} value={column} translate="no">
                {columnLetters(column)}
                {name ? ` — ${name}` : ''}
              </option>
            ))}
          </select>
        </Field>
        <Field label={t('structure.directionRow.label')} htmlFor={directionRowId}>
          <select
            id={directionRowId}
            className={fieldClass}
            value={directionRow?.value ? String(directionRow.value.row) : 'none'}
            onChange={(event) =>
              onOverrides(
                withDirectionRow(
                  overrides,
                  event.target.value === 'none' ? null : Number(event.target.value),
                ),
              )
            }
          >
            <option value="none">{t('structure.directionRow.none')}</option>
            {[
              ...new Set([
                ...Array.from({ length: ROW_CHOICES }, (_, row) => row),
                ...(directionRow?.value ? [directionRow.value.row] : []),
              ]),
            ].map((row) => (
              <option key={row} value={row}>
                {t('structure.row', { row: row + 1 })}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <dl className="grid gap-2 text-sm sm:grid-cols-2" data-testid="structure-summary">
        {result.decisions
          .filter((d) =>
            [
              'format',
              'encoding',
              'delimiter',
              'sheet',
              'header',
              'id-column',
              'direction-row',
            ].includes(d.kind),
          )
          .map((decision) => (
            <div
              key={decision.kind}
              className="flex items-center justify-between gap-2 rounded-md border border-border bg-surface px-3 py-2"
            >
              <dt>{td(`structure.decision.${decision.kind}`)}</dt>
              <dd className="flex items-center gap-2">
                <span
                  className="font-mono text-xs"
                  {...(DATA_DECISIONS.has(decision.kind) ? { translate: 'no' as const } : {})}
                >
                  {describeDecision(decision, td)}
                </span>
                <StatusBadge status={decision.status} />
              </dd>
            </div>
          ))}
        <div className="flex items-center justify-between gap-2 rounded-md border border-border bg-surface px-3 py-2">
          <dt>{t('structure.decision.data-rows')}</dt>
          <dd className="font-mono text-xs">{dataRows?.value.rows.length ?? 0}</dd>
        </div>
      </dl>

      {excluded.length > 0 && (
        <section aria-labelledby="excluded-rows" className="flex flex-col gap-2">
          <h3 id="excluded-rows" className="text-sm font-semibold">
            {t('structure.excluded.title')}
          </h3>
          <p className="text-xs text-muted-foreground">{t('structure.excluded.hint')}</p>
          <ul className="flex flex-col gap-1 text-sm">
            {excluded.map((decision) =>
              decision.kind === 'excluded-row' ? (
                <li key={decision.value.row} className="flex items-center gap-2">
                  <span className="font-mono text-xs">
                    {t('structure.row', { row: decision.value.row + 1 })}
                  </span>
                  <Badge variant="outline">{t(`structure.reason.${decision.value.reason}`)}</Badge>
                  {decision.value.label && (
                    <span className="truncate text-muted-foreground" translate="no">
                      {decision.value.label}
                    </span>
                  )}
                </li>
              ) : null,
            )}
          </ul>
        </section>
      )}
    </div>
  );
}

/** Decisions whose value is text from the file or a technical name, not interface text. */
const DATA_DECISIONS = new Set(['format', 'encoding', 'sheet', 'id-column']);

function describeDecision(decision: ImportResult['decisions'][number], t: Translate): string {
  switch (decision.kind) {
    case 'format':
      return decision.value.toUpperCase();
    case 'encoding':
      return decision.value.toUpperCase();
    case 'delimiter':
      return t(
        `types.delimiter.${decision.value === ',' ? 'comma' : decision.value === ';' ? 'semicolon' : 'tab'}`,
      );
    case 'sheet':
      return decision.value.name;
    case 'header':
      return decision.value === null
        ? t('structure.header.none')
        : t('structure.row', { row: decision.value.rows.map((row) => row + 1).join('–') });
    case 'id-column':
      return decision.value === null
        ? t('structure.idColumn.none')
        : `${columnLetters(decision.value.column)}${decision.value.header ? ` — ${decision.value.header}` : ''}`;
    case 'direction-row':
      return decision.value === null
        ? t('structure.directionRow.none')
        : t('structure.row', { row: decision.value.row + 1 });
    default:
      return '';
  }
}

// --- 4. Column mapping ----------------------------------------------------------------

export function ColumnsStep({ result, overrides, onOverrides }: StepProps) {
  const { t } = useTranslation('dataCenter');
  const criteria = criteriaOf(result);
  const ignored = ignoredColumnsOf(result);
  const idColumn = decisionOf(result, 'id-column');
  const needing = criteria.filter((criterion) => criterion.value.direction === null);
  return (
    <div className="flex flex-col gap-5">
      <StepIntro>{t('columns.description')}</StepIntro>
      {needing.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-md border border-border bg-accent px-3 py-2 text-sm text-accent-foreground">
          <span className="flex-1">{t('columns.directionNeeded', { count: needing.length })}</span>
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              onOverrides(
                needing.reduce(
                  (next, criterion) => withDirection(next, criterion.value.name, 'benefit'),
                  overrides,
                ),
              )
            }
          >
            {t('columns.allBenefit')}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              onOverrides(
                needing.reduce(
                  (next, criterion) => withDirection(next, criterion.value.name, 'cost'),
                  overrides,
                ),
              )
            }
          >
            {t('columns.allCost')}
          </Button>
        </div>
      )}

      {idColumn?.value && (
        <p className="text-sm">
          <span className="text-muted-foreground">{t('columns.alternatives')}: </span>
          <span className="font-mono text-xs" translate="no">
            {columnLetters(idColumn.value.column)}
            {idColumn.value.header ? ` — ${idColumn.value.header}` : ''}
          </span>
        </p>
      )}

      <div className="overflow-x-auto rounded-md border border-border">
        <table className="w-full text-left text-sm" data-testid="criteria-table">
          <caption className="sr-only">{t('columns.criteria')}</caption>
          <thead className="bg-muted text-xs text-muted-foreground">
            <tr>
              <th scope="col" className="px-3 py-2">
                {t('columns.include')}
              </th>
              <th scope="col" className="px-3 py-2">
                {t('columns.column')}
              </th>
              <th scope="col" className="px-3 py-2">
                {t('columns.name')}
              </th>
              <th scope="col" className="px-3 py-2">
                {t('columns.layout')}
              </th>
              <th scope="col" className="px-3 py-2">
                {t('columns.direction')}
              </th>
            </tr>
          </thead>
          <tbody>
            {criteria.map((criterion) => (
              <CriterionRow
                key={criterion.value.criterionId}
                criterion={criterion}
                overrides={overrides}
                onOverrides={onOverrides}
              />
            ))}
          </tbody>
        </table>
      </div>

      {ignored.length > 0 && (
        <section aria-labelledby="ignored-columns" className="flex flex-col gap-2">
          <h3 id="ignored-columns" className="text-sm font-semibold">
            {t('columns.ignored.title')}
          </h3>
          <ul className="flex flex-col gap-1 text-sm">
            {ignored.map((decision) => (
              <li key={decision.value.column} className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs" translate="no">
                  {columnLetters(decision.value.column)}
                </span>
                <span translate="no">{decision.value.header ?? ''}</span>
                <Badge variant="outline">
                  {t(`columns.ignored.reason.${decision.value.reason}`)}
                </Badge>
                {isColumnIgnoredByUser(overrides, decision.value.column) && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      onOverrides(withColumnsIgnored(overrides, [decision.value.column], false))
                    }
                  >
                    {t('columns.ignored.restore', {
                      column: columnLetters(decision.value.column),
                    })}
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function CriterionRow({
  criterion,
  overrides,
  onOverrides,
}: {
  criterion: ReturnType<typeof criteriaOf>[number];
  overrides: ImportOverrides;
  onOverrides: (next: ImportOverrides) => void;
}) {
  const { t } = useTranslation('dataCenter');
  const { name, columns, layout, direction, directionSource } = criterion.value;
  return (
    <tr className="border-t border-border">
      <td className="px-3 py-2">
        <input
          type="checkbox"
          checked
          aria-label={t('columns.includeColumn', { name })}
          onChange={() => onOverrides(withColumnsIgnored(overrides, columns, true))}
        />
      </td>
      <td className="px-3 py-2 font-mono text-xs" translate="no">
        {columns.map((column) => columnLetters(column)).join(', ')}
      </td>
      <td className="px-3 py-2" translate="no">
        {name}
      </td>
      <td className="px-3 py-2">
        <Badge variant="outline">{t(`columns.layouts.${layout satisfies CriterionLayout}`)}</Badge>
      </td>
      <td className="px-3 py-2">
        <select
          className={`${fieldClass} w-36`}
          aria-label={t('columns.directionOf', { name })}
          value={direction ?? ''}
          onChange={(event) => {
            const value = event.target.value;
            if (value === 'benefit' || value === 'cost') {
              onOverrides(withDirection(overrides, name, value));
            }
          }}
        >
          {direction === null && <option value="">{t('columns.choose')}</option>}
          <option value="benefit">{t('columns.benefit')}</option>
          <option value="cost">{t('columns.cost')}</option>
        </select>
        {directionSource === 'direction-row' || directionSource === 'header' ? (
          <span className="ml-2 text-xs text-muted-foreground">
            {t(`columns.source.${directionSource}`)}
          </span>
        ) : null}
      </td>
    </tr>
  );
}

// --- 5. Data types --------------------------------------------------------------------

const ENCODINGS: readonly TextEncodingId[] = ['utf-8', 'utf-16le', 'utf-16be', 'windows-1254'];
const DELIMITERS: readonly { value: Delimiter; key: 'comma' | 'semicolon' | 'tab' }[] = [
  { value: ',', key: 'comma' },
  { value: ';', key: 'semicolon' },
  { value: '\t', key: 'tab' },
];

export function TypesStep({ result, overrides, onOverrides }: StepProps) {
  const { t } = useTranslation('dataCenter');
  const textOf = useTextRef();
  const encodingId = useId();
  const delimiterId = useId();
  const scaleId = useId();
  const numberFormat = decisionOf(result, 'number-format');
  const encoding = decisionOf(result, 'encoding');
  const delimiter = decisionOf(result, 'delimiter');
  const scale = decisionOf(result, 'scale');
  const hasLinguistic = criteriaOf(result).some((c) => c.value.layout === 'linguistic');

  return (
    <div className="flex flex-col gap-6">
      <StepIntro>{t('types.description')}</StepIntro>

      <NumberFormatSection
        decision={numberFormat}
        overrides={overrides}
        onOverrides={onOverrides}
      />

      {isTextFormat(result) && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t('types.encoding.label')} htmlFor={encodingId}>
            <select
              id={encodingId}
              className={fieldClass}
              value={overrides.encoding ?? ''}
              onChange={(event) =>
                onOverrides(
                  withEncoding(overrides, (event.target.value || null) as TextEncodingId | null),
                )
              }
            >
              <option value="">
                {t('types.detected', { value: (encoding?.value ?? 'utf-8').toUpperCase() })}
              </option>
              {ENCODINGS.map((value) => (
                <option key={value} value={value}>
                  {value.toUpperCase()}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t('types.delimiter.label')} htmlFor={delimiterId}>
            <select
              id={delimiterId}
              className={fieldClass}
              value={overrides.delimiter ?? ''}
              onChange={(event) =>
                onOverrides(
                  withDelimiter(overrides, (event.target.value || null) as Delimiter | null),
                )
              }
            >
              <option value="">
                {t('types.detected', {
                  value: t(
                    `types.delimiter.${DELIMITERS.find((d) => d.value === delimiter?.value)?.key ?? 'comma'}`,
                  ),
                })}
              </option>
              {DELIMITERS.map((item) => (
                <option key={item.key} value={item.value}>
                  {t(`types.delimiter.${item.key}`)}
                </option>
              ))}
            </select>
          </Field>
        </div>
      )}

      {hasLinguistic && (
        <Field label={t('types.scale.label')} htmlFor={scaleId} hint={t('types.scale.hint')}>
          <select
            id={scaleId}
            className={fieldClass}
            value={overrides.scaleId ?? ''}
            onChange={(event) => onOverrides(withScale(overrides, event.target.value || null))}
          >
            <option value="">
              {scale?.value
                ? t('types.detected', {
                    value: textOf(
                      DEFAULT_IMPORT_SCALES.find((s) => s.id === scale.value)?.name ?? {
                        text: scale.value,
                      },
                    ),
                  })
                : t('types.scale.none')}
            </option>
            {DEFAULT_IMPORT_SCALES.map((item) => (
              <option key={item.id} value={item.id}>
                {textOf(item.name)}
              </option>
            ))}
          </select>
        </Field>
      )}
    </div>
  );
}

function NumberFormatSection({
  decision,
  overrides,
  onOverrides,
}: {
  decision: NumberFormatDecision | undefined;
  overrides: ImportOverrides;
  onOverrides: (next: ImportOverrides) => void;
}) {
  const { t } = useTranslation('dataCenter');
  const evidence = decision?.evidence;
  const samples = evidence
    ? [
        ...new Set([
          ...evidence.examples.point,
          ...evidence.examples.comma,
          ...evidence.examples.ambiguous,
        ]),
      ]
    : [];
  const effective: NumberFormatId | null = overrides.numberFormat ?? decision?.value ?? null;
  const reading = (sample: string, format: NumberFormatId): string => {
    const parsed = parseNumberText(sample, format);
    return parsed === undefined ? t('types.number.unreadable') : String(parsed.value);
  };
  const choices: readonly { value: NumberFormatId | ''; label: string }[] = [
    { value: '', label: t('types.number.auto') },
    { value: 'point', label: t('types.number.point') },
    { value: 'comma', label: t('types.number.comma') },
  ];
  return (
    <section aria-labelledby="number-format" className="flex flex-col gap-3">
      <h3 id="number-format" className="text-sm font-semibold">
        {t('types.number.title')}
      </h3>
      <p className="text-sm" data-testid="number-format-status">
        {decision?.status === 'override'
          ? t('types.number.status.override')
          : evidence
            ? t(`types.number.status.${evidence.status}`)
            : t('types.number.status.not-needed')}
        {effective && (
          <>
            {' '}
            <Badge variant="accent">
              {effective === 'point' ? t('types.number.point') : t('types.number.comma')}
            </Badge>
          </>
        )}
      </p>
      <fieldset className="flex flex-wrap gap-2">
        <legend className="sr-only">{t('types.number.title')}</legend>
        {choices.map((choice) => {
          const checked = (overrides.numberFormat ?? '') === choice.value;
          return (
            <label
              key={choice.value}
              className={`flex cursor-pointer items-center gap-2 rounded-md border px-3 py-1.5 text-sm ${
                checked ? 'border-primary bg-accent' : 'border-border bg-surface'
              }`}
            >
              <input
                type="radio"
                name="number-format"
                checked={checked}
                onChange={() =>
                  onOverrides(
                    withNumberFormat(overrides, choice.value === '' ? null : choice.value),
                  )
                }
              />
              {choice.label}
            </label>
          );
        })}
      </fieldset>
      {samples.length > 0 && (
        <div className="overflow-x-auto rounded-md border border-border">
          <table className="w-full text-left text-sm" data-testid="number-samples">
            <caption className="sr-only">{t('types.number.samples')}</caption>
            <thead className="bg-muted text-xs text-muted-foreground">
              <tr>
                <th scope="col" className="px-3 py-2">
                  {t('types.number.sample')}
                </th>
                <th scope="col" className="px-3 py-2">
                  {t('types.number.asPoint')}
                </th>
                <th scope="col" className="px-3 py-2">
                  {t('types.number.asComma')}
                </th>
              </tr>
            </thead>
            <tbody>
              {samples.map((sample) => (
                <tr key={sample} className="border-t border-border">
                  <td className="px-3 py-2 font-mono text-xs">{sample}</td>
                  <td className="px-3 py-2 tabular-nums">{reading(sample, 'point')}</td>
                  <td className="px-3 py-2 tabular-nums">{reading(sample, 'comma')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

// --- 6. Missing values ----------------------------------------------------------------

export function MissingStep({ result }: { result: ImportResult }) {
  const { t } = useTranslation('dataCenter');
  const issues = missingCellIssues(result);
  return (
    <div className="flex flex-col gap-4">
      <StepIntro>{t('missing.description')}</StepIntro>
      {issues.length === 0 ? (
        <p
          className="flex items-center gap-2 rounded-md bg-accent px-3 py-2 text-sm text-accent-foreground"
          data-testid="missing-none"
        >
          <CheckCircle2 className="size-4" aria-hidden />
          {t('missing.none')}
        </p>
      ) : (
        <>
          <p className="text-sm font-medium" data-testid="missing-count">
            {t('missing.count', { count: issues.length })}
          </p>
          <IssueList issues={issues} testId="missing-list" />
          <p className="text-xs text-muted-foreground">{t('missing.fix')}</p>
        </>
      )}
    </div>
  );
}

// --- 7. Validation --------------------------------------------------------------------

export function ValidationStep({
  result,
  directionsMissing,
}: {
  result: ImportResult;
  directionsMissing: readonly number[];
}) {
  const { t } = useTranslation('dataCenter');
  const issues = otherIssues(result);
  const errors = issues.filter((issue) => issue.severity === 'error');
  const warnings = issues.filter((issue) => issue.severity === 'warning');
  return (
    <div className="flex flex-col gap-4">
      <StepIntro>{t('validation.description')}</StepIntro>
      {errors.length === 0 && directionsMissing.length === 0 && (
        <p
          className="flex items-center gap-2 rounded-md bg-accent px-3 py-2 text-sm text-accent-foreground"
          data-testid="validation-ok"
        >
          <CheckCircle2 className="size-4" aria-hidden />
          {t('validation.ok')}
        </p>
      )}
      {directionsMissing.length > 0 && (
        <p role="alert" className="text-sm text-danger" data-testid="validation-directions">
          {t('validation.directionsMissing', { count: directionsMissing.length })}
        </p>
      )}
      {errors.length > 0 && (
        <section aria-labelledby="validation-errors" className="flex flex-col gap-2">
          <h3 id="validation-errors" className="text-sm font-semibold">
            {t('validation.errors', { count: errors.length })}
          </h3>
          <p className="text-xs text-muted-foreground">{t('validation.errorsHint')}</p>
          <IssueList issues={errors} testId="validation-errors-list" />
        </section>
      )}
      {warnings.length > 0 && (
        <section aria-labelledby="validation-warnings" className="flex flex-col gap-2">
          <h3 id="validation-warnings" className="text-sm font-semibold">
            {t('validation.warnings', { count: warnings.length })}
          </h3>
          <p className="text-xs text-muted-foreground">{t('validation.warningsHint')}</p>
          <IssueList issues={warnings} testId="validation-warnings-list" />
        </section>
      )}
    </div>
  );
}

// --- 8. Preview -----------------------------------------------------------------------

const PREVIEW_ROWS = 50;

export function PreviewStep({ result }: { result: ImportResult }) {
  const { t } = useTranslation('dataCenter');
  const formatters = useFormatters();
  const textOf = useTextRef();
  const model = result.model;
  if (!model) return <p className="text-sm text-muted-foreground">{t('preview.none')}</p>;
  const rows = model.alternatives.slice(0, PREVIEW_ROWS);
  const cell = (row: number, column: number): ReactNode => {
    const value = model.values[row]?.[column];
    if (value === null || value === undefined) {
      return (
        <span className="text-danger" title={t('preview.missing')}>
          <span aria-hidden>—</span>
          <span className="sr-only">{t('preview.missing')}</span>
        </span>
      );
    }
    const origin = model.origins[row]?.[column];
    if (typeof value === 'number') return formatters.number(value, 6);
    const tfn = `(${formatters.number(value.l, 6)}; ${formatters.number(value.m, 6)}; ${formatters.number(value.u, 6)})`;
    return origin?.text && origin.term ? `${origin.text} ${tfn}` : tfn;
  };
  return (
    <div className="flex flex-col gap-3">
      <StepIntro>
        {t('preview.description', {
          alternatives: model.alternatives.length,
          criteria: model.criteria.length,
        })}
      </StepIntro>
      <div className="max-h-[22rem] overflow-auto rounded-md border border-border">
        <table className="w-full text-left text-sm" data-testid="preview-table">
          <caption className="sr-only">{t('preview.caption')}</caption>
          <thead className="sticky top-0 bg-muted text-xs text-muted-foreground">
            <tr>
              <th scope="col" className="px-3 py-2">
                {t('preview.alternative')}
              </th>
              {model.criteria.map((criterion) => (
                <th key={criterion.id} scope="col" className="px-3 py-2">
                  <span translate="no">{textOf(criterion.name)}</span>
                  <span className="ml-1 font-normal">
                    ({criterion.direction === null ? '?' : t(`columns.${criterion.direction}`)})
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((alternative, row) => (
              <tr key={alternative.id} className="border-t border-border">
                <th scope="row" className="px-3 py-1.5 font-medium" translate="no">
                  {textOf(alternative.name)}
                </th>
                {model.criteria.map((criterion, column) => (
                  <td key={criterion.id} className="px-3 py-1.5 tabular-nums">
                    {cell(row, column)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {model.alternatives.length > PREVIEW_ROWS && (
        <p className="text-xs text-muted-foreground">
          {t('preview.truncated', { shown: PREVIEW_ROWS, total: model.alternatives.length })}
        </p>
      )}
      {model.weights && <p className="text-xs text-muted-foreground">{t('preview.weights')}</p>}
    </div>
  );
}

// --- 9. Confirm -----------------------------------------------------------------------

export function ConfirmStep({
  result,
  blocked,
  datasetName,
  onDatasetName,
  saveProfile,
  onSaveProfile,
  profileName,
  onProfileName,
  fileName,
}: {
  result: ImportResult;
  blocked: boolean;
  datasetName: string;
  onDatasetName: (name: string) => void;
  saveProfile: boolean;
  onSaveProfile: (save: boolean) => void;
  profileName: string;
  onProfileName: (name: string) => void;
  fileName: string;
}) {
  const { t } = useTranslation('dataCenter');
  const nameId = useId();
  const profileNameId = useId();
  const model = result.model;
  return (
    <div className="flex flex-col gap-4">
      <StepIntro>{t('confirm.description')}</StepIntro>
      <dl className="grid gap-2 text-sm sm:grid-cols-3">
        {[
          [t('confirm.file'), fileName],
          [t('confirm.alternatives'), String(model?.alternatives.length ?? 0)],
          [t('confirm.criteria'), String(model?.criteria.length ?? 0)],
        ].map(([label, value]) => (
          <div key={label} className="rounded-md border border-border bg-surface px-3 py-2">
            <dt className="text-xs text-muted-foreground">{label}</dt>
            <dd className="truncate font-medium" translate="no">
              {value}
            </dd>
          </div>
        ))}
      </dl>
      {blocked && (
        <p role="alert" className="text-sm text-danger" data-testid="confirm-blocked">
          {t('confirm.blocked')}
        </p>
      )}
      {result.validation.warnings.length > 0 && (
        <p className="text-sm text-muted-foreground">
          {t('confirm.warnings', { count: result.validation.warnings.length })}
        </p>
      )}
      <Field label={t('confirm.datasetName')} htmlFor={nameId}>
        <input
          id={nameId}
          className={fieldClass}
          value={datasetName}
          onChange={(event) => onDatasetName(event.target.value)}
        />
      </Field>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={saveProfile}
          onChange={(event) => onSaveProfile(event.target.checked)}
        />
        {t('confirm.saveProfile')}
      </label>
      {saveProfile && (
        <Field
          label={t('confirm.profileName')}
          htmlFor={profileNameId}
          hint={t('confirm.profileHint')}
        >
          <input
            id={profileNameId}
            className={fieldClass}
            value={profileName}
            onChange={(event) => onProfileName(event.target.value)}
          />
        </Field>
      )}
    </div>
  );
}

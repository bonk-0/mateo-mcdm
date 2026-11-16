import { Button } from '@mateo/ui';
import {
  addDataset,
  addMatrix,
  randomId,
  removeDataset,
  updateDataset,
  type Dataset,
  type ProjectDocument,
  type ProjectSession,
} from '@mateo/project';
import {
  ArrowDownToLine,
  ArrowLeftToLine,
  ArrowRightToLine,
  ArrowUpToLine,
  Filter,
  FolderOpen,
  FilePlus2,
  PanelRight,
  Plus,
  Redo2,
  CheckCircle2,
  Table2,
  Trash2,
  Undo2,
  Wand2,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { runCommand } from '../commands/commands';
import { useFormatters } from '../hooks/preferences';
import { PageHeader } from '../routes/PageHeader';
import {
  bulkEdit,
  clearSelection,
  commitCell,
  copyText,
  deleteAlternatives,
  deleteCriteria,
  insertAlternative,
  insertCriterion,
  moveAlternativeTo,
  moveCriterionTo,
  paste,
  type ActionEnv,
  type EditorNotice,
} from './actions';
import { BulkEditDialog } from './BulkEditDialog';
import { MatrixGrid, type GridCommands, type MatrixGridHandle } from './MatrixGrid';
import { useMessage, useTextRef } from './messages';
import { syntaxForLocale } from './numbers';
import { AlternativesPanel, CriteriaPanel } from './Panels';
import { CODE_COLUMN, NAME_COLUMN, type ParseContext, type Range } from './plan';
import { RowCache, summarize } from './rows';
import { useDocument, useIsDirty, useSession } from './session';
import { fieldClass, toolbarButtonClass } from './ui';

export function EditorPage() {
  const { t } = useTranslation(['matrix', 'nav']);
  const session = useSession();
  const document = useDocument(session);
  return (
    <div className="flex flex-col">
      <PageHeader
        title={t('nav:items.matrix.title')}
        description={t('nav:items.matrix.description')}
      />
      {session && document ? (
        <ProjectEditor session={session} document={document} />
      ) : (
        <EmptyState
          icon={<Table2 className="size-8" aria-hidden />}
          title={t('matrix:page.noProject.title')}
          description={t('matrix:page.noProject.description')}
        >
          <Button onClick={() => runCommand('file.new')}>
            <FilePlus2 aria-hidden />
            {t('matrix:page.new')}
          </Button>
          <Button variant="outline" onClick={() => runCommand('file.open')}>
            <FolderOpen aria-hidden />
            {t('matrix:page.open')}
          </Button>
        </EmptyState>
      )}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  children?: React.ReactNode;
}) {
  return (
    <section className="flex min-h-[40vh] flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-surface p-8 text-center">
      <div className="flex size-14 items-center justify-center rounded-2xl bg-accent text-accent-foreground">
        {icon}
      </div>
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="max-w-md text-sm text-muted-foreground">{description}</p>
      <div className="mt-2 flex flex-wrap justify-center gap-2">{children}</div>
    </section>
  );
}

/** A decision problem with an empty decision matrix, ready to be filled. */
export function newDataset(name: string): Dataset {
  return {
    id: randomId(),
    name,
    description: '',
    createdAt: new Date().toISOString(),
    criteria: [],
    alternatives: [],
    matrices: [{ id: randomId(), name: 'Decision matrix', role: 'decision', cells: {} }],
  };
}

function ProjectEditor({
  session,
  document,
}: {
  session: ProjectSession;
  document: ProjectDocument;
}) {
  const { t } = useTranslation('matrix');
  const [datasetId, setDatasetId] = useState<string | null>(null);
  const datasets = document.model.datasets;
  const dataset = datasets.find((item) => item.id === datasetId) ?? datasets[0];

  const create = () => {
    const created = newDataset(t('dataset.defaultName'));
    session.execute(addDataset(created));
    session.history.sealMerge();
    setDatasetId(created.id);
  };

  if (!dataset) {
    return (
      <EmptyState
        icon={<Table2 className="size-8" aria-hidden />}
        title={t('page.noDataset.title')}
        description={t('page.noDataset.description')}
      >
        <Button onClick={create}>
          <Plus aria-hidden />
          {t('page.createDataset')}
        </Button>
      </EmptyState>
    );
  }
  return (
    <MatrixEditor
      key={dataset.id}
      session={session}
      document={document}
      dataset={dataset}
      onSelectDataset={setDatasetId}
      onCreateDataset={create}
    />
  );
}

function MatrixEditor({
  session,
  document,
  dataset,
  onSelectDataset,
  onCreateDataset,
}: {
  session: ProjectSession;
  document: ProjectDocument;
  dataset: Dataset;
  onSelectDataset: (id: string) => void;
  onCreateDataset: () => void;
}) {
  const { t } = useTranslation('matrix');
  const message = useMessage();
  const textOf = useTextRef();
  const formatters = useFormatters();
  const syntax = useMemo(() => syntaxForLocale(formatters.numberLocale), [formatters.numberLocale]);
  const scales = document.model.scales;
  const matrix = dataset.matrices[0];
  const dirty = useIsDirty(session);

  // A dataset without a matrix (for example from an import) gets its decision matrix.
  useEffect(() => {
    if (!matrix) session.execute(addMatrix(dataset.id, newDataset('').matrices[0]!));
  }, [matrix, session, dataset.id]);

  const cache = useRef(new RowCache());
  const rows = useMemo(
    () => cache.current.build(dataset, matrix?.cells ?? {}, scales),
    [dataset, matrix?.cells, scales],
  );
  const summary = useMemo(() => summarize(rows, dataset), [rows, dataset]);

  const gridRef = useRef<MatrixGridHandle>(null);
  const [selection, setSelection] = useState<Range | null>(null);
  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [onlyIssues, setOnlyIssues] = useState(false);
  const [viewActive, setViewActive] = useState(false);
  const [panel, setPanel] = useState<'criteria' | 'alternatives' | null>('criteria');
  const [bulkOpen, setBulkOpen] = useState(false);
  const [criterionId, setCriterionId] = useState<string | null>(null);
  const [alternativeId, setAlternativeId] = useState<string | null>(null);

  const notify = useCallback(
    (notice: EditorNotice) => {
      switch (notice.kind) {
        case 'pasted':
          toast.success(
            notice.addedRows + notice.addedColumns > 0
              ? t('toast.pastedGrown', {
                  applied: notice.applied,
                  rows: notice.addedRows,
                  columns: notice.addedColumns,
                })
              : t('toast.pasted', { applied: notice.applied }),
            notice.skipped > 0
              ? { description: t('toast.skipped', { count: notice.skipped }) }
              : {},
          );
          return;
        case 'nothingPasted':
          toast.warning(t('toast.nothingPasted'), {
            ...(notice.skipped > 0
              ? { description: t('toast.skipped', { count: notice.skipped }) }
              : {}),
          });
          return;
        case 'rejected':
          toast.error(t(`toast.rejected.${notice.reason === 'term' ? 'term' : notice.reason}`));
          return;
        case 'bulk':
          toast.success(t('toast.bulk', { applied: notice.applied }), {
            ...(notice.skipped > 0
              ? { description: t('toast.skipped', { count: notice.skipped }) }
              : {}),
          });
          return;
        case 'removed':
          toast(
            notice.rows > 0
              ? t('toast.removedRows', { count: notice.rows })
              : t('toast.removedColumns', { count: notice.columns }),
            { action: { label: t('toast.undo'), onClick: () => session.undo() } },
          );
          return;
        case 'noSelection':
          toast.info(t('toast.noSelection'));
          return;
        case 'noCriterionSelected':
          toast.info(t('toast.noCriterionSelected'));
      }
    },
    [t, session],
  );

  const context = useMemo<ParseContext>(
    () => ({
      syntax,
      label: (term) => textOf(term.label),
      newId: randomId,
    }),
    [syntax, textOf],
  );

  const env = useMemo<ActionEnv>(
    () => ({
      session,
      datasetId: dataset.id,
      getLayout: () => gridRef.current?.getLayout() ?? null,
      getSelection: () => gridRef.current?.getSelection() ?? null,
      context,
      notify,
    }),
    [session, dataset.id, context, notify],
  );
  const envRef = useRef(env);
  envRef.current = env;

  const commands = useMemo<GridCommands>(
    () => ({
      commitCell: (rowId, columnId, value) =>
        commitCell(envRef.current, rowId, columnId, value as never),
      clear: () => clearSelection(envRef.current),
      moveAlternative: (id, to) => moveAlternativeTo(envRef.current, id, to),
      moveCriterion: (id, to) => moveCriterionTo(envRef.current, id, to),
    }),
    [],
  );

  // Clipboard: spreadsheets copy and paste plain text, so the page listens for it while
  // the editor is open, whichever element has the focus (unless it is a text field).
  useEffect(() => {
    const outsideFields = (target: EventTarget | null) =>
      !(
        target instanceof HTMLElement &&
        target.closest('input, textarea, select, [contenteditable="true"], [role="dialog"]')
      );
    const onCopy = (event: ClipboardEvent, cut: boolean) => {
      if (!outsideFields(event.target) || !gridRef.current?.getSelection()) return;
      const text = copyText(envRef.current);
      if (text === null) return;
      event.clipboardData?.setData('text/plain', text);
      event.preventDefault();
      if (cut) clearSelection(envRef.current);
    };
    const onPaste = (event: ClipboardEvent) => {
      if (!outsideFields(event.target)) return;
      const text = event.clipboardData?.getData('text/plain') ?? '';
      if (text === '') return;
      event.preventDefault();
      paste(envRef.current, text);
    };
    const copy = (event: ClipboardEvent) => onCopy(event, false);
    const cut = (event: ClipboardEvent) => onCopy(event, true);
    globalThis.document.addEventListener('copy', copy);
    globalThis.document.addEventListener('cut', cut);
    globalThis.document.addEventListener('paste', onPaste);
    return () => {
      globalThis.document.removeEventListener('copy', copy);
      globalThis.document.removeEventListener('cut', cut);
      globalThis.document.removeEventListener('paste', onPaste);
    };
  }, []);

  // Undo and redo: Ctrl/Cmd+Z, Ctrl/Cmd+Shift+Z and Ctrl+Y, except while typing in a field.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || event.altKey) return;
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        target.closest('input, textarea, select, [contenteditable="true"], [role="dialog"]')
      ) {
        return;
      }
      const key = event.key.toLowerCase();
      if (key === 'z' && !event.shiftKey) session.undo();
      else if ((key === 'z' && event.shiftKey) || key === 'y') session.redo();
      else return;
      event.preventDefault();
    };
    globalThis.document.addEventListener('keydown', onKeyDown);
    return () => globalThis.document.removeEventListener('keydown', onKeyDown);
  }, [session]);

  const handleSelection = useCallback((range: Range | null) => {
    setSelection(range);
    const layout = gridRef.current?.getLayout();
    if (!layout || !range) return;
    const row = layout.rowIds[range.row1];
    if (row) setAlternativeId(row);
    const column = layout.columnIds[range.col1];
    if (column && column !== CODE_COLUMN && column !== NAME_COLUMN) setCriterionId(column);
  }, []);

  const selectCriterion = useCallback((id: string | null) => {
    setCriterionId(id);
  }, []);
  const selectAlternative = useCallback((id: string | null) => {
    setAlternativeId(id);
  }, []);

  const cellCount = selection
    ? (selection.row2 - selection.row1 + 1) * (selection.col2 - selection.col1 + 1)
    : 0;
  const history = session.history;
  const undoEntry = history.nextUndo;
  const redoEntry = history.nextRedo;
  const hasRows = dataset.alternatives.length > 0;
  const hasSelection = selection !== null;

  const removeCurrentDataset = () => {
    const name = dataset.name;
    session.execute(removeDataset(dataset.id));
    session.history.sealMerge();
    toast(t('dataset.removed', { name }), {
      action: { label: t('toast.undo'), onClick: () => session.undo() },
    });
  };

  const button = (
    label: string,
    icon: React.ReactNode,
    onClick: () => void,
    options: { disabled?: boolean; testId?: string } = {},
  ) => (
    <button
      type="button"
      className={toolbarButtonClass}
      aria-label={label}
      title={label}
      disabled={options.disabled}
      onClick={onClick}
      data-testid={options.testId}
    >
      {icon}
    </button>
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
          {document.model.datasets.length > 1 && (
            <select
              className={`${fieldClass} w-48!`}
              aria-label={t('dataset.label')}
              value={dataset.id}
              onChange={(event) => onSelectDataset(event.target.value)}
            >
              {document.model.datasets.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          )}
          <input
            className={`${fieldClass} w-60!`}
            aria-label={t('dataset.name')}
            value={dataset.name}
            onChange={(event) =>
              session.execute(updateDataset(dataset.id, { name: event.target.value }))
            }
            onBlur={() => session.history.sealMerge()}
          />
          {button(t('dataset.add'), <Plus aria-hidden />, onCreateDataset)}
          {button(t('dataset.remove'), <Trash2 aria-hidden />, removeCurrentDataset)}
        </div>
        <p
          className="text-xs text-muted-foreground"
          role="status"
          data-testid="save-status"
          data-dirty={dirty}
        >
          {dirty ? t('status.pending') : t('status.saved')}
        </p>
      </div>

      <div
        role="toolbar"
        aria-label={t('toolbar.label')}
        className="flex flex-wrap items-center gap-1.5 rounded-lg border border-border bg-surface p-1.5"
      >
        {button(
          undoEntry
            ? t('toolbar.undoWith', { label: message(undoEntry.labelKey) })
            : t('toolbar.undo'),
          <Undo2 aria-hidden />,
          () => session.undo(),
          { disabled: !history.canUndo, testId: 'undo' },
        )}
        {button(
          redoEntry
            ? t('toolbar.redoWith', { label: message(redoEntry.labelKey) })
            : t('toolbar.redo'),
          <Redo2 aria-hidden />,
          () => session.redo(),
          { disabled: !history.canRedo, testId: 'redo' },
        )}
        <span className="mx-1 h-5 w-px bg-border" aria-hidden />
        {button(
          t('toolbar.insertRowAbove'),
          <ArrowUpToLine aria-hidden />,
          () => insertAlternative(env, 'above'),
          { testId: 'insert-row-above' },
        )}
        {button(
          t('toolbar.insertRowBelow'),
          <ArrowDownToLine aria-hidden />,
          () => insertAlternative(env, 'below'),
          { testId: 'insert-row-below' },
        )}
        {button(t('toolbar.deleteRows'), <Trash2 aria-hidden />, () => deleteAlternatives(env), {
          disabled: !hasSelection,
          testId: 'delete-rows',
        })}
        <span className="mx-1 h-5 w-px bg-border" aria-hidden />
        {button(
          t('toolbar.insertColumnLeft'),
          <ArrowLeftToLine aria-hidden />,
          () => insertCriterion(env, 'left'),
          { testId: 'insert-column-left' },
        )}
        {button(
          t('toolbar.insertColumnRight'),
          <ArrowRightToLine aria-hidden />,
          () => insertCriterion(env, 'right'),
          { testId: 'insert-column-right' },
        )}
        {button(t('toolbar.deleteColumns'), <X aria-hidden />, () => deleteCriteria(env), {
          disabled: !hasSelection,
          testId: 'delete-columns',
        })}
        <span className="mx-1 h-5 w-px bg-border" aria-hidden />
        {button(t('toolbar.bulkEdit'), <Wand2 aria-hidden />, () => setBulkOpen(true), {
          disabled: !hasSelection,
          testId: 'bulk-edit',
        })}
        <span className="mx-1 h-5 w-px bg-border" aria-hidden />
        <input
          type="search"
          className={`${fieldClass} h-8 w-48!`}
          aria-label={t('toolbar.search')}
          placeholder={t('toolbar.searchPlaceholder')}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <button
          type="button"
          className={toolbarButtonClass}
          aria-label={t('toolbar.filters')}
          title={t('toolbar.filters')}
          aria-pressed={showFilters}
          onClick={() => setShowFilters((value) => !value)}
        >
          <Filter aria-hidden />
        </button>
        <label className="flex items-center gap-1.5 px-1 text-xs text-muted-foreground">
          <input
            type="checkbox"
            checked={onlyIssues}
            onChange={(event) => setOnlyIssues(event.target.checked)}
          />
          {t('toolbar.onlyIssues')}
        </label>
        {(viewActive || search !== '' || onlyIssues) && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              gridRef.current?.clearView();
              setSearch('');
              setOnlyIssues(false);
            }}
          >
            {t('toolbar.clearView')}
          </Button>
        )}
        <button
          type="button"
          className={`${toolbarButtonClass} ml-auto`}
          aria-label={panel ? t('toolbar.panel.hide') : t('toolbar.panel.show')}
          title={panel ? t('toolbar.panel.hide') : t('toolbar.panel.show')}
          aria-pressed={panel !== null}
          onClick={() => setPanel((value) => (value ? null : 'criteria'))}
        >
          <PanelRight aria-hidden />
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span>
          {t('summary.size', {
            alternatives: dataset.alternatives.length,
            criteria: dataset.criteria.length,
          })}
        </span>
        <span aria-hidden>·</span>
        {summary.invalidCells + summary.duplicateCodes === 0 ? (
          <span className="inline-flex items-center gap-1 text-success">
            <CheckCircle2 className="size-3.5" aria-hidden />
            {t('summary.ok')}
          </span>
        ) : (
          <>
            {summary.invalidCells > 0 && (
              <span
                className="rounded-full bg-danger/10 px-2 py-0.5 text-danger"
                data-testid="invalid-count"
              >
                {t('summary.invalid', { count: summary.invalidCells })}
              </span>
            )}
            {summary.duplicateCodes > 0 && (
              <span className="rounded-full bg-warning/10 px-2 py-0.5 text-warning">
                {t('summary.duplicates', { count: summary.duplicateCodes })}
              </span>
            )}
          </>
        )}
        {summary.emptyCells > 0 && <span>{t('summary.empty', { count: summary.emptyCells })}</span>}
        {viewActive && <span className="text-warning">{t('toolbar.viewActive')}</span>}
        <span className="ml-auto hidden lg:inline">{t('toolbar.hint')}</span>
      </div>

      <div className="flex min-h-0 flex-col gap-4 lg:flex-row">
        <div className="h-[32rem] min-w-0 flex-1 lg:h-[calc(100dvh-24rem)] lg:min-h-[28rem]">
          <MatrixGrid
            ref={gridRef}
            dataset={dataset}
            scales={scales}
            rows={rows}
            search={search}
            showFilters={showFilters}
            onlyIssues={onlyIssues}
            locale={formatters.numberLocale}
            syntax={syntax}
            label={context.label}
            commands={commands}
            onSelectionChange={handleSelection}
            onViewChange={setViewActive}
            onFocusRow={selectAlternative}
          />
        </div>
        {panel && (
          <aside className="w-full shrink-0 rounded-lg border border-border bg-surface p-3 lg:w-80">
            <div role="tablist" aria-label={t('panels.tabs')} className="mb-3 flex gap-1">
              {(['criteria', 'alternatives'] as const).map((name) => (
                <button
                  key={name}
                  type="button"
                  role="tab"
                  aria-selected={panel === name}
                  onClick={() => setPanel(name)}
                  className="rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground aria-selected:bg-accent aria-selected:text-accent-foreground hover:bg-muted"
                >
                  {t(`panels.${name}`)}
                </button>
              ))}
            </div>
            {panel === 'criteria' ? (
              <CriteriaPanel
                session={session}
                dataset={dataset}
                scales={scales}
                selectedId={criterionId ?? dataset.criteria[0]?.id ?? null}
                onSelect={selectCriterion}
              />
            ) : (
              <AlternativesPanel
                session={session}
                dataset={dataset}
                selectedId={alternativeId ?? dataset.alternatives[0]?.id ?? null}
                onSelect={selectAlternative}
              />
            )}
          </aside>
        )}
      </div>

      {!hasRows && <span className="sr-only">{t('grid.empty')}</span>}
      <BulkEditDialog
        open={bulkOpen}
        count={cellCount}
        syntax={syntax}
        onOpenChange={setBulkOpen}
        onApply={(operation) => bulkEdit(env, operation)}
      />
    </div>
  );
}

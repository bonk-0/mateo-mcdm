import {
  Button,
  cn,
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@mateo/ui';
import {
  addDataset,
  addMatrix,
  randomId,
  removeDataset,
  updateCriterion,
  type Dataset,
  type ProjectDocument,
  type ProjectSession,
} from '@mateo/project';
import {
  ArrowLeftToLine,
  ArrowUpToLine,
  Download,
  FilePlus2,
  FileSpreadsheet,
  Filter,
  MoreHorizontal,
  Plus,
  Redo2,
  Table2,
  Trash2,
  Undo2,
  Upload,
  Wand2,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation, useNavigate } from 'react-router';
import { toast } from 'sonner';
import { useFormatters } from '../hooks/preferences';
import { clipboardInput, type ImportInput } from '../dataCenter/wizard';
import { useImporter } from '../dataCenter/useImporter';
import {
  DatasetSwitcher,
  Notice,
  StepFooter,
  StepHeader,
  useActiveDataset,
} from '../flow/FlowPage';
import { useFlowState } from '../flow/state';
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
import { MatrixExportDialog } from '../export/buttons';
import { fieldClass, toolbarButtonClass } from './ui';

export function EditorPage() {
  const { t } = useTranslation(['matrix', 'nav', 'flow']);
  const session = useSession();
  const document = useDocument(session);
  return (
    <div className="flex flex-col gap-6">
      {session && document ? (
        <ProjectEditor session={session} document={document} />
      ) : (
        <>
          <StepHeader
            title={t('nav:items.data.title')}
            description={t('nav:items.data.description')}
          />
          <Notice
            title={t('flow:gate.noProject.title')}
            description={t('flow:gate.noProject.description')}
          >
            <Button asChild>
              <Link to="/">{t('flow:gate.noProject.action')}</Link>
            </Button>
          </Notice>
        </>
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

/** Where a decision starts when the project has no data yet: a file, a paste or a blank table. */
function DataStart({
  onImport,
  onCreate,
}: {
  onImport: (input?: ImportInput | null) => void;
  onCreate: () => void;
}) {
  const { t } = useTranslation(['flow', 'dataCenter']);
  // A range copied in Excel and pasted anywhere on this screen starts an import.
  useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        target.closest('input, textarea, select, [role="dialog"]')
      ) {
        return;
      }
      const text = event.clipboardData?.getData('text/plain') ?? '';
      if (!/[\t\n]/u.test(text.trim())) return;
      event.preventDefault();
      onImport(clipboardInput(text, t('dataCenter:upload.paste.fileName')));
    };
    globalThis.document.addEventListener('paste', onPaste);
    return () => globalThis.document.removeEventListener('paste', onPaste);
  }, [onImport, t]);
  return (
    <EmptyState
      icon={<Table2 className="size-8" aria-hidden />}
      title={t('flow:data.empty.title')}
      description={t('flow:data.empty.description')}
    >
      <Button onClick={() => onImport()} data-testid="import-file">
        <Upload aria-hidden />
        {t('flow:data.empty.import')}
      </Button>
      <Button variant="outline" onClick={onCreate} data-testid="create-dataset">
        <Plus aria-hidden />
        {t('flow:data.empty.blank')}
      </Button>
    </EmptyState>
  );
}

function ProjectEditor({
  session,
  document,
}: {
  session: ProjectSession;
  document: ProjectDocument;
}) {
  const { t } = useTranslation(['matrix', 'nav', 'flow']);
  const dataset = useActiveDataset(document);
  const setDataset = useFlowState((state) => state.setDataset);
  const importer = useImporter(session, setDataset);
  const openImport = importer.open;

  // The start page hands over a file dropped on it, or asks for the import dialog.
  const location = useLocation();
  const navigate = useNavigate();
  const handed = location.state as { importInput?: ImportInput; importFile?: boolean } | null;
  useEffect(() => {
    if (!handed?.importInput && !handed?.importFile) return;
    openImport(handed.importInput ?? null);
    void navigate(location.pathname, { replace: true, state: null });
  }, [handed, openImport, navigate, location.pathname]);

  const create = () => {
    const created = newDataset(t('matrix:dataset.defaultName'));
    session.execute(addDataset(created));
    session.history.sealMerge();
    setDataset(created.id);
  };

  return (
    <>
      <StepHeader
        title={t('nav:items.data.title')}
        description={t('nav:items.data.description')}
        aside={dataset ? <DatasetSwitcher document={document} dataset={dataset} /> : null}
      />
      {dataset ? (
        <MatrixEditor
          key={dataset.id}
          session={session}
          document={document}
          dataset={dataset}
          onCreateDataset={create}
          onImport={openImport}
        />
      ) : (
        <DataStart onImport={openImport} onCreate={create} />
      )}
      {importer.dialog}
      {dataset && (
        <StepFooter
          next={{
            to: '/weights',
            label: t('flow:data.next'),
            disabled: dataset.alternatives.length === 0 || dataset.criteria.length === 0,
          }}
        />
      )}
    </>
  );
}

function MatrixEditor({
  session,
  document,
  dataset,
  onCreateDataset,
  onImport,
}: {
  session: ProjectSession;
  document: ProjectDocument;
  dataset: Dataset;
  onCreateDataset: () => void;
  onImport: () => void;
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
  const [panel, setPanel] = useState<'criteria' | 'alternatives' | null>(null);
  const [findOpen, setFindOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const navigate = useNavigate();
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

  const issues = summary.invalidCells + summary.duplicateCodes;
  const toggleDirection = (id: string, direction: 'benefit' | 'cost') => {
    session.execute(
      updateCriterion(dataset.id, id, { direction: direction === 'benefit' ? 'cost' : 'benefit' }),
    );
    session.history.sealMerge();
  };

  return (
    <div className="flex flex-col gap-3">
      <div
        role="toolbar"
        aria-label={t('toolbar.label')}
        className="flex flex-wrap items-center gap-1.5"
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
        <Button
          variant="outline"
          size="sm"
          onClick={() => insertAlternative(envRef.current, 'below')}
          data-testid="insert-row-below"
        >
          <Plus aria-hidden />
          {t('toolbar.addAlternative')}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => insertCriterion(envRef.current, 'right')}
          data-testid="insert-column-right"
        >
          <Plus aria-hidden />
          {t('toolbar.addCriterion')}
        </Button>
        <span className="ml-auto" />
        <p
          className="px-2 text-xs text-muted-foreground"
          role="status"
          data-testid="save-status"
          data-dirty={dirty}
        >
          {dirty ? t('status.pending') : t('status.saved')}
        </p>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" data-testid="more-actions">
              <MoreHorizontal aria-hidden />
              {t('toolbar.more')}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuItem
              onSelect={() => insertAlternative(envRef.current, 'above')}
              data-testid="insert-row-above"
            >
              <ArrowUpToLine aria-hidden />
              {t('toolbar.insertRowAbove')}
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => insertCriterion(envRef.current, 'left')}
              data-testid="insert-column-left"
            >
              <ArrowLeftToLine aria-hidden />
              {t('toolbar.insertColumnLeft')}
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={!hasSelection}
              onSelect={() => deleteAlternatives(envRef.current)}
              data-testid="delete-rows"
            >
              <Trash2 aria-hidden />
              {t('toolbar.deleteRows')}
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={!hasSelection}
              onSelect={() => deleteCriteria(envRef.current)}
              data-testid="delete-columns"
            >
              <X aria-hidden />
              {t('toolbar.deleteColumns')}
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={!hasSelection}
              onSelect={() => setBulkOpen(true)}
              data-testid="bulk-edit"
            >
              <Wand2 aria-hidden />
              {t('toolbar.bulkEdit')}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuCheckboxItem
              checked={findOpen}
              onCheckedChange={(checked) => {
                setFindOpen(checked);
                if (!checked) {
                  gridRef.current?.clearView();
                  setSearch('');
                  setShowFilters(false);
                  setOnlyIssues(false);
                }
              }}
              data-testid="toggle-find"
            >
              {t('toolbar.find')}
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={panel !== null}
              onCheckedChange={(checked) => setPanel(checked ? 'criteria' : null)}
              data-testid="toggle-panel"
            >
              {t('toolbar.panel.details')}
            </DropdownMenuCheckboxItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={onImport} data-testid="menu-import">
              <Upload aria-hidden />
              {t('toolbar.import')}
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setExportOpen(true)} data-testid="export-matrix">
              <Download aria-hidden />
              {t('toolbar.export')}
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => void navigate('/data/sources')}>
              <FileSpreadsheet aria-hidden />
              {t('toolbar.sources')}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={onCreateDataset}>
              <FilePlus2 aria-hidden />
              {t('dataset.add')}
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={removeCurrentDataset}>
              <Trash2 aria-hidden />
              {t('dataset.remove')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {dataset.criteria.length > 0 && (
        <div
          className="flex flex-wrap items-center gap-2 text-sm"
          data-testid="criteria-directions"
        >
          <span className="text-muted-foreground">{t('directions.label')}</span>
          {dataset.criteria.map((criterion) => {
            const benefit = criterion.direction === 'benefit';
            const name = criterion.name || criterion.code;
            return (
              <button
                key={criterion.id}
                type="button"
                onClick={() => toggleDirection(criterion.id, criterion.direction)}
                title={t('directions.toggle')}
                aria-label={t(benefit ? 'directions.ariaBenefit' : 'directions.ariaCost', { name })}
                className={cn(
                  'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors hover:brightness-110',
                  benefit
                    ? 'border-success/40 bg-success/10 text-success'
                    : 'border-danger/40 bg-danger/10 text-danger',
                )}
              >
                <span className="max-w-40 truncate text-foreground">{name}</span>
                <span aria-hidden>{benefit ? '↑' : '↓'}</span>
                <span>{t(benefit ? 'directions.benefit' : 'directions.cost')}</span>
              </button>
            );
          })}
        </div>
      )}

      {findOpen && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-surface p-2">
          <input
            type="search"
            className={`${fieldClass} h-8 w-56!`}
            aria-label={t('toolbar.search')}
            placeholder={t('toolbar.searchPlaceholder')}
            value={search}
            autoFocus
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
          {viewActive && <span className="text-xs text-warning">{t('toolbar.viewActive')}</span>}
        </div>
      )}

      {(issues > 0 || hasRows) && (
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span>
            {t('summary.size', {
              alternatives: dataset.alternatives.length,
              criteria: dataset.criteria.length,
            })}
          </span>
          {summary.invalidCells > 0 && (
            <button
              type="button"
              className="rounded-full bg-danger/10 px-2 py-0.5 text-danger hover:underline"
              data-testid="invalid-count"
              onClick={() => {
                setFindOpen(true);
                setOnlyIssues(true);
              }}
            >
              {t('summary.invalid', { count: summary.invalidCells })}
            </button>
          )}
          {summary.duplicateCodes > 0 && (
            <span className="rounded-full bg-warning/10 px-2 py-0.5 text-warning">
              {t('summary.duplicates', { count: summary.duplicateCodes })}
            </span>
          )}
          {summary.emptyCells > 0 && (
            <span>{t('summary.empty', { count: summary.emptyCells })}</span>
          )}
          {!hasRows && <span>{t('toolbar.hint')}</span>}
        </div>
      )}

      <div className="flex min-h-0 flex-col gap-4 lg:flex-row">
        <div className="h-[28rem] min-w-0 flex-1 lg:h-[calc(100dvh-26rem)] lg:min-h-[24rem]">
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
      {exportOpen && (
        <MatrixExportDialog
          document={document}
          dataset={dataset}
          onClose={() => setExportOpen(false)}
        />
      )}
    </div>
  );
}

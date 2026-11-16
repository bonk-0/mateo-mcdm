import type { ValidationIssue } from '@mateo/engine';
import {
  removeDataset,
  type ImportProfile,
  type ImportRecord,
  type ProjectDocument,
  type ProjectSession,
  type SourceFileInfo,
} from '@mateo/project';
import { Badge, Button } from '@mateo/ui';
import {
  ClipboardPaste,
  Download,
  FilePlus2,
  FileSpreadsheet,
  FolderOpen,
  Table2,
  Trash2,
  Upload,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router';
import { runCommand } from '../commands/commands';
import { EmptyState } from '../editor/EditorPage';
import { useDocument, useSession } from '../editor/session';
import { useFormatters } from '../hooks/preferences';
import { PageHeader } from '../routes/PageHeader';
import { ImportWizard } from './ImportWizard';
import { IssueList } from './steps';
import { clipboardInput, type ImportInput } from './wizard';

interface Records {
  readonly files: readonly SourceFileInfo[];
  readonly imports: readonly ImportRecord[];
  readonly profiles: readonly ImportProfile[];
}

const NO_RECORDS: Records = { files: [], imports: [], profiles: [] };

/** Source files, import history and profiles of the open project; `reload` re-reads them. */
function useRecords(session: ProjectSession): { records: Records; reload: () => void } {
  const [records, setRecords] = useState<Records>(NO_RECORDS);
  const [version, setVersion] = useState(0);
  useEffect(() => {
    let current = true;
    void Promise.all([
      session.listSourceFiles(),
      session.listImports(),
      session.listImportProfiles(),
    ]).then(
      ([files, imports, profiles]) => {
        if (current) setRecords({ files, imports, profiles });
      },
      () => {
        // A closed project has nothing to show.
      },
    );
    return () => {
      current = false;
    };
  }, [session, version]);
  const reload = useCallback(() => setVersion((value) => value + 1), []);
  return { records, reload };
}

export function DataCenterPage() {
  const { t } = useTranslation(['dataCenter', 'nav']);
  const session = useSession();
  const document = useDocument(session);
  return (
    <div className="flex flex-col">
      <PageHeader
        title={t('nav:items.dataCenter.title')}
        description={t('nav:items.dataCenter.description')}
      />
      {session && document ? (
        <DataCenter session={session} document={document} />
      ) : (
        <EmptyState
          icon={<FileSpreadsheet className="size-8" aria-hidden />}
          title={t('dataCenter:page.noProject.title')}
          description={t('dataCenter:page.noProject.description')}
        >
          <Button onClick={() => runCommand('file.new')}>
            <FilePlus2 aria-hidden />
            {t('dataCenter:page.new')}
          </Button>
          <Button variant="outline" onClick={() => runCommand('file.open')}>
            <FolderOpen aria-hidden />
            {t('dataCenter:page.open')}
          </Button>
        </EmptyState>
      )}
    </div>
  );
}

function isEditable(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
}

function DataCenter({ session, document }: { session: ProjectSession; document: ProjectDocument }) {
  const { t } = useTranslation('dataCenter');
  const navigate = useNavigate();
  const { records, reload } = useRecords(session);
  const [wizard, setWizard] = useState<{ input: ImportInput | null } | null>(null);

  // A range copied in Excel and pasted anywhere on this screen starts an import.
  useEffect(() => {
    if (wizard) return;
    const onPaste = (event: ClipboardEvent) => {
      if (isEditable(event.target)) return;
      const text = event.clipboardData?.getData('text/plain') ?? '';
      if (!/[\t\n]/u.test(text.trim())) return;
      event.preventDefault();
      setWizard({ input: clipboardInput(text, t('upload.paste.fileName')) });
    };
    globalThis.document.addEventListener('paste', onPaste);
    return () => globalThis.document.removeEventListener('paste', onPaste);
  }, [wizard, t]);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap gap-2">
        <Button data-testid="import-file" onClick={() => setWizard({ input: null })}>
          <Upload aria-hidden />
          {t('page.importFile')}
        </Button>
        <Button variant="outline" onClick={() => setWizard({ input: null })}>
          <ClipboardPaste aria-hidden />
          {t('page.pasteTable')}
        </Button>
      </div>
      <p className="-mt-5 text-xs text-muted-foreground">{t('page.pasteHint')}</p>

      <DatasetsSection document={document} session={session} onChanged={reload} />
      <FilesSection files={records.files} session={session} />
      <HistorySection records={records} document={document} />
      <ProfilesSection profiles={records.profiles} session={session} onChanged={reload} />

      {wizard && (
        <ImportWizard
          // A new key starts a fresh wizard for pasted text.
          key={wizard.input ? 'paste' : 'file'}
          session={session}
          profiles={records.profiles}
          initialInput={wizard.input}
          onClose={() => setWizard(null)}
          onImported={(datasetId) => {
            setWizard(null);
            reload();
            void navigate('/matrix', { state: { datasetId } });
          }}
        />
      )}
    </div>
  );
}

function Section({
  id,
  title,
  description,
  children,
}: {
  id: string;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-3">
      <div>
        <h2 id={id} className="text-base font-semibold">
          {title}
        </h2>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      {children}
    </section>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-md border border-dashed border-border bg-surface px-4 py-6 text-center text-sm text-muted-foreground">
      {children}
    </p>
  );
}

function DatasetsSection({
  document,
  session,
  onChanged,
}: {
  document: ProjectDocument;
  session: ProjectSession;
  onChanged: () => void;
}) {
  const { t } = useTranslation('dataCenter');
  const formatters = useFormatters();
  const datasets = document.model.datasets;
  return (
    <Section id="datasets" title={t('page.datasets.title')}>
      {datasets.length === 0 ? (
        <Empty>{t('page.datasets.empty')}</Empty>
      ) : (
        <ul className="flex flex-col gap-2" data-testid="dataset-list">
          {datasets.map((dataset) => (
            <li
              key={dataset.id}
              className="flex flex-wrap items-center gap-3 rounded-md border border-border bg-surface px-4 py-3"
            >
              <Table2 className="size-4 text-muted-foreground" aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium" translate="no">
                  {dataset.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t('page.datasets.size', {
                    alternatives: dataset.alternatives.length,
                    criteria: dataset.criteria.length,
                  })}{' '}
                  · {formatters.date(new Date(dataset.createdAt), 'medium', true)}
                </p>
              </div>
              <Button asChild variant="outline" size="sm">
                <Link to="/matrix" state={{ datasetId: dataset.id }}>
                  {t('page.datasets.open')}
                </Link>
              </Button>
              <Button
                variant="ghost"
                size="icon"
                aria-label={t('page.datasets.delete', { name: dataset.name })}
                onClick={() => {
                  session.execute(removeDataset(dataset.id));
                  session.history.sealMerge();
                  onChanged();
                }}
              >
                <Trash2 aria-hidden />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function FilesSection({
  files,
  session,
}: {
  files: readonly SourceFileInfo[];
  session: ProjectSession;
}) {
  const { t } = useTranslation('dataCenter');
  const formatters = useFormatters();
  const download = async (file: SourceFileInfo) => {
    const bytes = await session.readSourceFile(file.id);
    const url = URL.createObjectURL(
      new Blob([bytes as BlobPart], { type: file.mediaType || 'application/octet-stream' }),
    );
    const link = globalThis.document.createElement('a');
    link.href = url;
    link.download = file.name;
    link.click();
    URL.revokeObjectURL(url);
  };
  return (
    <Section id="files" title={t('page.files.title')} description={t('page.files.description')}>
      {files.length === 0 ? (
        <Empty>{t('page.files.empty')}</Empty>
      ) : (
        <ul className="flex flex-col gap-2" data-testid="file-list">
          {files.map((file) => (
            <li
              key={file.id}
              className="flex flex-wrap items-center gap-3 rounded-md border border-border bg-surface px-4 py-3"
            >
              <FileSpreadsheet className="size-4 text-muted-foreground" aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium" translate="no">
                  {file.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatSize(file.byteSize)} ·{' '}
                  {formatters.date(new Date(file.addedAt), 'medium', true)}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => void download(file)}
                aria-label={t('page.files.download', { name: file.name })}
              >
                <Download aria-hidden />
                {t('page.files.downloadShort')}
              </Button>
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}

function HistorySection({ records, document }: { records: Records; document: ProjectDocument }) {
  const { t } = useTranslation('dataCenter');
  const formatters = useFormatters();
  const imports = [...records.imports].reverse();
  return (
    <Section id="history" title={t('page.history.title')}>
      {imports.length === 0 ? (
        <Empty>{t('page.history.empty')}</Empty>
      ) : (
        <ul className="flex flex-col gap-2" data-testid="history-list">
          {imports.map((entry) => {
            const dataset = document.model.datasets.find((item) => item.id === entry.datasetId);
            const file = records.files.find((item) => item.id === entry.sourceFileId);
            const profile = records.profiles.find((item) => item.id === entry.profileId);
            const warnings = Array.isArray(entry.issues)
              ? (entry.issues as unknown as ValidationIssue[])
              : [];
            return (
              <li
                key={entry.id}
                className="flex flex-col gap-2 rounded-md border border-border bg-surface px-4 py-3"
              >
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="font-medium" translate={file ? 'no' : undefined}>
                    {file?.name ?? t('page.history.fileGone')}
                  </span>
                  <span aria-hidden>→</span>
                  <span translate={dataset ? 'no' : undefined}>
                    {dataset?.name ?? t('page.history.datasetGone')}
                  </span>
                  {profile && (
                    <Badge variant="outline" translate="no">
                      {profile.name}
                    </Badge>
                  )}
                  <span className="ml-auto text-xs text-muted-foreground">
                    {formatters.date(new Date(entry.importedAt), 'medium', true)}
                  </span>
                </div>
                {warnings.length === 0 ? (
                  <p className="text-xs text-muted-foreground">{t('page.history.noWarnings')}</p>
                ) : (
                  <details>
                    <summary className="cursor-pointer text-xs text-muted-foreground">
                      {t('page.history.warnings', { count: warnings.length })}
                    </summary>
                    <div className="mt-2">
                      <IssueList issues={warnings} />
                    </div>
                  </details>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Section>
  );
}

function ProfilesSection({
  profiles,
  session,
  onChanged,
}: {
  profiles: readonly ImportProfile[];
  session: ProjectSession;
  onChanged: () => void;
}) {
  const { t } = useTranslation('dataCenter');
  return (
    <Section
      id="profiles"
      title={t('page.profiles.title')}
      description={t('page.profiles.description')}
    >
      {profiles.length === 0 ? (
        <Empty>{t('page.profiles.empty')}</Empty>
      ) : (
        <ul className="flex flex-col gap-2" data-testid="profile-list">
          {profiles.map((profile) => (
            <li
              key={profile.id}
              className="flex items-center gap-3 rounded-md border border-border bg-surface px-4 py-3"
            >
              <span className="min-w-0 flex-1 truncate font-medium" translate="no">
                {profile.name}
              </span>
              <Button
                variant="ghost"
                size="icon"
                aria-label={t('page.profiles.delete', { name: profile.name })}
                onClick={() => {
                  void session.deleteImportProfile(profile.id).then(onChanged);
                }}
              >
                <Trash2 aria-hidden />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}

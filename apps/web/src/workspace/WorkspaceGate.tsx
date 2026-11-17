import { Button } from '@mateo/ui';
import type { Dataset, ProjectDocument, ProjectSession } from '@mateo/project';
import { FilePlus2, FolderOpen, Table2 } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useSearchParams } from 'react-router';
import { runCommand } from '../commands/commands';
import { useDocument, useSession } from '../editor/session';
import { fieldClass, labelClass } from '../editor/ui';
import { DATASET_PARAM } from '../library/preset';
import { PageHeader } from '../routes/PageHeader';

export interface WorkspaceContext {
  readonly session: ProjectSession;
  readonly document: ProjectDocument;
  readonly dataset: Dataset;
}

function EmptyCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="flex min-h-[40vh] flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-surface p-8 text-center">
      <div className="flex size-14 items-center justify-center rounded-2xl bg-accent text-accent-foreground">
        <Table2 className="size-8" aria-hidden />
      </div>
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="max-w-md text-sm text-muted-foreground">{description}</p>
      <div className="mt-2 flex flex-wrap justify-center gap-2">{children}</div>
    </section>
  );
}

/**
 * The frame of every workspace: page header, the "no project" and "no decision problem"
 * states, and a picker when the project has several decision problems.
 */
export function WorkspaceGate({
  title,
  description,
  children,
  needsDataset = true,
}: {
  title: string;
  description: string;
  children: (context: WorkspaceContext) => ReactNode;
  /** The results page works on the whole project, not on one decision problem. */
  needsDataset?: boolean;
}) {
  const { t } = useTranslation('workspace');
  const session = useSession();
  const document = useDocument(session);
  const [search] = useSearchParams();
  // A link can name the decision problem to open, as the Method Library does for its samples.
  const [datasetId, setDatasetId] = useState<string | null>(search.get(DATASET_PARAM));

  let body: ReactNode;
  if (!session || !document) {
    body = (
      <EmptyCard title={t('gate.noProject.title')} description={t('gate.noProject.description')}>
        <Button onClick={() => runCommand('file.new')}>
          <FilePlus2 aria-hidden />
          {t('gate.newProject')}
        </Button>
        <Button variant="outline" onClick={() => runCommand('file.open')}>
          <FolderOpen aria-hidden />
          {t('gate.openProject')}
        </Button>
      </EmptyCard>
    );
  } else {
    const datasets = document.model.datasets;
    const dataset = datasets.find((item) => item.id === datasetId) ?? datasets[0];
    if (!dataset && needsDataset) {
      body = (
        <EmptyCard title={t('gate.noDataset.title')} description={t('gate.noDataset.description')}>
          <Button asChild>
            <Link to="/matrix">{t('gate.toMatrix')}</Link>
          </Button>
        </EmptyCard>
      );
    } else {
      body = (
        <div className="space-y-6">
          {needsDataset && dataset && datasets.length > 1 && (
            <label className="block max-w-sm space-y-1">
              <span className={labelClass}>{t('gate.dataset')}</span>
              <select
                className={fieldClass}
                value={dataset.id}
                onChange={(event) => setDatasetId(event.target.value)}
              >
                {datasets.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          {/* A changed decision problem starts with fresh form state. */}
          <div key={dataset?.id ?? 'none'}>
            {children({ session, document, dataset: dataset as Dataset })}
          </div>
        </div>
      );
    }
  }
  return (
    <div className="flex flex-col">
      <PageHeader title={title} description={description} />
      {body}
    </div>
  );
}

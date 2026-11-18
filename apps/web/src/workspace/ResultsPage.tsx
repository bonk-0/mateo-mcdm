import type { AnalysisSummary, StoredAnalysis } from '@mateo/project';
import { Badge, Button } from '@mateo/ui';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { useMessage } from '../editor/messages';
import { useFormatters } from '../hooks/preferences';
import { AnalysisView, methodKey } from './AnalysisView';
import { isCurrent, kindOfMethod } from './analyses';
import type { ProjectDocument, ProjectSession } from '@mateo/project';
import { Notice, StepHeader } from '../flow/FlowPage';
import { useDocument, useSession } from '../editor/session';

function ResultsWorkspace({
  session,
  document,
}: {
  session: ProjectSession;
  document: ProjectDocument;
}) {
  const { t } = useTranslation('workspace');
  const message = useMessage();
  const formatters = useFormatters();
  const navigate = useNavigate();
  const [search] = useSearchParams();
  const [list, setList] = useState<AnalysisSummary[] | null>(null);
  const [shown, setShown] = useState<StoredAnalysis | null>(null);
  const selected = search.get('analysis');

  useEffect(() => {
    let cancelled = false;
    void session.listAnalyses().then((all) => !cancelled && setList([...all].reverse()));
    return () => {
      cancelled = true;
    };
  }, [session]);

  // Reading a stored analysis does not run anything: the result comes from the file.
  useEffect(() => {
    if (!selected) {
      setShown(null);
      return;
    }
    let cancelled = false;
    void session.getAnalysis(selected).then(
      (loaded) => !cancelled && setShown(loaded),
      () => !cancelled && setShown(null),
    );
    return () => {
      cancelled = true;
    };
  }, [session, selected]);

  if (list === null) return null;
  if (list.length === 0) {
    return (
      <Notice title={t('results.empty.title')} description={t('results.empty.description')}>
        <Button asChild>
          <Link to="/result">{t('results.empty.result')}</Link>
        </Button>
      </Notice>
    );
  }
  const datasetName = (id: string) =>
    document.model.datasets.find((dataset) => dataset.id === id)?.name ?? '';
  return (
    <div className="grid gap-8 lg:grid-cols-[18rem_1fr]">
      <nav aria-label={t('results.list')}>
        <ul className="space-y-2" data-testid="analysis-list">
          {list.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                aria-current={item.id === selected ? 'true' : undefined}
                onClick={() =>
                  void navigate(`/result/history?analysis=${encodeURIComponent(item.id)}`)
                }
                className={`w-full rounded-lg border p-3 text-left text-sm ${item.id === selected ? 'border-primary bg-accent' : 'border-border bg-surface hover:bg-muted'}`}
              >
                <span className="block font-medium">
                  {item.name || message(`methods.${methodKey(item.methodId)}.name`)}
                </span>
                <span className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                  <Badge variant="outline">
                    {t(`results.kind.${kindOfMethod(item.methodId)}`)}
                  </Badge>
                  <span>{datasetName(item.datasetId)}</span>
                  <span>{formatters.date(new Date(item.createdAt), 'medium', true)}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </nav>
      <div>
        {shown ? (
          <AnalysisView analysis={shown} stale={!isCurrent(session, shown)} />
        ) : (
          <p className="text-sm text-muted-foreground">{t('results.pick')}</p>
        )}
      </div>
    </div>
  );
}

export function ResultsPage() {
  const { t } = useTranslation(['nav', 'flow']);
  const session = useSession();
  const document = useDocument(session);
  return (
    <div className="flex flex-col gap-8">
      <StepHeader title={t('items.history.title')} description={t('items.history.description')} />
      {session && document ? (
        <ResultsWorkspace session={session} document={document} />
      ) : (
        <Notice
          title={t('flow:gate.noProject.title')}
          description={t('flow:gate.noProject.description')}
        >
          <Button asChild>
            <Link to="/">{t('flow:gate.noProject.action')}</Link>
          </Button>
        </Notice>
      )}
    </div>
  );
}

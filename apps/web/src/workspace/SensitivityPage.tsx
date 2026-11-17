import type { AnalysisSummary, StoredAnalysis } from '@mateo/project';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { useMessage } from '../editor/messages';
import { fieldClass, labelClass } from '../editor/ui';
import { useFormatters } from '../hooks/preferences';
import { methodKey } from './AnalysisView';
import { kindOfMethod } from './analyses';
import { SensitivityPanel } from './SensitivityPanel';
import { WorkspaceGate, type WorkspaceContext } from './WorkspaceGate';

function SensitivityWorkspace({ session, document, dataset }: WorkspaceContext) {
  const { t } = useTranslation('workspace');
  const message = useMessage();
  const formatters = useFormatters();
  const [available, setAvailable] = useState<AnalysisSummary[] | null>(null);
  const [chosenId, setChosenId] = useState('');
  const [chosen, setChosen] = useState<StoredAnalysis | null>(null);

  // The ranking analyses of this decision problem, newest first.
  useEffect(() => {
    let cancelled = false;
    void session.listAnalyses(dataset.id).then((list) => {
      if (cancelled) return;
      const ranking = list.filter((item) => kindOfMethod(item.methodId) === 'ranking').reverse();
      setAvailable(ranking);
      setChosenId((current) =>
        ranking.some((item) => item.id === current) ? current : (ranking[0]?.id ?? ''),
      );
    });
    return () => {
      cancelled = true;
    };
  }, [session, dataset.id]);

  useEffect(() => {
    if (chosenId === '') {
      setChosen(null);
      return;
    }
    let cancelled = false;
    void session.getAnalysis(chosenId).then(
      (loaded) => !cancelled && setChosen(loaded),
      () => !cancelled && setChosen(null),
    );
    return () => {
      cancelled = true;
    };
  }, [session, chosenId]);

  if (available === null) return null;
  if (available.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        {t('sensitivityPage.none')}{' '}
        <Link to="/analysis/marcos" className="font-medium text-primary underline">
          {t('sensitivityPage.toMarcos')}
        </Link>
      </p>
    );
  }
  return (
    <div className="space-y-8">
      <label className="block max-w-md space-y-1">
        <span className={labelClass}>{t('sensitivityPage.choose')}</span>
        <select
          className={fieldClass}
          value={chosenId}
          onChange={(event) => setChosenId(event.target.value)}
          data-testid="sensitivity-analysis"
        >
          {available.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name || message(`methods.${methodKey(item.methodId)}.name`)} ·{' '}
              {formatters.date(new Date(item.createdAt), 'medium', true)}
            </option>
          ))}
        </select>
      </label>
      {chosen && <SensitivityPanel analysis={chosen} session={session} document={document} />}
    </div>
  );
}

export function SensitivityPage() {
  const { t } = useTranslation('nav');
  return (
    <WorkspaceGate
      title={t('items.sensitivity.title')}
      description={t('items.sensitivity.description')}
    >
      {(context) => <SensitivityWorkspace {...context} />}
    </WorkspaceGate>
  );
}

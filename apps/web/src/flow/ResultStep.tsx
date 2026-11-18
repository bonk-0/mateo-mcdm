import { Button, cn } from '@mateo/ui';
import { History, Play, SlidersHorizontal } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { useMessage, useTextRef } from '../editor/messages';
import { AnalysisExportButton } from '../export/buttons';
import { useFormatters } from '../hooks/preferences';
import { methodKey, RankingSection } from '../workspace/AnalysisView';
import { DatasetProblems, ValidationProblems } from '../workspace/Problems';
import { rankingRows } from '../workspace/resultData';
import { SensitivityPanel } from '../workspace/SensitivityPanel';
import { FlowPage, Notice, StepFooter, type FlowContext } from './FlowPage';
import { Bars, Disclosure, HowCalculated } from './parts';
import { planRanking, planWeights, weightingMethodOf, weightsOf, type AnyWeights } from './plan';
import { useSamplePreset } from './sample';
import { needsFuzzyModel, useWeightChoice } from './state';
import { shownAnalysis, useStoredRun, type RunState } from './storedRun';
import type { WeightSource } from '../workspace/analyses';
import type { StoredAnalysis } from '@mateo/project';

type Panel = 'explain' | 'sensitivity' | null;

/** The weights the result step ranks with: from the weights step's choice. */
function useChosenWeights({ session, dataset }: FlowContext): {
  weights: AnyWeights | null;
  source: WeightSource | null;
  state: RunState | null;
  blocked: boolean;
} {
  const [choice] = useWeightChoice(dataset);
  const plan = useMemo(() => planWeights(dataset, choice), [dataset, choice]);
  const run = useStoredRun(session, dataset.id, plan.kind === 'run' ? plan.run : null, 0);
  if (plan.kind === 'direct') {
    return { weights: plan.weights, source: plan.source, state: null, blocked: false };
  }
  if (plan.kind !== 'run') return { weights: null, source: null, state: null, blocked: true };
  if (run.status !== 'done') {
    return { weights: null, source: null, state: run, blocked: run.status === 'failed' };
  }
  return {
    weights: weightsOf(run.analysis),
    source: {
      source: 'analysis',
      analysisId: run.analysis.id,
      methodId: run.analysis.methodId,
    },
    state: run,
    blocked: false,
  };
}

function Winner({ analysis }: { analysis: StoredAnalysis }) {
  const { t } = useTranslation('flow');
  const textOf = useTextRef();
  const formatters = useFormatters();
  const rows = useMemo(
    () => rankingRows(analysis.record.result, analysis.record.trace),
    [analysis],
  );
  const best = rows[0];
  if (!best) return null;
  const top = rows[0]?.score ?? 0;
  const tied = rows.filter((row) => row.rank === best.rank);
  return (
    <div className="flex flex-col gap-5">
      <div
        className="flex flex-wrap items-center gap-4 rounded-xl bg-navy px-6 py-5 text-navy-foreground"
        data-testid="winner"
      >
        <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-white/10 text-xl font-semibold">
          1
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm opacity-75">
            {t(tied.length > 1 ? 'result.bestTied' : 'result.best')}
          </p>
          <p className="truncate text-2xl font-semibold">
            {tied.map((row) => textOf(row.label)).join(', ')}
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm opacity-75">{t('result.score')}</p>
          <p className="text-2xl font-semibold tabular-nums">{formatters.value(best.score)}</p>
        </div>
      </div>
      <Bars
        label={t('result.ranking')}
        testId="ranking-table"
        rows={rows.map((row) => ({
          id: row.alternativeId,
          label: textOf(row.label),
          prefix: String(row.rank),
          share: top > 0 ? row.score / top : 0,
          text: formatters.value(row.score),
          highlight: row.rank === best.rank,
        }))}
      />
    </div>
  );
}

function ActionCard({
  icon,
  title,
  hint,
  active,
  onClick,
  testId,
}: {
  icon: React.ReactNode;
  title: string;
  hint: string;
  active: boolean;
  onClick: () => void;
  testId: string;
}) {
  return (
    <button
      type="button"
      aria-expanded={active}
      onClick={onClick}
      data-testid={testId}
      className={cn(
        'flex flex-col gap-1 rounded-lg border bg-surface p-4 text-left text-sm transition-colors',
        active ? 'border-primary ring-1 ring-primary' : 'border-border hover:bg-muted',
      )}
    >
      <span className="flex items-center gap-2 font-semibold [&_svg]:size-4 [&_svg]:text-primary">
        {icon}
        {title}
      </span>
      <span className="text-muted-foreground">{hint}</span>
    </button>
  );
}

function Result(context: FlowContext) {
  const { session, document, dataset } = context;
  const { t } = useTranslation(['flow', 'nav']);
  const message = useMessage();
  useSamplePreset(dataset);
  const [choice] = useWeightChoice(dataset);
  const chosen = useChosenWeights(context);
  const fuzzyData = useMemo(() => needsFuzzyModel(dataset), [dataset]);
  const plan = useMemo(
    () =>
      chosen.weights && chosen.source
        ? planRanking(dataset, document.model.scales, chosen.weights, chosen.source, fuzzyData)
        : null,
    [dataset, document.model.scales, chosen.weights, chosen.source, fuzzyData],
  );
  const run = useStoredRun(session, dataset.id, plan?.kind === 'run' ? plan.run : null, 0);
  const analysis = shownAnalysis(run);
  const [panel, setPanel] = useState<Panel>(null);
  const toggle = (next: Exclude<Panel, null>) =>
    setPanel((current) => (current === next ? null : next));

  if (chosen.blocked || chosen.state?.status === 'failed') {
    return (
      <Notice title={t('result.noWeights.title')} description={t('result.noWeights.description')}>
        <Button asChild>
          <Link to="/weights">{t('result.noWeights.action')}</Link>
        </Button>
      </Notice>
    );
  }

  const weightMethod = weightingMethodOf(choice);
  const summary = [
    choice.mode === 'manual'
      ? t('result.weightsManual')
      : choice.mode === 'sample'
        ? t('result.weightsSample')
        : weightMethod
          ? message(`methods.${methodKey(weightMethod)}.name`)
          : '',
    analysis ? message(`methods.${methodKey(analysis.methodId)}.name`) : '',
  ].filter(Boolean);

  return (
    <div className="flex flex-col gap-6">
      {plan?.kind === 'problems' ? (
        <DatasetProblems dataset={dataset} problems={plan.problems} />
      ) : run.status === 'failed' && run.outcome.kind === 'validation' ? (
        <ValidationProblems validation={run.outcome.validation} />
      ) : run.status === 'failed' && run.outcome.kind === 'error' ? (
        <p role="alert" className="text-sm text-danger">
          {t('failed', { message: run.outcome.message })}
        </p>
      ) : analysis ? (
        <div
          className="flex flex-col gap-6"
          aria-busy={run.status === 'running'}
          data-testid="analysis-view"
          data-method={analysis.methodId}
        >
          <Winner analysis={analysis} />
          <p className="text-xs text-muted-foreground">
            {t('result.basis', { methods: summary.join(' · ') })}{' '}
            <Link to="/weights" className="font-medium text-primary hover:underline">
              {t('result.changeWeights')}
            </Link>
          </p>
          <div className="grid gap-3 sm:grid-cols-3">
            <ActionCard
              icon={<Play aria-hidden />}
              title={t('result.explain.title')}
              hint={t('result.explain.hint')}
              active={panel === 'explain'}
              onClick={() => toggle('explain')}
              testId="view-explain"
            />
            <ActionCard
              icon={<SlidersHorizontal aria-hidden />}
              title={t('result.sensitivity.title')}
              hint={t('result.sensitivity.hint')}
              active={panel === 'sensitivity'}
              onClick={() => toggle('sensitivity')}
              testId="open-sensitivity"
            />
            <div className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-4 text-sm">
              <span className="font-semibold">{t('result.export.title')}</span>
              <span className="text-muted-foreground">{t('result.export.hint')}</span>
              <div className="mt-auto">
                <AnalysisExportButton session={session} analysis={analysis} stale={false} />
              </div>
            </div>
          </div>
          {panel === 'explain' && <HowCalculated analysis={analysis} />}
          {panel === 'sensitivity' && (
            <div data-testid="sensitivity-analysis">
              <SensitivityPanel analysis={analysis} session={session} document={document} />
            </div>
          )}
          <Disclosure title={t('result.details')} testId="result-details">
            <div className="flex flex-col gap-8">
              <RankingSection analysis={analysis} />
            </div>
          </Disclosure>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground" aria-live="polite">
          {t('calculating')}
        </p>
      )}

      <StepFooter back={{ to: '/weights', label: t('nav:steps.weights') }} />
      <p className="-mt-2 text-right text-xs">
        <Link
          to="/result/history"
          className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
        >
          <History className="size-3.5" aria-hidden />
          {t('nav:items.history.title')}
        </Link>
      </p>
    </div>
  );
}

export function ResultStep() {
  const { t } = useTranslation('nav');
  return (
    <FlowPage title={t('items.result.title')} description={t('items.result.description')}>
      {(context) => <Result {...context} />}
    </FlowPage>
  );
}

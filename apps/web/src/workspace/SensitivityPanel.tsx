import { WEIGHT_REDISTRIBUTIONS, setWeight, type WeightRedistribution } from '@mateo/engine';
import {
  randomId,
  type ProjectDocument,
  type ProjectSession,
  type StoredAnalysis,
} from '@mateo/project';
import { Badge, Button } from '@mateo/ui';
import { RotateCcw, Save, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useTextRef } from '../editor/messages';
import { fieldClass, labelClass } from '../editor/ui';
import { useFormatters, useReducedMotion } from '../hooks/preferences';
import { EChart } from './charts/EChart';
import { rankLineOption } from './charts/options';
import { runResultJob } from './runner';
import {
  baseOfAnalysis,
  makeScenario,
  rankWithWeights,
  readScenarios,
  scenarioWeights,
  scenariosKey,
  scenariosValue,
  sweepCriterion,
  type Ranking,
  type SavedScenario,
  type SweepPoint,
} from './sensitivity';

const ROW_HEIGHT = 44;
const LIVE_DELAY_MS = 60;

function storedRanking(
  analysis: StoredAnalysis,
  alternativeIds: readonly string[],
): Ranking | null {
  const list = (
    analysis.record.result as { ranking?: { alternativeId: string; rank: number; score: number }[] }
  ).ranking;
  if (!Array.isArray(list)) return null;
  const byId = new Map(list.map((entry) => [entry.alternativeId, entry]));
  const entries = alternativeIds.map((id) => byId.get(id));
  if (entries.some((entry) => !entry)) return null;
  return { ranks: entries.map((e) => e!.rank), scores: entries.map((e) => e!.score) };
}

/**
 * Weight sliders with live re-ranking, a one-at-a-time sweep and named scenarios of one
 * MARCOS analysis. Every ranking shown comes from an engine run; this component only moves
 * the weights (with the engine's `setWeight`) and draws what comes back.
 */
export function SensitivityPanel({
  analysis,
  session,
  document,
}: {
  analysis: StoredAnalysis;
  session: ProjectSession;
  document: ProjectDocument;
}) {
  const built = useMemo(() => baseOfAnalysis(analysis), [analysis]);
  const { t } = useTranslation('workspace');
  if (!built.ok) {
    return (
      <p className="max-w-2xl text-sm text-muted-foreground" data-testid="sensitivity-unsupported">
        {t(`sensitivity.unsupported.${built.reason}`)}
      </p>
    );
  }
  return (
    <PanelBody
      key={analysis.id}
      analysis={analysis}
      base={built.base}
      session={session}
      document={document}
    />
  );
}

type Base = Extract<ReturnType<typeof baseOfAnalysis>, { ok: true }>['base'];

function PanelBody({
  analysis,
  base,
  session,
  document,
}: {
  analysis: StoredAnalysis;
  base: Base;
  session: ProjectSession;
  document: ProjectDocument;
}) {
  const { t } = useTranslation('workspace');
  const text = useTextRef();
  const formatters = useFormatters();
  const reduced = useReducedMotion();

  const [weights, setWeights] = useState<readonly number[]>(base.weights);
  const [redistribution, setRedistribution] = useState<WeightRedistribution>('proportional');
  const [ranking, setRanking] = useState<Ranking | null>(() =>
    storedRanking(analysis, base.alternativeIds),
  );
  const [failed, setFailed] = useState(false);
  const baseline = useMemo(() => storedRanking(analysis, base.alternativeIds), [analysis, base]);

  const criterionNames = base.criterionNames.map(text);
  const alternativeNames = base.alternativeNames.map(text);
  const percent = (value: number) => formatters.percent(value, 0);

  // Live re-ranking. The latest weights win; an older run that finishes late is dropped.
  const touched = useRef(false);
  useEffect(() => {
    if (!touched.current) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      void rankWithWeights(base, weights, runResultJob).then((next) => {
        if (cancelled) return;
        setFailed(next === null);
        if (next) setRanking(next);
      });
    }, LIVE_DELAY_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [base, weights]);

  const move = (index: number, value: number) => {
    touched.current = true;
    setWeights((current) => setWeight(current, index, value, redistribution));
  };

  const reset = () => {
    touched.current = false;
    setWeights(base.weights);
    setRanking(baseline);
    setFailed(false);
  };

  // --- One-at-a-time sweep -------------------------------------------------------------
  const [sweepIndex, setSweepIndex] = useState(0);
  const [sweep, setSweep] = useState<SweepPoint[] | null>(null);
  // The sweep is many engine runs, so it starts when asked and then follows the choices.
  const [sweepWanted, setSweepWanted] = useState(false);
  useEffect(() => {
    if (!sweepWanted) return;
    let cancelled = false;
    setSweep(null);
    void sweepCriterion({
      base,
      criterionIndex: sweepIndex,
      redistribution,
      run: runResultJob,
      isCancelled: () => cancelled,
    }).then((points) => {
      if (!cancelled) setSweep(points);
    });
    return () => {
      cancelled = true;
    };
  }, [base, sweepIndex, redistribution, sweepWanted]);

  const buildSweepOption = useCallback(
    (theme: Parameters<typeof rankLineOption>[0]['theme']) =>
      rankLineOption({
        theme,
        weights: (sweep ?? []).map((point) => point.weight),
        series: alternativeNames.map((name, a) => ({
          name,
          values: (sweep ?? []).map((point) => point.ranking?.ranks[a] ?? null),
        })),
        format: (value) => formatters.percent(value, 0),
        axisName: t('sensitivity.sweep.axis', { name: criterionNames[sweepIndex] ?? '' }),
        rankName: t('sensitivity.sweep.rank'),
      }),
    [sweep, sweepIndex, t, formatters.numberLocale, alternativeNames.join('\u0000')],
  );

  // --- Scenarios -----------------------------------------------------------------------
  const scenarios = readScenarios(document.settings, analysis.datasetId);
  const [name, setName] = useState('');
  const writeScenarios = (next: readonly SavedScenario[]) =>
    session.setSetting(scenariosKey(analysis.datasetId), scenariosValue(next));

  const save = () => {
    const title = name.trim();
    if (title === '' || !ranking) return;
    writeScenarios([
      ...scenarios,
      makeScenario({
        id: randomId(),
        name: title,
        createdAt: new Date().toISOString(),
        base,
        weights,
        ranking,
        redistribution,
      }),
    ]);
    setName('');
  };

  const load = (scenario: SavedScenario) => {
    const loaded = scenarioWeights(base, scenario);
    if (!loaded) return;
    touched.current = true;
    setRedistribution(scenario.redistribution);
    setWeights(loaded);
  };

  // --- Live ranking, in order, with animated reordering -------------------------------------
  const order = ranking
    ? base.alternativeIds
        .map((id, index) => ({ id, index, rank: ranking.ranks[index] as number }))
        .sort((a, b) => a.rank - b.rank || a.index - b.index)
    : [];
  const position = new Map(order.map((item, i) => [item.id, i]));

  return (
    <div className="space-y-8" data-testid="sensitivity-panel">
      <p className="max-w-2xl text-sm text-muted-foreground">{t('sensitivity.hint')}</p>

      <div className="grid gap-8 lg:grid-cols-2">
        <section className="space-y-4" aria-labelledby="s-weights">
          <h3 id="s-weights" className="text-base font-semibold">
            {t('sensitivity.weights.title')}
          </h3>
          <fieldset className="space-y-1">
            <legend className={labelClass}>{t('sensitivity.redistribution.label')}</legend>
            <div className="flex flex-wrap gap-4 text-sm">
              {WEIGHT_REDISTRIBUTIONS.map((kind) => (
                <label key={kind} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="redistribution"
                    checked={redistribution === kind}
                    onChange={() => setRedistribution(kind)}
                  />
                  {t(`sensitivity.redistribution.${kind}`)}
                </label>
              ))}
            </div>
          </fieldset>
          <ul className="space-y-3">
            {weights.map((weight, index) => (
              <li key={base.criterionIds[index]} className="space-y-1">
                <label className="flex items-center justify-between gap-3 text-sm">
                  <span className="font-medium">{criterionNames[index]}</span>
                  <span className="tabular-nums text-muted-foreground">
                    {formatters.value(weight)}
                  </span>
                </label>
                <input
                  type="range"
                  className="w-full"
                  min={0}
                  max={1}
                  step={0.01}
                  value={weight}
                  aria-label={t('sensitivity.weights.slider', {
                    name: criterionNames[index] ?? '',
                  })}
                  onChange={(event) => move(index, Number(event.target.value))}
                  data-testid={`weight-slider-${index}`}
                />
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <span data-testid="weights-sum">
              {t('marcos.weights.sum', {
                sum: formatters.value(weights.reduce((a, c) => a + c, 0)),
              })}
            </span>
            <Button variant="outline" size="sm" onClick={reset}>
              <RotateCcw aria-hidden />
              {t('sensitivity.weights.reset')}
            </Button>
          </div>
        </section>

        <section className="space-y-3" aria-labelledby="s-ranking">
          <h3 id="s-ranking" className="text-base font-semibold">
            {t('sensitivity.ranking.title')}
          </h3>
          {failed && (
            <p role="alert" className="text-sm text-danger">
              {t('sensitivity.ranking.failed')}
            </p>
          )}
          <ol
            className="relative"
            style={{ height: order.length * ROW_HEIGHT }}
            data-testid="live-ranking"
          >
            {order.map((item) => {
              const index = item.index;
              const change = baseline ? (baseline.ranks[index] as number) - item.rank : 0;
              return (
                <li
                  key={item.id}
                  data-alternative={item.id}
                  className={`absolute inset-x-0 flex items-center gap-3 rounded-md border border-border bg-surface px-3 text-sm ${reduced ? '' : 'transition-transform duration-300 ease-out'}`}
                  style={{
                    height: ROW_HEIGHT - 6,
                    transform: `translateY(${(position.get(item.id) ?? 0) * ROW_HEIGHT}px)`,
                  }}
                >
                  <span className="w-6 text-right font-semibold tabular-nums">{item.rank}</span>
                  <span className="flex-1 truncate">{alternativeNames[index]}</span>
                  <span className="tabular-nums text-muted-foreground">
                    {formatters.value(ranking!.scores[index] as number)}
                  </span>
                  {change !== 0 && (
                    <Badge variant={change > 0 ? 'accent' : 'outline'}>
                      {change > 0 ? `▲ ${change}` : `▼ ${-change}`}
                    </Badge>
                  )}
                </li>
              );
            })}
          </ol>
        </section>
      </div>

      <section className="space-y-3" aria-labelledby="s-sweep">
        <h3 id="s-sweep" className="text-base font-semibold">
          {t('sensitivity.sweep.title')}
        </h3>
        <p className="max-w-2xl text-sm text-muted-foreground">{t('sensitivity.sweep.hint')}</p>
        <label className="block max-w-xs space-y-1">
          <span className={labelClass}>{t('sensitivity.sweep.criterion')}</span>
          <select
            className={fieldClass}
            value={sweepIndex}
            onChange={(event) => setSweepIndex(Number(event.target.value))}
            data-testid="sweep-criterion"
          >
            {criterionNames.map((item, index) => (
              <option key={base.criterionIds[index]} value={index}>
                {item}
              </option>
            ))}
          </select>
        </label>
        {!sweepWanted ? (
          <Button variant="outline" onClick={() => setSweepWanted(true)} data-testid="sweep-run">
            {t('sensitivity.sweep.run')}
          </Button>
        ) : sweep === null ? (
          <p className="text-sm text-muted-foreground">{t('running')}</p>
        ) : (
          <EChart
            label={t('sensitivity.sweep.chart', { name: criterionNames[sweepIndex] ?? '' })}
            buildOption={buildSweepOption}
            height={320}
          />
        )}
      </section>

      <section className="space-y-3" aria-labelledby="s-scenarios">
        <h3 id="s-scenarios" className="text-base font-semibold">
          {t('sensitivity.scenarios.title')}
        </h3>
        <div className="flex flex-wrap items-end gap-3">
          <label className="space-y-1">
            <span className={labelClass}>{t('sensitivity.scenarios.name')}</span>
            <input
              className={fieldClass}
              value={name}
              onChange={(event) => setName(event.target.value)}
              onKeyDown={(event) => event.key === 'Enter' && save()}
              data-testid="scenario-name"
            />
          </label>
          <Button
            onClick={save}
            disabled={name.trim() === '' || !ranking || failed}
            data-testid="scenario-save"
          >
            <Save aria-hidden />
            {t('sensitivity.scenarios.save')}
          </Button>
        </div>
        {scenarios.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('sensitivity.scenarios.empty')}</p>
        ) : (
          <ul className="space-y-2" data-testid="scenario-list">
            {scenarios.map((scenario) => {
              const best = base.alternativeIds
                .map((id, index) => ({ index, rank: scenario.ranking[id]?.rank ?? Infinity }))
                .sort((a, b) => a.rank - b.rank)[0];
              return (
                <li
                  key={scenario.id}
                  className="flex flex-wrap items-center gap-3 rounded-md border border-border bg-surface px-3 py-2 text-sm"
                >
                  <span className="font-medium">{scenario.name}</span>
                  <span className="text-muted-foreground">
                    {base.criterionIds
                      .map(
                        (id, index) =>
                          `${criterionNames[index]}: ${percent(scenario.weights[id] ?? 0)}`,
                      )
                      .join(' · ')}
                  </span>
                  {best && (
                    <Badge variant="accent">
                      {t('sensitivity.scenarios.best', {
                        name: alternativeNames[best.index] ?? '',
                      })}
                    </Badge>
                  )}
                  <span className="ml-auto flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => load(scenario)}>
                      {t('sensitivity.scenarios.load')}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      aria-label={t('sensitivity.scenarios.delete', { name: scenario.name })}
                      onClick={() =>
                        writeScenarios(scenarios.filter((item) => item.id !== scenario.id))
                      }
                    >
                      <Trash2 aria-hidden />
                    </Button>
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

import { crispWeights, type WeightVector } from '@mateo/engine';
import type { AnalysisSummary, Dataset, StoredAnalysis } from '@mateo/project';
import { Badge, Button } from '@mateo/ui';
import { Play } from 'lucide-react';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useSearchParams } from 'react-router';
import { cellDisplayText } from '../editor/cellText';
import { useMessage } from '../editor/messages';
import { syntaxForLocale } from '../editor/numbers';
import { fieldClass, labelClass } from '../editor/ui';
import { useFormatters } from '../hooks/preferences';
import { AnalysisView, methodKey } from './AnalysisView';
import { isCurrent, kindOfMethod, type WeightSource } from './analyses';
import {
  buildCrispMatrix,
  buildTfnMatrix,
  type DatasetProblem,
  type FuzzyModel,
} from './engineInput';
import { ParameterFields } from './ParameterFields';
import { DatasetProblems, ValidationProblems } from './Problems';
import { workspaceRegistry } from './registry';
import { runAndStore } from './runWorkflow';
import type { ParameterValues, RunOutcome } from './runnerCore';
import { parseNumber } from './WeightingPage';
import { WorkspaceGate, type WorkspaceContext } from './WorkspaceGate';

function Step({
  id,
  index,
  title,
  children,
}: {
  id: string;
  index: number;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3" aria-labelledby={id}>
      <h2 id={id} className="flex items-center gap-2 text-base font-semibold">
        <span className="flex size-6 items-center justify-center rounded-full bg-accent text-xs text-accent-foreground">
          {index}
        </span>
        {title}
      </h2>
      {children}
    </section>
  );
}

const cellClass = 'border-b border-border px-3 py-1.5 whitespace-nowrap';

function InputData({
  dataset,
  scales,
}: {
  dataset: Dataset;
  scales: WorkspaceContext['document']['model']['scales'];
}) {
  const { t } = useTranslation('workspace');
  const formatters = useFormatters();
  const syntax = useMemo(() => syntaxForLocale(formatters.numberLocale), [formatters.numberLocale]);
  const matrix = dataset.matrices[0];
  if (!matrix || dataset.alternatives.length === 0 || dataset.criteria.length === 0) {
    return <p className="text-sm text-muted-foreground">{t('marcos.input.empty')}</p>;
  }
  return (
    <div className="max-h-80 overflow-auto rounded-lg border border-border bg-surface">
      <table className="min-w-full border-collapse text-sm" data-testid="input-matrix">
        <caption className="sr-only">{t('marcos.input.caption')}</caption>
        <thead>
          <tr>
            <td className={cellClass} />
            {dataset.criteria.map((criterion) => (
              <th key={criterion.id} scope="col" className={`${cellClass} text-right font-medium`}>
                {criterion.name || criterion.code}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {dataset.alternatives.map((alternative) => (
            <tr key={alternative.id}>
              <th scope="row" className={`${cellClass} text-left font-medium`}>
                {alternative.name || alternative.code}
              </th>
              {dataset.criteria.map((criterion) => (
                <td key={criterion.id} className={`${cellClass} text-right tabular-nums`}>
                  {cellDisplayText(
                    matrix.cells[alternative.id]?.[criterion.id],
                    scales.find((scale) => scale.id === criterion.scaleId),
                    formatters.numberLocale,
                    syntax,
                  ) || '–'}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MarcosWorkspace({ session, document, dataset }: WorkspaceContext) {
  const { t } = useTranslation('workspace');
  const message = useMessage();
  const formatters = useFormatters();
  const [search] = useSearchParams();
  const requested = search.get('weights');

  const [fuzzyModel, setFuzzyModel] = useState<FuzzyModel>('classical');
  const [source, setSource] = useState<'manual' | 'analysis'>(requested ? 'analysis' : 'manual');
  const [manual, setManual] = useState<Record<string, string>>({});
  const [available, setAvailable] = useState<AnalysisSummary[]>([]);
  const [chosenId, setChosenId] = useState<string>(requested ?? '');
  const [chosen, setChosen] = useState<StoredAnalysis | null>(null);
  const [parameters, setParameters] = useState<Record<string, ParameterValues>>({});
  const [busy, setBusy] = useState(false);
  const [datasetProblems, setDatasetProblems] = useState<readonly DatasetProblem[]>([]);
  const [failure, setFailure] = useState<Extract<RunOutcome, { ok: false }> | null>(null);
  const [inputProblem, setInputProblem] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<StoredAnalysis | null>(null);

  const methodId = fuzzyModel === 'classical' ? 'marcos' : 'fuzzy-marcos';
  const method = workspaceRegistry().get(methodId);
  const values =
    parameters[methodId] ??
    Object.fromEntries(Object.entries(method.parameters).map(([n, d]) => [n, d.default]));

  // Weighting analyses of this decision problem that can be used as weights, newest first.
  useEffect(() => {
    let cancelled = false;
    void session.listAnalyses(dataset.id).then((list) => {
      if (cancelled) return;
      setAvailable(list.filter((item) => kindOfMethod(item.methodId) === 'weighting').reverse());
    });
    return () => {
      cancelled = true;
    };
  }, [session, dataset.id, analysis]);

  useEffect(() => {
    if (source !== 'analysis' || chosenId === '') {
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
  }, [session, source, chosenId]);

  const criterionName = (id: string) => {
    const criterion = dataset.criteria.find((item) => item.id === id);
    return criterion ? criterion.name || criterion.code : id;
  };

  const weightsOfChosen = (): WeightVector | null => {
    const result = chosen?.record.result as { weights?: WeightVector } | undefined;
    return result?.weights ?? null;
  };

  const run = async () => {
    setFailure(null);
    setInputProblem(null);
    setDatasetProblems([]);

    let weights: WeightVector | null;
    let weightSource: WeightSource;
    if (source === 'manual') {
      const parsed = dataset.criteria.map((criterion) => parseNumber(manual[criterion.id] ?? ''));
      if (parsed.some((value) => value === null)) {
        setInputProblem(t('marcos.weights.incomplete'));
        return;
      }
      weights = crispWeights(
        dataset.criteria.map((criterion) => criterion.id),
        parsed as number[],
      );
      weightSource = { source: 'manual' };
    } else {
      weights = weightsOfChosen();
      if (!chosen || !weights) {
        setInputProblem(t('marcos.weights.noAnalysis'));
        return;
      }
      weightSource = { source: 'analysis', analysisId: chosen.id, methodId: chosen.methodId };
    }

    const matrixId = dataset.matrices[0]?.id ?? '';
    const built =
      fuzzyModel === 'classical'
        ? buildCrispMatrix(dataset, matrixId)
        : buildTfnMatrix(dataset, document.model.scales, matrixId);
    if (!built.ok) {
      setDatasetProblems(built.problems);
      return;
    }
    setBusy(true);
    try {
      const result = await runAndStore({
        session,
        datasetId: dataset.id,
        job: { methodId, input: { matrix: built.matrix, weights }, parameters: values },
        numberType: fuzzyModel === 'classical' ? 'crisp' : 'tfn',
        configuration: { workspace: 'ranking', matrixId, fuzzyModel, weights: weightSource },
      });
      if (result.ok) setAnalysis(result.analysis);
      else setFailure(result.outcome);
    } finally {
      setBusy(false);
    }
  };

  const manualSum = dataset.criteria.reduce(
    (sum, criterion) => sum + (parseNumber(manual[criterion.id] ?? '') ?? 0),
    0,
  );
  const chosenSummary = available.find((item) => item.id === chosenId);
  const chosenStale = chosenSummary ? !isCurrent(session, chosenSummary) : false;

  return (
    <div className="space-y-10">
      <Step id="m-overview" index={1} title={t('marcos.overview.title')}>
        <p className="max-w-2xl text-sm text-muted-foreground">
          {t('marcos.overview.text', {
            name: dataset.name,
            alternatives: dataset.alternatives.length,
            criteria: dataset.criteria.length,
          })}{' '}
          <Link to="/matrix" className="font-medium text-primary underline">
            {t('weighting.openMatrix')}
          </Link>
        </p>
      </Step>

      <Step id="m-input" index={2} title={t('marcos.input.title')}>
        <InputData dataset={dataset} scales={document.model.scales} />
      </Step>

      <Step id="m-criteria" index={3} title={t('marcos.criteria.title')}>
        <p className="max-w-2xl text-sm text-muted-foreground">{t('marcos.criteria.hint')}</p>
        <div className="overflow-x-auto rounded-lg border border-border bg-surface">
          <table className="min-w-full border-collapse text-sm" data-testid="criteria-table">
            <thead>
              <tr>
                {(['code', 'name', 'direction', 'unit'] as const).map((column) => (
                  <th key={column} scope="col" className={`${cellClass} text-left font-medium`}>
                    {t(`marcos.criteria.${column}`)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {dataset.criteria.map((criterion) => (
                <tr key={criterion.id}>
                  <td className={cellClass}>{criterion.code}</td>
                  <td className={cellClass}>{criterion.name}</td>
                  <td className={cellClass}>
                    <Badge variant="outline">{t(`marcos.criteria.${criterion.direction}`)}</Badge>
                  </td>
                  <td className={cellClass}>{criterion.unit || '–'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Step>

      <Step id="m-weights" index={4} title={t('marcos.weights.title')}>
        <div role="radiogroup" aria-labelledby="m-weights" className="flex flex-wrap gap-4 text-sm">
          {(['manual', 'analysis'] as const).map((kind) => (
            <label key={kind} className="flex items-center gap-2">
              <input
                type="radio"
                name="weight-source"
                checked={source === kind}
                onChange={() => setSource(kind)}
              />
              {t(`marcos.weights.source.${kind}`)}
            </label>
          ))}
        </div>
        {source === 'manual' ? (
          <div className="space-y-2">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {dataset.criteria.map((criterion) => (
                <label key={criterion.id} className="space-y-1">
                  <span className={labelClass}>{criterion.name || criterion.code}</span>
                  <input
                    className={fieldClass}
                    inputMode="decimal"
                    value={manual[criterion.id] ?? ''}
                    onChange={(event) =>
                      setManual({ ...manual, [criterion.id]: event.target.value })
                    }
                  />
                </label>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              <span>{t('marcos.weights.sum', { sum: formatters.value(manualSum) })}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setManual(
                    Object.fromEntries(
                      dataset.criteria.map((criterion) => [
                        criterion.id,
                        String(1 / dataset.criteria.length),
                      ]),
                    ),
                  )
                }
              >
                {t('marcos.weights.equal')}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {available.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {t('marcos.weights.noneAvailable')}{' '}
                <Link to="/methods/weighting" className="font-medium text-primary underline">
                  {t('marcos.weights.toWeighting')}
                </Link>
              </p>
            ) : (
              <label className="block max-w-md space-y-1">
                <span className={labelClass}>{t('marcos.weights.analysis')}</span>
                <select
                  className={fieldClass}
                  value={chosenId}
                  onChange={(event) => setChosenId(event.target.value)}
                  data-testid="weights-analysis"
                >
                  <option value="">{t('marcos.weights.choose')}</option>
                  {available.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name || message(`methods.${methodKey(item.methodId)}.name`)} ·{' '}
                      {formatters.date(new Date(item.createdAt), 'medium', true)}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {chosenStale && <p className="text-sm text-warning">{t('marcos.weights.stale')}</p>}
            {chosen && weightsOfChosen() && (
              <ul className="flex flex-wrap gap-2 text-sm" data-testid="chosen-weights">
                {weightsOfChosen()!.entries.map((entry) => (
                  <li key={entry.criterionId}>
                    <Badge variant="accent">
                      {criterionName(entry.criterionId)}: {formatters.value(entry.value)}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </Step>

      <Step id="m-model" index={5} title={t('marcos.model.title')}>
        <div role="radiogroup" aria-labelledby="m-model" className="grid gap-3 sm:grid-cols-2">
          {(['classical', 'tfn'] as const).map((model) => (
            <label
              key={model}
              className={`cursor-pointer rounded-lg border p-3 text-sm ${model === fuzzyModel ? 'border-primary bg-accent' : 'border-border bg-surface'}`}
            >
              <input
                type="radio"
                name="fuzzy-model"
                className="sr-only"
                checked={model === fuzzyModel}
                onChange={() => {
                  setFuzzyModel(model);
                  setAnalysis(null);
                  setFailure(null);
                  setDatasetProblems([]);
                }}
              />
              <span className="block font-medium">{t(`marcos.model.${model}.title`)}</span>
              <span className="mt-1 block text-xs text-muted-foreground">
                {t(`marcos.model.${model}.hint`)}
              </span>
            </label>
          ))}
        </div>
      </Step>

      <Step id="m-calc" index={6} title={t('marcos.calculation.title')}>
        <ParameterFields
          schema={method.parameters}
          values={values}
          onChange={(next) => setParameters({ ...parameters, [methodId]: next })}
        />
        <Button onClick={() => void run()} disabled={busy} data-testid="run-marcos">
          <Play aria-hidden />
          {busy ? t('running') : t('run')}
        </Button>
        {inputProblem && (
          <p role="alert" className="text-sm text-danger">
            {inputProblem}
          </p>
        )}
        {datasetProblems.length > 0 && (
          <DatasetProblems dataset={dataset} problems={datasetProblems} />
        )}
        {failure?.kind === 'validation' && <ValidationProblems validation={failure.validation} />}
        {failure?.kind === 'error' && (
          <p role="alert" className="text-sm text-danger">
            {t('runFailed', { message: failure.message })}
          </p>
        )}
      </Step>

      {analysis && (
        <Step id="m-results" index={7} title={t('marcos.results.title')}>
          <AnalysisView
            analysis={analysis}
            stale={!isCurrent(session, analysis)}
            actions={
              <Button asChild variant="outline">
                <Link to={`/analysis/results?analysis=${encodeURIComponent(analysis.id)}`}>
                  {t('marcos.results.open')}
                </Link>
              </Button>
            }
          />
        </Step>
      )}
    </div>
  );
}

export function MarcosPage() {
  const { t } = useTranslation('nav');
  return (
    <WorkspaceGate title={t('items.marcos.title')} description={t('items.marcos.description')}>
      {(context) => <MarcosWorkspace {...context} />}
    </WorkspaceGate>
  );
}

import { textLiteral } from '@mateo/engine';
import { IMF_SWARA_SCALE } from '@mateo/fuzzy';
import type { StoredAnalysis } from '@mateo/project';
import { Button } from '@mateo/ui';
import { ArrowDown, ArrowUp, ArrowRight, Play } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { useMessage, useTextRef } from '../editor/messages';
import { presetFor } from '../library/preset';
import { fieldClass, labelClass, toolbarButtonClass } from '../editor/ui';
import { AnalysisView, methodKey } from './AnalysisView';
import { isCurrent } from './analyses';
import { buildCrispMatrix, type DatasetProblem } from './engineInput';
import { ParameterFields } from './ParameterFields';
import { DatasetProblems, ValidationProblems } from './Problems';
import {
  WEIGHTING_METHOD_IDS,
  isWeightingMethod,
  workspaceRegistry,
  type WeightingMethodId,
} from './registry';
import { runAndStore } from './runWorkflow';
import type { ParameterValues, RunOutcome } from './runnerCore';
import { WorkspaceGate, type WorkspaceContext } from './WorkspaceGate';

/** Accepts `0.25` and `0,25`. */
export function parseNumber(text: string): number | null {
  const trimmed = text.trim().replace(',', '.');
  if (trimmed === '') return null;
  const value = Number(trimmed);
  return Number.isFinite(value) ? value : null;
}

const DEFAULT_PARAMETERS: Record<string, ParameterValues> = {};
function defaultsOf(methodId: string): ParameterValues {
  return (DEFAULT_PARAMETERS[methodId] ??= Object.fromEntries(
    Object.entries(workspaceRegistry().get(methodId).parameters).map(([name, definition]) => [
      name,
      definition.default,
    ]),
  ));
}

function WeightingWorkspace({ session, dataset }: WorkspaceContext) {
  const { t } = useTranslation('workspace');
  const message = useMessage();
  const textOf = useTextRef();
  const navigate = useNavigate();

  // Opened from a Method Library sample: its method and the assessments of the paper.
  const [search] = useSearchParams();
  const preset = presetFor(search, dataset);
  const byCriterion = <T,>(values: readonly (T | null)[] | undefined, show: (value: T) => string) =>
    Object.fromEntries(
      dataset.criteria.flatMap((criterion, index) => {
        const value = values?.[index];
        return value === null || value === undefined ? [] : [[criterion.id, show(value)]];
      }),
    );

  const [methodId, setMethodId] = useState<WeightingMethodId>(
    preset && isWeightingMethod(preset.methodId) ? preset.methodId : 'critic',
  );
  const [order, setOrder] = useState<string[]>(() => dataset.criteria.map((c) => c.id));
  const [importance, setImportance] = useState<Record<string, string>>(() =>
    byCriterion(preset?.importance, String),
  );
  const [terms, setTerms] = useState<Record<string, string>>(() =>
    byCriterion(preset?.terms, (term) => term),
  );
  const [parameters, setParameters] = useState<Record<string, ParameterValues>>({});
  const [busy, setBusy] = useState(false);
  const [datasetProblems, setDatasetProblems] = useState<readonly DatasetProblem[]>([]);
  const [failure, setFailure] = useState<Extract<RunOutcome, { ok: false }> | null>(null);
  const [inputProblem, setInputProblem] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<StoredAnalysis | null>(null);

  const method = workspaceRegistry().get(methodId);
  const values = parameters[methodId] ?? defaultsOf(methodId);
  const criterionName = (id: string) => {
    const criterion = dataset.criteria.find((item) => item.id === id);
    return criterion ? criterion.name || criterion.code : id;
  };
  const ordered = methodId === 'swara' || methodId === 'fuzzy-swara';
  const matrixId = dataset.matrices[0]?.id ?? '';

  const move = (index: number, by: -1 | 1) =>
    setOrder((current) => {
      const next = [...current];
      const target = index + by;
      if (target < 0 || target >= next.length) return current;
      [next[index], next[target]] = [next[target]!, next[index]!];
      return next;
    });

  const run = async () => {
    setFailure(null);
    setInputProblem(null);
    setDatasetProblems([]);
    let input: unknown;
    if (ordered) {
      if (dataset.criteria.length < 2) {
        setDatasetProblems([{ code: 'too-small' }]);
        return;
      }
      const criteria = order.map((id) => ({ id, name: textLiteral(criterionName(id)) }));
      if (methodId === 'swara') {
        const parsed = order.map((id, index) =>
          index === 0 ? null : parseNumber(importance[id] ?? ''),
        );
        if (parsed.some((value, index) => index > 0 && value === null)) {
          setInputProblem(t('weighting.swara.incomplete'));
          return;
        }
        input = { criteria, comparativeImportance: parsed };
      } else {
        const assessments = order.map((id, index) => (index === 0 ? null : terms[id] || null));
        if (assessments.some((value, index) => index > 0 && value === null)) {
          setInputProblem(t('weighting.fuzzySwara.incomplete'));
          return;
        }
        input = { criteria, assessments };
      }
    } else {
      const built = buildCrispMatrix(dataset, matrixId);
      if (!built.ok) {
        setDatasetProblems(built.problems);
        return;
      }
      input = { matrix: built.matrix };
    }
    setBusy(true);
    try {
      const result = await runAndStore({
        session,
        datasetId: dataset.id,
        job: { methodId, input, parameters: values },
        numberType: methodId === 'fuzzy-swara' ? 'tfn' : 'crisp',
        configuration: {
          workspace: 'weighting',
          matrixId,
          fuzzyModel: methodId === 'fuzzy-swara' ? 'tfn' : 'classical',
        },
      });
      if (result.ok) setAnalysis(result.analysis);
      else setFailure(result.outcome);
    } finally {
      setBusy(false);
    }
  };

  const hasParameters = Object.keys(method.parameters).length > 0;
  const summaryCurrent = analysis ? isCurrent(session, analysis) : true;
  const resultView = useMemo(
    () =>
      analysis && (
        <AnalysisView
          analysis={analysis}
          stale={!summaryCurrent}
          actions={
            <Button
              onClick={() =>
                void navigate(`/analysis/marcos?weights=${encodeURIComponent(analysis.id)}`)
              }
              data-testid="use-in-marcos"
            >
              <ArrowRight aria-hidden />
              {t('weighting.useInMarcos')}
            </Button>
          }
        />
      ),
    [analysis, summaryCurrent, navigate, t],
  );

  return (
    <div className="space-y-8">
      <section className="space-y-3" aria-labelledby="w-method">
        <h2 id="w-method" className="text-base font-semibold">
          {t('weighting.method')}
        </h2>
        <div
          role="radiogroup"
          aria-labelledby="w-method"
          className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
        >
          {WEIGHTING_METHOD_IDS.map((id) => (
            <label
              key={id}
              className={`cursor-pointer rounded-lg border p-3 text-sm ${id === methodId ? 'border-primary bg-accent' : 'border-border bg-surface'}`}
            >
              <input
                type="radio"
                name="weighting-method"
                className="sr-only"
                checked={id === methodId}
                onChange={() => {
                  setMethodId(id);
                  setAnalysis(null);
                  setFailure(null);
                  setInputProblem(null);
                  setDatasetProblems([]);
                }}
              />
              <span className="block font-medium">{message(`methods.${methodKey(id)}.name`)}</span>
              <span className="mt-1 block text-xs text-muted-foreground">
                {t(`weighting.methodHint.${id === 'fuzzy-swara' ? 'fuzzySwara' : id}`)}
              </span>
            </label>
          ))}
        </div>
      </section>

      <section className="space-y-3" aria-labelledby="w-input">
        <h2 id="w-input" className="text-base font-semibold">
          {t('weighting.input')}
        </h2>
        {!ordered && (
          <p className="max-w-2xl text-sm text-muted-foreground">
            {t('weighting.matrixInput', {
              alternatives: dataset.alternatives.length,
              criteria: dataset.criteria.length,
            })}{' '}
            <Link to="/matrix" className="font-medium text-primary underline">
              {t('weighting.openMatrix')}
            </Link>
          </p>
        )}
        {ordered && (
          <div className="space-y-2">
            <p className="max-w-2xl text-sm text-muted-foreground">
              {t(methodId === 'swara' ? 'weighting.swara.hint' : 'weighting.fuzzySwara.hint')}
            </p>
            <ol className="space-y-2" data-testid="swara-order">
              {order.map((id, index) => (
                <li
                  key={id}
                  className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-surface p-2"
                >
                  <span className="w-6 text-right text-sm text-muted-foreground tabular-nums">
                    {index + 1}
                  </span>
                  <span className="min-w-32 flex-1 text-sm font-medium">{criterionName(id)}</span>
                  <button
                    type="button"
                    className={toolbarButtonClass}
                    disabled={index === 0}
                    onClick={() => move(index, -1)}
                    aria-label={t('weighting.moveUp', { name: criterionName(id) })}
                  >
                    <ArrowUp aria-hidden />
                  </button>
                  <button
                    type="button"
                    className={toolbarButtonClass}
                    disabled={index === order.length - 1}
                    onClick={() => move(index, 1)}
                    aria-label={t('weighting.moveDown', { name: criterionName(id) })}
                  >
                    <ArrowDown aria-hidden />
                  </button>
                  {index > 0 && methodId === 'swara' && (
                    <label className="flex items-center gap-2">
                      <span className={labelClass}>{t('weighting.swara.importance')}</span>
                      <input
                        className={`${fieldClass} w-24`}
                        inputMode="decimal"
                        aria-label={t('weighting.swara.importanceOf', { name: criterionName(id) })}
                        value={importance[id] ?? ''}
                        onChange={(event) =>
                          setImportance({ ...importance, [id]: event.target.value })
                        }
                      />
                    </label>
                  )}
                  {index > 0 && methodId === 'fuzzy-swara' && (
                    <label className="flex items-center gap-2">
                      <span className={labelClass}>{t('weighting.fuzzySwara.term')}</span>
                      <select
                        className={`${fieldClass} w-56`}
                        aria-label={t('weighting.fuzzySwara.termOf', { name: criterionName(id) })}
                        value={terms[id] ?? ''}
                        onChange={(event) => setTerms({ ...terms, [id]: event.target.value })}
                      >
                        <option value="">{t('weighting.fuzzySwara.choose')}</option>
                        {IMF_SWARA_SCALE.terms.map((term) => (
                          <option key={term.id} value={term.id}>
                            {textOf(term.label)} ({term.abbreviation})
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
                </li>
              ))}
            </ol>
          </div>
        )}
        {hasParameters && (
          <ParameterFields
            schema={method.parameters}
            values={values}
            onChange={(next) => setParameters({ ...parameters, [methodId]: next })}
          />
        )}
        <Button onClick={() => void run()} disabled={busy} data-testid="run-weighting">
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
      </section>

      {resultView}
    </div>
  );
}

export function WeightingPage() {
  const { t } = useTranslation('nav');
  return (
    <WorkspaceGate
      title={t('items.weighting.title')}
      description={t('items.weighting.description')}
    >
      {(context) => <WeightingWorkspace {...context} />}
    </WorkspaceGate>
  );
}

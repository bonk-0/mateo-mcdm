import { IMF_SWARA_SCALE } from '@mateo/fuzzy';
import type { Dataset } from '@mateo/project';
import { Button, cn } from '@mateo/ui';
import { ArrowDown, ArrowUp } from 'lucide-react';
import { useMemo, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useTextRef } from '../editor/messages';
import { fieldClass, toolbarButtonClass } from '../editor/ui';
import { useFormatters } from '../hooks/preferences';
import { DatasetProblems, ValidationProblems } from '../workspace/Problems';
import { FlowPage, StepFooter, type FlowContext } from './FlowPage';
import { Bars, Disclosure, HowCalculated } from './parts';
import { parseNumber, planWeights, weightShares, weightsOf, type AnyWeights } from './plan';
import { useWeightChoice, type DataMethod, type WeightChoice, type WeightMode } from './state';
import { shownAnalysis, useStoredRun } from './storedRun';
import { useSamplePreset } from './sample';

function criterionName(dataset: Dataset, id: string): string {
  const criterion = dataset.criteria.find((item) => item.id === id);
  return criterion ? criterion.name || criterion.code : id;
}

function Choice({
  mode,
  current,
  onChoose,
  title,
  hint,
  badge,
}: {
  mode: WeightMode;
  current: WeightMode;
  onChoose: (mode: WeightMode) => void;
  title: string;
  hint: string;
  badge?: string;
}) {
  const checked = mode === current;
  return (
    <label
      className={cn(
        'flex cursor-pointer flex-col gap-1 rounded-lg border p-4 text-sm transition-colors',
        checked
          ? 'border-primary bg-surface ring-1 ring-primary'
          : 'border-border bg-surface hover:bg-muted',
      )}
    >
      <input
        type="radio"
        name="weight-mode"
        className="sr-only"
        checked={checked}
        onChange={() => onChoose(mode)}
        data-testid={`weight-mode-${mode}`}
      />
      {badge && (
        <span className="self-start rounded-full bg-success/15 px-2 py-0.5 text-xs font-medium text-success">
          {badge}
        </span>
      )}
      <span className="font-semibold">{title}</span>
      <span className="text-muted-foreground">{hint}</span>
    </label>
  );
}

/** Two or three options side by side, one of them on. */
function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-md bg-muted p-0.5">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={option.value === value}
          onClick={() => onChange(option.value)}
          className={cn(
            'rounded-[5px] px-3 py-1 text-sm font-medium transition-colors',
            option.value === value
              ? 'bg-surface text-foreground shadow-xs'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function OrderInput({
  dataset,
  choice,
  update,
}: {
  dataset: Dataset;
  choice: WeightChoice;
  update: (patch: Partial<WeightChoice>) => void;
}) {
  const { t } = useTranslation('flow');
  const textOf = useTextRef();
  const move = (index: number, by: -1 | 1) => {
    const next = [...choice.order];
    const target = index + by;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target]!, next[index]!];
    update({ order: next });
  };
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-2xl text-sm text-muted-foreground">
          {t(choice.linguistic ? 'weights.order.hintTerms' : 'weights.order.hint')}
        </p>
        <Segmented
          label={t('weights.order.answerWith')}
          value={choice.linguistic ? 'terms' : 'numbers'}
          options={[
            { value: 'numbers', label: t('weights.order.numbers') },
            { value: 'terms', label: t('weights.order.terms') },
          ]}
          onChange={(value) => update({ linguistic: value === 'terms' })}
        />
      </div>
      <ol className="flex flex-col gap-2" data-testid="swara-order">
        {choice.order.map((id, index) => {
          const name = criterionName(dataset, id);
          return (
            <li
              key={id}
              className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-surface p-2"
            >
              <span className="w-6 text-right text-sm text-muted-foreground tabular-nums">
                {index + 1}
              </span>
              <span className="min-w-32 flex-1 text-sm font-medium">{name}</span>
              {index > 0 && !choice.linguistic && (
                <label className="flex items-center gap-2 text-sm text-muted-foreground">
                  {t('weights.order.lessThanPrevious')}
                  <input
                    className={`${fieldClass} w-20!`}
                    inputMode="decimal"
                    placeholder="0,20"
                    aria-label={t('weights.order.importanceOf', { name })}
                    value={choice.importance[id] ?? ''}
                    onChange={(event) =>
                      update({ importance: { ...choice.importance, [id]: event.target.value } })
                    }
                  />
                </label>
              )}
              {index > 0 && choice.linguistic && (
                <select
                  className={`${fieldClass} w-56!`}
                  aria-label={t('weights.order.termOf', { name })}
                  value={choice.terms[id] ?? ''}
                  onChange={(event) =>
                    update({ terms: { ...choice.terms, [id]: event.target.value } })
                  }
                >
                  <option value="">{t('weights.order.chooseTerm')}</option>
                  {IMF_SWARA_SCALE.terms.map((term) => (
                    <option key={term.id} value={term.id}>
                      {textOf(term.label)}
                    </option>
                  ))}
                </select>
              )}
              <span className="flex gap-1">
                <button
                  type="button"
                  className={toolbarButtonClass}
                  disabled={index === 0}
                  onClick={() => move(index, -1)}
                  aria-label={t('weights.order.moveUp', { name })}
                >
                  <ArrowUp aria-hidden />
                </button>
                <button
                  type="button"
                  className={toolbarButtonClass}
                  disabled={index === choice.order.length - 1}
                  onClick={() => move(index, 1)}
                  aria-label={t('weights.order.moveDown', { name })}
                >
                  <ArrowDown aria-hidden />
                </button>
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function ManualInput({
  dataset,
  choice,
  update,
}: {
  dataset: Dataset;
  choice: WeightChoice;
  update: (patch: Partial<WeightChoice>) => void;
}) {
  const { t } = useTranslation('flow');
  const formatters = useFormatters();
  const sum = dataset.criteria.reduce(
    (total, criterion) => total + (parseNumber(choice.manual[criterion.id] ?? '') ?? 0),
    0,
  );
  return (
    <div className="flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {dataset.criteria.map((criterion) => (
          <label key={criterion.id} className="flex items-center gap-3 text-sm">
            <span className="min-w-0 flex-1 truncate">{criterion.name || criterion.code}</span>
            <input
              className={`${fieldClass} w-24!`}
              inputMode="decimal"
              aria-label={t('weights.manual.weightOf', { name: criterion.name || criterion.code })}
              value={choice.manual[criterion.id] ?? ''}
              onChange={(event) =>
                update({ manual: { ...choice.manual, [criterion.id]: event.target.value } })
              }
            />
          </label>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
        <span>{t('weights.manual.sum', { sum: formatters.value(sum) })}</span>
        {sum > 0 && Math.abs(sum - 1) > 1e-9 && <span>{t('weights.manual.scaled')}</span>}
        <Button
          variant="ghost"
          size="sm"
          onClick={() =>
            update({
              manual: Object.fromEntries(
                dataset.criteria.map((criterion) => [
                  criterion.id,
                  formatters.number(1 / dataset.criteria.length, 4),
                ]),
              ),
            })
          }
        >
          {t('weights.manual.equal')}
        </Button>
      </div>
    </div>
  );
}

function WeightBars({ dataset, weights }: { dataset: Dataset; weights: AnyWeights }) {
  const { t } = useTranslation('flow');
  const formatters = useFormatters();
  const shares = weightShares(weights);
  const largest = Math.max(...shares.values(), 0);
  return (
    <Bars
      label={t('weights.result')}
      testId="weights-section"
      rows={dataset.criteria.map((criterion) => {
        const share = shares.get(criterion.id) ?? 0;
        return {
          id: criterion.id,
          label: criterion.name || criterion.code,
          share: largest > 0 ? share / largest : 0,
          text: formatters.percent(share, 1),
        };
      })}
    />
  );
}

function Weights({ session, dataset }: FlowContext) {
  const { t } = useTranslation(['flow', 'nav']);
  useSamplePreset(dataset);
  const [choice, update] = useWeightChoice(dataset);
  const plan = useMemo(() => planWeights(dataset, choice), [dataset, choice]);
  const run = useStoredRun(session, dataset.id, plan.kind === 'run' ? plan.run : null);
  const analysis = plan.kind === 'run' ? shownAnalysis(run) : null;
  const weights = plan.kind === 'direct' ? plan.weights : analysis ? weightsOf(analysis) : null;
  const ready = weights !== null && (plan.kind === 'direct' || run.status === 'done');

  let details: ReactNode;
  if (choice.mode === 'data') {
    details = (
      <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
        <span>{t('weights.data.method')}</span>
        <Segmented<DataMethod>
          label={t('weights.data.method')}
          value={choice.dataMethod}
          options={[
            { value: 'critic', label: 'CRITIC' },
            { value: 'merec', label: 'MEREC' },
          ]}
          onChange={(dataMethod) => update({ dataMethod })}
        />
        <span>{t(`weights.data.${choice.dataMethod}`)}</span>
      </div>
    );
  } else if (choice.mode === 'order') {
    details = <OrderInput dataset={dataset} choice={choice} update={update} />;
  } else if (choice.mode === 'manual') {
    details = <ManualInput dataset={dataset} choice={choice} update={update} />;
  } else {
    details = <p className="text-sm text-muted-foreground">{t('weights.sample.hint')}</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div
        role="radiogroup"
        aria-label={t('nav:items.weights.description')}
        className={cn(
          'grid gap-3',
          choice.sampleId ? 'sm:grid-cols-2 lg:grid-cols-4' : 'sm:grid-cols-3',
        )}
      >
        {choice.sampleId && (
          <Choice
            mode="sample"
            current={choice.mode}
            onChoose={(mode) => update({ mode })}
            title={t('weights.sample.title')}
            hint={t('weights.sample.choice')}
          />
        )}
        <Choice
          mode="data"
          current={choice.mode}
          onChoose={(mode) => update({ mode })}
          title={t('weights.data.title')}
          hint={t('weights.data.hint')}
          badge={t('weights.recommended')}
        />
        <Choice
          mode="order"
          current={choice.mode}
          onChoose={(mode) => update({ mode })}
          title={t('weights.order.title')}
          hint={t('weights.order.choice')}
        />
        <Choice
          mode="manual"
          current={choice.mode}
          onChoose={(mode) => update({ mode })}
          title={t('weights.manual.title')}
          hint={t('weights.manual.choice')}
        />
      </div>

      {details}

      <section
        className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-5"
        aria-live="polite"
        aria-busy={run.status === 'running'}
      >
        {plan.kind === 'problems' ? (
          <DatasetProblems dataset={dataset} problems={plan.problems} />
        ) : run.status === 'failed' && run.outcome.kind === 'validation' ? (
          <ValidationProblems validation={run.outcome.validation} />
        ) : run.status === 'failed' && run.outcome.kind === 'error' ? (
          <p role="alert" className="text-sm text-danger">
            {t('failed', { message: run.outcome.message })}
          </p>
        ) : weights ? (
          <WeightBars dataset={dataset} weights={weights} />
        ) : (
          <p className="text-sm text-muted-foreground">
            {plan.kind === 'incomplete' ? t(`weights.incomplete.${choice.mode}`) : t('calculating')}
          </p>
        )}
      </section>

      {analysis && (
        <Disclosure title={t('weights.how')} testId="weights-how">
          <HowCalculated analysis={analysis} />
        </Disclosure>
      )}

      <StepFooter
        back={{ to: '/data', label: t('nav:steps.data') }}
        next={{ to: '/result', label: t('weights.next'), disabled: !ready }}
      />
    </div>
  );
}

export function WeightsStep() {
  const { t } = useTranslation('nav');
  return (
    <FlowPage
      title={t('items.weights.title')}
      description={t('items.weights.description')}
      needsAlternatives={false}
    >
      {(context) => <Weights {...context} />}
    </FlowPage>
  );
}

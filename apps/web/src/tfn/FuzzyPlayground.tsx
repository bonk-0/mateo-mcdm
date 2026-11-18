import type { LinguisticScale, TFN } from '@mateo/fuzzy';
import { PREDEFINED_SCALES, tfnEquals } from '@mateo/fuzzy';
import { Button, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@mateo/ui';
import { RotateCcw } from 'lucide-react';
import { useId, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useTextRef } from '../editor/messages';
import { useFormatters } from '../hooks/preferences';
import { PageHeader } from '../routes/PageHeader';
import { TFN_POINTS, moveTfnPoint, type TfnPoint } from './geometry';
import {
  PLAYGROUND_OPERATIONS,
  USES_B,
  applyOperation,
  defuzzified,
  type PlaygroundOperation,
} from './playground';
import { TfnChart, type TfnSeries } from './TfnChart';

const NO_SCALE = 'none';
const DEFAULT_DOMAIN: readonly [number, number] = [0, 10];
const START_A: TFN = { l: 1, m: 3, u: 5 };
const START_B: TFN = { l: 2, m: 4, u: 7 };

/** The number line a scale needs: from 0 (or lower) to its largest upper bound. */
function domainOfScale(scale: LinguisticScale | undefined): readonly [number, number] {
  if (!scale || scale.terms.length === 0) return DEFAULT_DOMAIN;
  const low = Math.min(...scale.terms.map((term) => term.value.l));
  const high = Math.max(...scale.terms.map((term) => term.value.u));
  return [Math.min(0, Math.floor(low)), Math.ceil(high)];
}

/** One operand: its three points as number fields and, with a scale, its terms. */
function OperandEditor({
  id,
  name,
  value,
  domain,
  step,
  scale,
  onChange,
}: {
  id: string;
  name: string;
  value: TFN;
  domain: readonly [number, number];
  step: number;
  scale: LinguisticScale | undefined;
  onChange: (value: TFN) => void;
}) {
  const { t } = useTranslation('explain');
  const textOf = useTextRef();
  return (
    <fieldset
      className="flex flex-col gap-2 rounded-lg border border-border p-3"
      data-testid={`playground-operand-${id}`}
    >
      <legend className="px-1 text-sm font-semibold">{name}</legend>
      <div className="flex flex-wrap gap-3">
        {TFN_POINTS.map((point) => (
          <label key={point} className="flex flex-col gap-1 text-xs text-muted-foreground">
            {t(`playground.point.${point}`)}
            <input
              type="number"
              inputMode="decimal"
              className="h-9 w-24 rounded-md border border-input bg-background px-2 text-sm text-foreground tabular-nums"
              value={value[point]}
              min={domain[0]}
              max={domain[1]}
              step={step}
              data-testid={`playground-input-${id}-${point}`}
              onChange={(event) => {
                const next = event.currentTarget.valueAsNumber;
                if (Number.isFinite(next)) onChange(moveTfnPoint(value, point, next, domain));
              }}
            />
          </label>
        ))}
      </div>
      {scale && (
        <div
          className="flex flex-wrap gap-1.5"
          role="group"
          aria-label={t('playground.terms', { name })}
        >
          {scale.terms.map((term) => (
            <Button
              key={term.id}
              type="button"
              size="sm"
              variant={tfnEquals(term.value, value) ? 'primary' : 'outline'}
              title={textOf(term.label)}
              data-testid={`playground-term-${id}-${term.id}`}
              onClick={() => onChange({ ...term.value })}
            >
              {term.abbreviation}
            </Button>
          ))}
        </div>
      )}
    </fieldset>
  );
}

/**
 * The Fuzzy Playground (also the last step of the fuzzy-number lesson, `embedded`): drag the points of two triangular fuzzy numbers and watch the
 * result of an operation and the defuzzified values follow. Everything is calculated by
 * `@mateo/fuzzy`; the page only draws.
 */
export function FuzzyPlayground({ embedded = false }: { embedded?: boolean } = {}) {
  const { t } = useTranslation(['explain', 'nav']);
  const textOf = useTextRef();
  const formatters = useFormatters();
  const idPrefix = useId();
  const nameA = t('playground.name.a');
  const nameB = t('playground.name.b');
  const [a, setA] = useState<TFN>(START_A);
  const [b, setB] = useState<TFN>(START_B);
  const [k, setK] = useState(2);
  const [operation, setOperation] = useState<PlaygroundOperation>('add');
  const [scaleId, setScaleId] = useState<string>(NO_SCALE);

  const scale = PREDEFINED_SCALES.find((candidate) => candidate.id === scaleId);
  const domain = useMemo(() => domainOfScale(scale), [scale]);
  const step = (domain[1] - domain[0]) / 100;
  const format = (value: number) => formatters.number(value);

  const result = useMemo(() => applyOperation(operation, a, b, k), [operation, a, b, k]);
  const usesB = USES_B[operation];

  const chooseScale = (id: string) => {
    setScaleId(id);
    const next = PREDEFINED_SCALES.find((candidate) => candidate.id === id);
    const range = domainOfScale(next);
    if (next && next.terms.length > 1) {
      // Start from two neighbouring terms, so that both numbers are on the scale.
      const middle = Math.floor((next.terms.length - 1) / 2);
      setA({ ...next.terms[middle]!.value });
      setB({ ...next.terms[Math.min(next.terms.length - 1, middle + 1)]!.value });
    } else {
      const fit = (value: TFN) =>
        moveTfnPoint(
          moveTfnPoint(moveTfnPoint(value, 'l', value.l, range), 'm', value.m, range),
          'u',
          value.u,
          range,
        );
      setA(fit(a));
      setB(fit(b));
    }
  };

  const operands: TfnSeries[] = [
    { id: 'a', label: nameA, value: a, tone: 0 },
    ...(usesB ? [{ id: 'b', label: nameB, value: b, tone: 1 }] : []),
  ];
  const scaleSeries: TfnSeries[] = (scale?.terms ?? []).map((term) => ({
    id: term.id,
    label: term.abbreviation,
    value: term.value,
  }));
  const movable = operands.map((entry) => entry.id);
  const onChange = (id: string, value: TFN) => (id === 'a' ? setA(value) : setB(value));
  const handleLabel = (entry: TfnSeries, point: TfnPoint) =>
    t('playground.handle', { name: entry.label, point: t(`playground.point.${point}`) });

  const rows: { id: string; name: string; value: TFN }[] = [
    { id: 'a', name: nameA, value: a },
    ...(usesB ? [{ id: 'b', name: nameB, value: b }] : []),
    ...(result.ok ? [{ id: 'result', name: t('playground.result'), value: result.value }] : []),
  ];
  const resultSeries: TfnSeries[] = result.ok
    ? [...operands, { id: 'result', label: t('playground.result'), value: result.value, tone: 2 }]
    : [];
  const markers = result.ok
    ? [
        {
          id: 'graded-mean',
          label: t('playground.defuzzification.graded-mean'),
          at: defuzzified(result.value)['graded-mean'],
          tone: 2,
        },
      ]
    : [];

  const reset = (
    <Button
      type="button"
      variant="outline"
      data-testid="playground-reset"
      onClick={() => {
        setA(START_A);
        setB(START_B);
        setK(2);
        setOperation('add');
        setScaleId(NO_SCALE);
      }}
    >
      <RotateCcw aria-hidden />
      {t('playground.reset')}
    </Button>
  );

  return (
    <section aria-labelledby={`${idPrefix}-title`} data-testid="fuzzy-playground">
      {embedded ? (
        <div className="mb-4 flex justify-end">{reset}</div>
      ) : (
        <PageHeader
          title={t('nav:items.playground.title')}
          description={t('nav:items.playground.description')}
          actions={reset}
        />
      )}
      <h2 id={`${idPrefix}-title`} className="sr-only">
        {t('playground.title')}
      </h2>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
        <div className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">{t('playground.hint')}</p>
          <TfnChart
            testId="playground-chart"
            series={operands}
            scale={scaleSeries}
            domain={domain}
            movable={movable}
            onChange={onChange}
            step={step}
            numberFormat={format}
            ariaLabel={t('playground.chart.operands')}
            handleLabel={handleLabel}
          />
          <h3 className="mt-2 text-sm font-semibold">{t('playground.chart.resultTitle')}</h3>
          {result.ok ? (
            <TfnChart
              testId="playground-result-chart"
              series={resultSeries}
              markers={markers}
              numberFormat={format}
              ariaLabel={t('playground.chart.result')}
            />
          ) : (
            <p role="alert" className="text-sm text-danger" data-testid="playground-error">
              {t(`playground.error.${result.reason}`)}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium" htmlFor={`${idPrefix}-op`}>
              {t('playground.operation.label')}
            </label>
            <Select value={operation} onValueChange={(v) => setOperation(v as PlaygroundOperation)}>
              <SelectTrigger id={`${idPrefix}-op`} data-testid="playground-operation">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PLAYGROUND_OPERATIONS.map((id) => (
                  <SelectItem key={id} value={id} data-testid={`playground-operation-${id}`}>
                    {t(`playground.operation.${id}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground" data-testid="playground-rule">
              {t(`playground.rule.${operation}`)}
            </p>
          </div>

          {!usesB && (
            <label className="flex flex-col gap-1.5 text-sm font-medium">
              {t('playground.scalar')}
              <input
                type="number"
                inputMode="decimal"
                className="h-9 w-28 rounded-md border border-input bg-background px-2 text-sm tabular-nums"
                value={k}
                step={0.5}
                data-testid="playground-scalar"
                onChange={(event) => {
                  const next = event.currentTarget.valueAsNumber;
                  if (Number.isFinite(next)) setK(next);
                }}
              />
            </label>
          )}

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium" htmlFor={`${idPrefix}-scale`}>
              {t('playground.scale.label')}
            </label>
            <Select value={scaleId} onValueChange={chooseScale}>
              <SelectTrigger id={`${idPrefix}-scale`} data-testid="playground-scale">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_SCALE}>{t('playground.scale.none')}</SelectItem>
                {PREDEFINED_SCALES.map((candidate) => (
                  <SelectItem key={candidate.id} value={candidate.id}>
                    {textOf(candidate.name)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <OperandEditor
            id="a"
            name={nameA}
            value={a}
            domain={domain}
            step={step}
            scale={scale}
            onChange={setA}
          />
          {usesB && (
            <OperandEditor
              id="b"
              name={nameB}
              value={b}
              domain={domain}
              step={step}
              scale={scale}
              onChange={setB}
            />
          )}
        </div>
      </div>

      <div className="mt-6 overflow-x-auto">
        <table className="border-collapse text-sm" data-testid="playground-table">
          <caption className="pb-2 text-left text-sm font-semibold">
            {t('playground.table.caption')}
          </caption>
          <thead>
            <tr>
              <th scope="col" className="border-b border-border px-3 py-1.5 text-left font-medium">
                {t('playground.table.number')}
              </th>
              {TFN_POINTS.map((point) => (
                <th
                  key={point}
                  scope="col"
                  className="border-b border-border px-3 py-1.5 text-right font-medium"
                >
                  {t(`playground.point.${point}`)}
                </th>
              ))}
              <th scope="col" className="border-b border-border px-3 py-1.5 text-right font-medium">
                {t('playground.defuzzification.graded-mean')}
              </th>
              <th scope="col" className="border-b border-border px-3 py-1.5 text-right font-medium">
                {t('playground.defuzzification.centroid')}
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const crisp = defuzzified(row.value);
              return (
                <tr key={row.id} data-testid={`playground-row-${row.id}`}>
                  <th
                    scope="row"
                    className="border-b border-border px-3 py-1.5 text-left font-medium"
                  >
                    {row.name}
                  </th>
                  {TFN_POINTS.map((point) => (
                    <td
                      key={point}
                      className="border-b border-border px-3 py-1.5 text-right tabular-nums"
                      data-testid={`playground-${row.id}-${point}`}
                      data-value={String(row.value[point])}
                    >
                      {format(row.value[point])}
                    </td>
                  ))}
                  <td
                    className="border-b border-border px-3 py-1.5 text-right tabular-nums"
                    data-testid={`playground-${row.id}-graded-mean`}
                    data-value={String(crisp['graded-mean'])}
                  >
                    {formatters.value(crisp['graded-mean'])}
                  </td>
                  <td
                    className="border-b border-border px-3 py-1.5 text-right tabular-nums"
                    data-testid={`playground-${row.id}-centroid`}
                    data-value={String(crisp.centroid)}
                  >
                    {formatters.value(crisp.centroid)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

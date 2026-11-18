import type { TFN } from '@mateo/fuzzy';
import { FIVE_LEVEL_SCALE, gradedMean, tfnAdd } from '@mateo/fuzzy';
import { Button } from '@mateo/ui';
import { ArrowRight } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { useMessage } from '../editor/messages';
import { LessonShell } from '../explain/Lesson';
import { useFormatters } from '../hooks/preferences';
import { libraryPath } from '../library/methods';
import { PageHeader } from '../routes/PageHeader';
import { FuzzyPlayground } from './FuzzyPlayground';
import { FUZZY_LESSON_STEPS, type FuzzyLessonStepId } from './fuzzyLessonSteps';
import { TfnChart, type TfnSeries } from './TfnChart';

type StepId = FuzzyLessonStepId;

/** "About 7": the number the lesson starts from. */
const ABOUT_SEVEN: TFN = { l: 5, m: 7, u: 9 };
const EXACTLY_SEVEN: TFN = { l: 7, m: 7, u: 7 };
const A: TFN = { l: 1, m: 3, u: 5 };
const B: TFN = { l: 2, m: 4, u: 7 };

function Panel({ children, testId }: { children: ReactNode; testId?: string }) {
  return (
    <div
      className="flex min-w-0 flex-col gap-3 rounded-lg border border-border bg-surface p-4"
      data-testid={testId}
    >
      {children}
    </div>
  );
}

function Meaning({ children }: { children: ReactNode }) {
  const { t } = useTranslation('explain');
  return (
    <div className="flex flex-col gap-1 rounded-md bg-success/10 px-3 py-2.5 text-sm">
      <span className="font-semibold text-success">{t('lesson.meaning')}</span>
      <span>{children}</span>
    </div>
  );
}

/** The three numbers of a triangle, each with what it says. */
function Points({ value, tones = [0, 0, 0] }: { value: TFN; tones?: readonly number[] }) {
  const { t } = useTranslation('explain');
  const formatters = useFormatters();
  const number = (x: number) => formatters.number(x, Number.isInteger(x) ? 0 : 2);
  return (
    <dl className="grid grid-cols-[auto_minmax(0,1fr)] items-baseline gap-x-3 gap-y-2 text-sm">
      {(['l', 'm', 'u'] as const).map((point, index) => (
        <div key={point} className="contents">
          <dt
            className="font-semibold tabular-nums"
            style={{ color: `var(--series-${(tones[index] ?? 0) + 1})` }}
            translate="no"
          >
            {point} = {number(value[point])}
          </dt>
          <dd className="text-muted-foreground">{t(`fuzzyLesson.points.${point}`)}</dd>
        </div>
      ))}
    </dl>
  );
}

/**
 * "What is a fuzzy number?": a short lesson before the Fuzzy Playground, which is its last
 * step. Every triangle and every number after an operation comes from `@mateo/fuzzy`.
 */
export function FuzzyLesson() {
  const { t } = useTranslation(['explain', 'nav']);
  const message = useMessage();
  const formatters = useFormatters();
  const [current, setCurrent] = useState(0);
  const id: StepId = FUZZY_LESSON_STEPS[current] ?? 'why';
  const text = (step: StepId, field: 'title' | 'idea' | 'why') =>
    t(`explain:fuzzyLesson.steps.${step}.${field}`);
  const number = (x: number) => formatters.number(x, Number.isInteger(x) ? 0 : 2);
  const triple = (value: TFN) =>
    t('explain:fuzzyLesson.triple', {
      l: number(value.l),
      m: number(value.m),
      u: number(value.u),
    });
  const chart = (
    series: readonly TfnSeries[],
    label: string,
    domain?: readonly [number, number],
  ) => (
    <TfnChart
      series={series}
      numberFormat={number}
      ariaLabel={label}
      {...(domain ? { domain } : {})}
    />
  );

  const sum = tfnAdd(A, B);
  const content: Record<StepId, ReactNode> = {
    why: (
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <Panel>
          {chart(
            [
              { id: 'exact', label: '', value: EXACTLY_SEVEN, tone: 1 },
              { id: 'about', label: '', value: ABOUT_SEVEN, tone: 0 },
            ],
            t('explain:fuzzyLesson.why.chart'),
            [0, 10],
          )}
          <ul className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted-foreground">
            {(
              [
                ['exact', 2],
                ['about', 1],
              ] as const
            ).map(([key, tone]) => (
              <li key={key} className="flex items-center gap-2">
                <span
                  className="inline-block size-2.5 rounded-sm"
                  style={{ background: `var(--series-${tone})` }}
                  aria-hidden
                />
                {t(`explain:fuzzyLesson.why.${key}`)}
              </li>
            ))}
          </ul>
        </Panel>
        <Meaning>{t('explain:fuzzyLesson.why.meaning')}</Meaning>
      </div>
    ),
    triangle: (
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <Panel>
          {chart(
            [{ id: 'about', label: triple(ABOUT_SEVEN), value: ABOUT_SEVEN, tone: 0 }],
            t('explain:fuzzyLesson.triangle.chart'),
            [0, 10],
          )}
        </Panel>
        <div className="flex flex-col gap-3">
          <Panel>
            <Points value={ABOUT_SEVEN} />
          </Panel>
          <Meaning>
            {t('explain:fuzzyLesson.triangle.meaning', { value: triple(ABOUT_SEVEN) })}
          </Meaning>
        </div>
      </div>
    ),
    scale: (
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <Panel>
          {chart(
            FIVE_LEVEL_SCALE.terms.map((term, index) => ({
              id: term.id,
              label: term.abbreviation,
              value: term.value,
              tone: index,
            })),
            t('explain:fuzzyLesson.scale.chart'),
          )}
        </Panel>
        <div className="flex flex-col gap-3">
          <Panel testId="fuzzy-lesson-scale">
            <ul className="flex flex-col gap-1.5 text-sm">
              {FIVE_LEVEL_SCALE.terms.map((term) => (
                <li key={term.id} className="flex justify-between gap-3">
                  <span>
                    <span className="mr-2 font-semibold" translate="no">
                      {term.abbreviation}
                    </span>
                    {message(`scales.${FIVE_LEVEL_SCALE.id}.terms.${term.id}`)}
                  </span>
                  <span className="text-muted-foreground tabular-nums" translate="no">
                    {triple(term.value)}
                  </span>
                </li>
              ))}
            </ul>
          </Panel>
          <Meaning>{t('explain:fuzzyLesson.scale.meaning')}</Meaning>
        </div>
      </div>
    ),
    arithmetic: (
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <Panel>
          {chart(
            [
              { id: 'a', label: 'A', value: A, tone: 0 },
              { id: 'b', label: 'B', value: B, tone: 1 },
              { id: 'sum', label: 'A ⊕ B', value: sum, tone: 2 },
            ],
            t('explain:fuzzyLesson.arithmetic.chart'),
          )}
        </Panel>
        <div className="flex flex-col gap-3">
          <Panel testId="fuzzy-lesson-sum">
            <p className="text-sm">{t('explain:fuzzyLesson.arithmetic.how')}</p>
            <p className="rounded-md bg-muted/60 px-3 py-2 text-base tabular-nums" translate="no">
              {triple(A)} ⊕ {triple(B)} = <strong>{triple(sum)}</strong>
            </p>
            <p className="text-sm">
              {t('explain:fuzzyLesson.arithmetic.single', {
                value: triple(sum),
                mean: formatters.value(gradedMean(sum)),
              })}
            </p>
          </Panel>
          <Meaning>{t('explain:fuzzyLesson.arithmetic.meaning')}</Meaning>
        </div>
      </div>
    ),
    try: <FuzzyPlayground embedded />,
  };

  return (
    <div className="flex flex-col" data-testid="fuzzy-lesson-page">
      <PageHeader
        title={t('nav:items.fuzzyLesson.title')}
        description={t('nav:items.fuzzyLesson.description')}
      />
      <div className="rounded-xl border border-border bg-surface/60 p-4 sm:p-5">
        <LessonShell
          testId="fuzzy-lesson"
          titles={FUZZY_LESSON_STEPS.map((step) => text(step, 'title'))}
          current={current}
          onGo={setCurrent}
          onBack={() => setCurrent((index) => Math.max(0, index - 1))}
          onNext={() => setCurrent((index) => Math.min(FUZZY_LESSON_STEPS.length - 1, index + 1))}
          isFirst={current === 0}
          isLast={current === FUZZY_LESSON_STEPS.length - 1}
          idea={text(id, 'idea')}
          why={text(id, 'why')}
          data={{ 'data-step': id }}
          finish={
            <Button asChild>
              <Link to={libraryPath('fuzzy-marcos')}>
                {t('explain:fuzzyLesson.next')}
                <ArrowRight aria-hidden />
              </Link>
            </Button>
          }
        >
          {content[id]}
        </LessonShell>
      </div>
    </div>
  );
}

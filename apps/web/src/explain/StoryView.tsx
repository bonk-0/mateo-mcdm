import type { Trace } from '@mateo/engine';
import type { StoryDriver, StoryPlan, StoryValue } from '@mateo/explain';
import { buildRankingStory } from '@mateo/explain';
import { useMemo, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useTextRef } from '../editor/messages';
import { Bar, extent } from './Bar';
import { DerivationPopover, type DerivationTarget } from './Derivation';
import { useCellLabels } from './labels';
import { Value } from './Value';

function Card({ title, children, testId }: { title: string; children: ReactNode; testId: string }) {
  return (
    <section
      className="space-y-3 rounded-lg border border-border bg-surface p-4"
      data-testid={testId}
    >
      <h4 className="text-sm font-semibold">{title}</h4>
      {children}
    </section>
  );
}

/**
 * A short guided reading of the final ranking: the winner, the criteria that carried it,
 * and how the runner-up compares. Every number is a cell of the trace and opens its own
 * "How was this calculated?"; the story orders and compares values but calculates nothing.
 */
export function StoryView({ trace, plan }: { trace: Trace; plan: StoryPlan }) {
  const { t } = useTranslation('explain');
  const textOf = useTextRef();
  const labelsOf = useCellLabels(trace);
  const story = useMemo(() => buildRankingStory(trace, plan), [trace, plan]);
  const [derivation, setDerivation] = useState<DerivationTarget | null>(null);

  if (story === null) {
    return <p className="text-sm text-muted-foreground">{t('story.unavailable')}</p>;
  }
  const { winner, runnerUp } = story;
  const winnerName = textOf(winner.item.label);
  const runnerUpName = runnerUp ? textOf(runnerUp.item.label) : '';
  const driverScale = Math.max(
    0,
    ...story.drivers.map((driver) => extent(driver.winner.value) ?? 0),
  );
  const scoreScale = Math.max(
    0,
    extent(winner.score.value) ?? 0,
    runnerUp ? (extent(runnerUp.score.value) ?? 0) : 0,
  );
  const fuzzy = story.drivers.some((driver) => typeof driver.winner.value === 'object');

  const number = (entry: StoryValue) => {
    const labels = labelsOf(entry.ref);
    return (
      <button
        type="button"
        className="rounded font-medium tabular-nums underline decoration-dotted underline-offset-4 hover:decoration-solid"
        aria-description={t('derivation.open', { cell: labels.cell })}
        onClick={(event) =>
          setDerivation({ cell: entry.ref, anchor: event.currentTarget })
        }
      >
        <Value value={entry.value} />
      </button>
    );
  };
  const names = (drivers: readonly StoryDriver[]) =>
    drivers.length === 0 ? (
      <span className="text-muted-foreground">{t('story.runnerUp.nowhere')}</span>
    ) : (
      <span className="flex flex-wrap gap-1.5">
        {drivers.map((driver) => (
          <span key={driver.criterion.id} className="rounded-md bg-muted px-2 py-0.5 text-sm">
            {textOf(driver.criterion.label)}
          </span>
        ))}
      </span>
    );

  return (
    <div className="space-y-4" data-testid="explain-story">
      <p className="max-w-3xl text-sm text-muted-foreground">{t('story.intro')}</p>
      <div className="grid gap-4 xl:grid-cols-3">
        <Card title={t('story.winner.title')} testId="story-winner">
          <p className="text-lg font-semibold">
            {story.tiedWithWinner.length > 0
              ? t('story.winner.tie', {
                  name: winnerName,
                  others: story.tiedWithWinner.map((entry) => textOf(entry.item.label)).join(', '),
                })
              : t('story.winner.text', { name: winnerName })}
          </p>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
            <dt className="text-muted-foreground">{t('story.score')}</dt>
            <dd>{number(winner.score)}</dd>
            <dt className="text-muted-foreground">{t('story.rank')}</dt>
            <dd>{number(winner.rank)}</dd>
          </dl>
        </Card>

        <Card title={t('story.drivers.title', { name: winnerName })} testId="story-drivers">
          <p className="text-sm text-muted-foreground">
            {t('story.drivers.text', { name: winnerName })}
          </p>
          <table className="w-full border-collapse text-sm">
            <thead className="sr-only">
              <tr>
                <th scope="col">{t('story.drivers.criterion')}</th>
                <th scope="col">{t('story.drivers.contribution', { name: winnerName })}</th>
              </tr>
            </thead>
            <tbody>
              {story.drivers.map((driver) => (
                <tr key={driver.criterion.id}>
                  <th scope="row" className="py-1 pr-3 text-left font-medium">
                    {textOf(driver.criterion.label)}
                  </th>
                  <td className="py-1 pr-3 text-right whitespace-nowrap">
                    {number(driver.winner)}
                  </td>
                  <td className="py-1">
                    <Bar value={driver.winner.value} scale={driverScale} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {fuzzy && <p className="text-xs text-muted-foreground">{t('story.fuzzyNote')}</p>}
        </Card>

        <Card title={t('story.runnerUp.title')} testId="story-runner-up">
          {runnerUp === null ? (
            <p className="text-sm text-muted-foreground">{t('story.runnerUp.none')}</p>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                {t('story.runnerUp.text', { runnerUp: runnerUpName })}
              </p>
              <table className="w-full border-collapse text-sm">
                <caption className="sr-only">{t('story.score')}</caption>
                <tbody>
                  {[winner, runnerUp].map((entry) => (
                    <tr key={entry.item.id}>
                      <th scope="row" className="py-1 pr-3 text-left font-medium">
                        {textOf(entry.item.label)}
                      </th>
                      <td className="py-1 pr-3 text-right whitespace-nowrap">
                        {number(entry.score)}
                      </td>
                      <td className="py-1">
                        <Bar value={entry.score.value} scale={scoreScale} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {story.ahead.length === 0 && story.behind.length === 0 ? (
                <p className="text-sm">{t('story.runnerUp.equal')}</p>
              ) : (
                <dl className="space-y-2 text-sm">
                  <dt className="text-muted-foreground">
                    {t('story.runnerUp.ahead', { winner: winnerName })}
                  </dt>
                  <dd data-testid="story-ahead">{names(story.ahead)}</dd>
                  <dt className="text-muted-foreground">
                    {t('story.runnerUp.behind', { runnerUp: runnerUpName })}
                  </dt>
                  <dd data-testid="story-behind">{names(story.behind)}</dd>
                </dl>
              )}
            </>
          )}
        </Card>
      </div>
      <DerivationPopover trace={trace} target={derivation} onClose={() => setDerivation(null)} />
    </div>
  );
}

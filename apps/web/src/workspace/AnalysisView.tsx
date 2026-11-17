import type { ValidationIssue } from '@mateo/engine';
import type { StoredAnalysis } from '@mateo/project';
import { Badge, Tabs, TabsContent, TabsList, TabsTrigger } from '@mateo/ui';
import { ChartColumn, Clapperboard, TriangleAlert } from 'lucide-react';
import { useMemo, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useMessage, useTextRef } from '../editor/messages';
import { useSession } from '../editor/session';
import { AnalysisExportButton } from '../export/buttons';
import { ExplainPanel, explanationOf } from '../explain/ExplainPanel';
import { useFormatters } from '../hooks/preferences';
import { kindOfMethod } from './analyses';
import { EChart } from './charts/EChart';
import { barOption, heatmapOption } from './charts/options';
import { contributionHeatmap, rankingRows, weightRows } from './resultData';
import { TraceTables } from './TraceTables';

const tableClass = 'min-w-full border-collapse text-sm';
const thClass = 'border-b border-border px-3 py-2 text-left font-medium whitespace-nowrap';
const tdClass = 'border-b border-border px-3 py-2 tabular-nums';

function Section({
  title,
  children,
  testId,
}: {
  title: string;
  children: ReactNode;
  testId?: string;
}) {
  return (
    <section className="space-y-3" data-testid={testId}>
      <h3 className="text-base font-semibold">{title}</h3>
      {children}
    </section>
  );
}

function Warnings({ warnings }: { warnings: readonly ValidationIssue[] }) {
  const { t } = useTranslation('workspace');
  const message = useMessage();
  if (warnings.length === 0) return null;
  return (
    <div
      role="status"
      className="rounded-lg border border-border bg-muted p-3 text-sm"
      data-testid="analysis-warnings"
    >
      <p className="flex items-center gap-2 font-medium text-warning">
        <TriangleAlert className="size-4" aria-hidden />
        {t('result.warnings')}
      </p>
      <ul className="mt-1 list-disc pl-6">
        {warnings.map((issue, index) => (
          <li key={`${issue.code}-${index}`}>{message(issue.messageKey, issue.params)}</li>
        ))}
      </ul>
    </div>
  );
}

function WeightsSection({ analysis }: { analysis: StoredAnalysis }) {
  const { t } = useTranslation('workspace');
  const textOf = useTextRef();
  const formatters = useFormatters();
  const rows = useMemo(() => weightRows(analysis.record.trace), [analysis]);
  const name = t('result.weightsChart');
  const buildOption = useMemo(
    () => (theme: Parameters<typeof barOption>[0]['theme']) =>
      barOption({
        theme,
        categories: rows.map((row) => textOf(row.label)),
        series: [{ name, values: rows.map((row) => row.value) }],
        format: formatters.value,
      }),
    [rows, formatters, name, textOf],
  );
  if (rows.length === 0) return null;
  return (
    <Section title={t('result.weights')} testId="weights-section">
      <div className="overflow-x-auto">
        <table className={tableClass}>
          <thead>
            <tr>
              <th scope="col" className={thClass}>
                {t('result.criterion')}
              </th>
              <th scope="col" className={`${thClass} text-right`}>
                {t('result.weight')}
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <th scope="row" className={`${tdClass} text-left font-medium`}>
                  {textOf(row.label)}
                </th>
                <td className={`${tdClass} text-right`}>
                  {row.value === null ? '–' : formatters.value(row.value)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <EChart label={name} buildOption={buildOption} />
    </Section>
  );
}

function RankingSection({ analysis }: { analysis: StoredAnalysis }) {
  const { t } = useTranslation('workspace');
  const textOf = useTextRef();
  const formatters = useFormatters();
  const { result, trace } = analysis.record;
  const rows = useMemo(() => rankingRows(result, trace), [result, trace]);
  const heatmap = useMemo(() => contributionHeatmap(trace), [trace]);
  const hasUtilityFunctions = rows.some((row) => row.fMinus !== null && row.fPlus !== null);

  const utilityName = t('result.utilityChart');
  const rankingName = t('result.rankingChart');
  const heatmapName = t('result.heatmapChart');

  const rankingOption = useMemo(
    () => (theme: Parameters<typeof barOption>[0]['theme']) =>
      barOption({
        theme,
        categories: rows.map((row) => textOf(row.label)),
        series: [{ name: t('result.finalUtility'), values: rows.map((row) => row.score) }],
        format: formatters.value,
      }),
    [rows, formatters, t, textOf],
  );
  const utilityOption = useMemo(
    () => (theme: Parameters<typeof barOption>[0]['theme']) =>
      barOption({
        theme,
        categories: rows.map((row) => textOf(row.label)),
        series: [
          { name: t('result.fMinus'), values: rows.map((row) => row.fMinus) },
          { name: t('result.fPlus'), values: rows.map((row) => row.fPlus) },
          { name: t('result.finalUtility'), values: rows.map((row) => row.score) },
        ],
        format: formatters.value,
      }),
    [rows, formatters, t, textOf],
  );
  const heatmapChartOption = useMemo(
    () => (theme: Parameters<typeof barOption>[0]['theme']) =>
      heatmapOption({
        theme,
        rows: heatmap?.rows.map((item) => textOf(item.label)) ?? [],
        columns: heatmap?.columns.map((item) => textOf(item.label)) ?? [],
        values: heatmap?.values ?? [],
        format: formatters.value,
      }),
    [heatmap, formatters, textOf],
  );

  return (
    <>
      <Section title={t('result.ranking')} testId="ranking-section">
        <div className="overflow-x-auto">
          <table className={tableClass} data-testid="ranking-table">
            <thead>
              <tr>
                <th scope="col" className={thClass}>
                  {t('result.rank')}
                </th>
                <th scope="col" className={thClass}>
                  {t('result.alternative')}
                </th>
                <th scope="col" className={`${thClass} text-right`}>
                  {t('result.finalUtility')}
                </th>
                {hasUtilityFunctions && (
                  <>
                    <th scope="col" className={`${thClass} text-right`}>
                      {t('result.fMinus')}
                    </th>
                    <th scope="col" className={`${thClass} text-right`}>
                      {t('result.fPlus')}
                    </th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.alternativeId}>
                  <td className={`${tdClass} font-semibold`}>{row.rank}</td>
                  <th scope="row" className={`${tdClass} text-left font-medium`}>
                    {textOf(row.label)}
                  </th>
                  <td className={`${tdClass} text-right`}>{formatters.value(row.score)}</td>
                  {hasUtilityFunctions && (
                    <>
                      <td className={`${tdClass} text-right`}>
                        {row.fMinus === null ? '–' : formatters.value(row.fMinus)}
                      </td>
                      <td className={`${tdClass} text-right`}>
                        {row.fPlus === null ? '–' : formatters.value(row.fPlus)}
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <EChart label={rankingName} buildOption={rankingOption} />
      </Section>
      {hasUtilityFunctions && (
        <Section title={t('result.utilityFunctions')}>
          <EChart label={utilityName} buildOption={utilityOption} />
        </Section>
      )}
      <WeightsSection analysis={analysis} />
      {heatmap && heatmap.rows.length > 0 && (
        <Section title={t('result.contribution')}>
          <p className="max-w-3xl text-sm text-muted-foreground">{t('result.contributionHint')}</p>
          <EChart label={heatmapName} buildOption={heatmapChartOption} height={320} />
        </Section>
      )}
    </>
  );
}

/**
 * A stored analysis: the result first (weights, or ranking with its charts), then every
 * step of the calculation. Methods with an explain sequence also get Explain mode in a
 * second tab. Everything shown comes from the stored record; nothing is calculated again.
 */
export function AnalysisView({
  analysis,
  stale = false,
  actions,
}: {
  analysis: StoredAnalysis;
  /** The dataset changed after the analysis was run. */
  stale?: boolean;
  actions?: ReactNode;
}) {
  const { t } = useTranslation('workspace');
  const { t: tExplain } = useTranslation('explain');
  const message = useMessage();
  const formatters = useFormatters();
  const kind = kindOfMethod(analysis.methodId);
  const session = useSession();
  const { trace } = analysis.record;
  const explanation = useMemo(() => explanationOf(trace), [trace]);
  const results = (
    <div className="space-y-8">
      {kind === 'weighting' && <WeightsSection analysis={analysis} />}
      {kind === 'ranking' && <RankingSection analysis={analysis} />}
      <Section title={t('result.steps')} testId="trace-section">
        <p className="max-w-3xl text-sm text-muted-foreground">{t('result.stepsHint')}</p>
        <TraceTables trace={trace} />
      </Section>
    </div>
  );
  return (
    <div className="space-y-8" data-testid="analysis-view" data-method={analysis.methodId}>
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold">
            {analysis.name || message(`methods.${methodKey(analysis.methodId)}.name`)}
          </h2>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span>{message(`methods.${methodKey(analysis.methodId)}.name`)}</span>
            <Badge variant="outline">{analysis.numberType}</Badge>
            <span>{formatters.date(new Date(analysis.createdAt), 'medium', true)}</span>
            {stale && <Badge variant="accent">{t('result.stale')}</Badge>}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {session && <AnalysisExportButton session={session} analysis={analysis} stale={stale} />}
          {actions}
        </div>
      </header>
      <Warnings warnings={analysis.record.warnings} />
      {explanation ? (
        // Explain mode sits next to the results and never replaces them.
        <Tabs defaultValue="results" className="space-y-6">
          <TabsList aria-label={tExplain('view.label')}>
            <TabsTrigger value="results" data-testid="view-results">
              <ChartColumn aria-hidden />
              {tExplain('view.results')}
            </TabsTrigger>
            <TabsTrigger value="explain" data-testid="view-explain">
              <Clapperboard aria-hidden />
              {tExplain('view.explain')}
            </TabsTrigger>
          </TabsList>
          <TabsContent value="results">{results}</TabsContent>
          <TabsContent value="explain">
            <ExplainPanel trace={trace} explanation={explanation} />
          </TabsContent>
        </Tabs>
      ) : (
        results
      )}
    </div>
  );
}

/** `fuzzy-marcos` → `fuzzyMarcos`: the form of the method id used in message keys. */
export function methodKey(methodId: string): string {
  return methodId.replace(/-([a-z])/gu, (_, letter: string) => letter.toUpperCase());
}

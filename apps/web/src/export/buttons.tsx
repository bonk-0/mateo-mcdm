import type { Dataset, ProjectDocument, ProjectSession, StoredAnalysis } from '@mateo/project';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ExportButton } from './ExportDialog';
import { analysisSource, matrixSource } from './sources';

/** Exports a decision problem: its matrix (readable by the import again), criteria, alternatives and scales. */
export function MatrixExportButton({
  document,
  dataset,
  variant,
  testId,
}: {
  document: ProjectDocument;
  dataset: Dataset;
  variant?: 'primary' | 'outline' | 'ghost';
  testId?: string;
}) {
  const { t, i18n } = useTranslation('export');
  const source = useMemo(
    () => matrixSource(i18n, document, dataset, (name) => t('fileName.matrix', { name })),
    [i18n, document, dataset, t],
  );
  return (
    <ExportButton
      source={source}
      hint={t('matrixHint')}
      {...(variant ? { variant } : {})}
      {...(testId ? { testId } : {})}
    />
  );
}

/** Exports a stored analysis: its data, parameters, every step of the calculation and the results. */
export function AnalysisExportButton({
  session,
  analysis,
  stale,
}: {
  session: ProjectSession;
  analysis: StoredAnalysis;
  stale: boolean;
}) {
  const { t, i18n } = useTranslation('export');
  const source = useMemo(
    () =>
      analysisSource(i18n, session, analysis, {
        stale,
        fileName: (method) => t('fileName.analysis', { name: session.document.info.name, method }),
      }),
    [i18n, session, analysis, stale, t],
  );
  return <ExportButton source={source} testId="export-analysis" />;
}

import type { MethodRunRecord } from '@mateo/engine';
import type { AnalysisSummary, JsonValue, ProjectSession, StoredAnalysis } from '@mateo/project';
import type { FuzzyModel } from './engineInput';
import { isRankingMethod, isWeightingMethod } from './registry';

/**
 * Where the weights of a ranking run came from. Stored with the analysis so that the
 * results page can say so without guessing.
 */
export type WeightSource =
  | { readonly source: 'manual' }
  | { readonly source: 'analysis'; readonly analysisId: string; readonly methodId: string }
  /** The weights printed in the paper of a Method Library sample. */
  | { readonly source: 'sample'; readonly sampleId: string };

/** The workspace-owned part of a stored analysis (`NewAnalysis.configuration`). */
export interface AnalysisConfiguration {
  readonly workspace: 'weighting' | 'ranking';
  readonly matrixId: string;
  readonly fuzzyModel: FuzzyModel;
  readonly weights?: WeightSource;
}

export function configurationOf(
  analysis: Pick<StoredAnalysis, 'configuration'>,
): AnalysisConfiguration | null {
  const value = analysis.configuration as Partial<AnalysisConfiguration> | null;
  if (!value || (value.workspace !== 'weighting' && value.workspace !== 'ranking')) return null;
  return value as AnalysisConfiguration;
}

export type AnalysisKind = 'weighting' | 'ranking' | 'other';

export function kindOfMethod(methodId: string): AnalysisKind {
  if (isWeightingMethod(methodId)) return 'weighting';
  if (isRankingMethod(methodId)) return 'ranking';
  return 'other';
}

/** Stores a finished run with the dataset it was made on. Saves the project first, so the dataset is in the file. */
export async function saveAnalysis(
  session: ProjectSession,
  params: {
    readonly datasetId: string;
    readonly record: MethodRunRecord<unknown>;
    readonly methodInput: unknown;
    readonly numberType: string;
    readonly configuration: AnalysisConfiguration;
    readonly name?: string;
  },
): Promise<AnalysisSummary> {
  await session.save();
  return session.addAnalysis({
    datasetId: params.datasetId,
    record: params.record,
    methodInput: params.methodInput,
    numberType: params.numberType,
    configuration: params.configuration as unknown as JsonValue,
    ...(params.name ? { name: params.name } : {}),
  });
}

/** True when the dataset is unchanged since the analysis was run. */
export function isCurrent(session: ProjectSession, summary: AnalysisSummary): boolean {
  try {
    return session.snapshotIdOf(summary.datasetId) === summary.snapshotId;
  } catch {
    return false;
  }
}

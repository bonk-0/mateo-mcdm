import {
  setWeight,
  sweepValues,
  type DecisionMatrix,
  type RankedAlternative,
  type TextRef,
  type WeightRedistribution,
} from '@mateo/engine';
import type { JsonValue, ProjectSettings, StoredAnalysis } from '@mateo/project';
import { isRankingMethod } from './registry';
import {
  executeResultJob,
  type ParameterValues,
  type ResultOutcome,
  type RunJob,
} from './runnerCore';

/**
 * Runs one job and returns its result. The page passes the worker runner, tests pass
 * `executeResultJob`. A scenario only needs the ranking, so the trace is not sent back.
 */
export type JobRunner = (job: RunJob) => Promise<ResultOutcome> | ResultOutcome;

/** What a sensitivity analysis varies: a MARCOS run with crisp weights. */
export interface SensitivityBase {
  readonly methodId: string;
  readonly matrix: DecisionMatrix<unknown>;
  readonly criterionIds: readonly string[];
  readonly criterionNames: readonly TextRef[];
  readonly alternativeIds: readonly string[];
  readonly alternativeNames: readonly TextRef[];
  /** The weights of the analysis, in the order of `criterionIds`. */
  readonly weights: readonly number[];
  readonly parameters: ParameterValues;
}

export type BaseResult =
  | { readonly ok: true; readonly base: SensitivityBase }
  | { readonly ok: false; readonly reason: 'not-ranking' | 'unreadable' | 'fuzzy-weights' };

/**
 * Reads what a stored MARCOS analysis was run with. Sensitivity needs crisp weights; the
 * weights of a Fuzzy MARCOS run may be TFNs, which the sliders cannot express.
 */
export function baseOfAnalysis(analysis: StoredAnalysis): BaseResult {
  if (!isRankingMethod(analysis.methodId)) return { ok: false, reason: 'not-ranking' };
  const input = analysis.methodInput as {
    matrix?: DecisionMatrix<unknown>;
    weights?: { numberType?: string; entries?: { criterionId: string; value: unknown }[] };
  } | null;
  if (!input?.matrix || !input.weights?.entries) return { ok: false, reason: 'unreadable' };
  if (input.weights.numberType !== 'crisp') return { ok: false, reason: 'fuzzy-weights' };
  const byId = new Map(input.weights.entries.map((entry) => [entry.criterionId, entry.value]));
  const weights = input.matrix.criteria.map((criterion) => byId.get(criterion.id));
  if (!weights.every((value): value is number => typeof value === 'number')) {
    return { ok: false, reason: 'unreadable' };
  }
  return {
    ok: true,
    base: {
      methodId: analysis.methodId,
      matrix: input.matrix,
      criterionIds: input.matrix.criteria.map((criterion) => criterion.id),
      criterionNames: input.matrix.criteria.map((criterion) => criterion.name),
      alternativeIds: input.matrix.alternatives.map((alternative) => alternative.id),
      alternativeNames: input.matrix.alternatives.map((alternative) => alternative.name),
      weights,
      parameters: analysis.record.parameters,
    },
  };
}

/** The engine job for the base analysis with other weights. */
export function jobWithWeights(base: SensitivityBase, weights: readonly number[]): RunJob {
  return {
    methodId: base.methodId,
    input: {
      matrix: base.matrix,
      weights: {
        numberType: 'crisp',
        entries: base.criterionIds.map((criterionId, index) => ({
          criterionId,
          value: weights[index] as number,
        })),
      },
    },
    parameters: base.parameters,
  };
}

/** Rank and score of every alternative, in the order of `base.alternativeIds`. */
export interface Ranking {
  readonly ranks: readonly number[];
  readonly scores: readonly number[];
}

function isRankedList(value: unknown): value is readonly RankedAlternative[] {
  return Array.isArray(value);
}

/** Runs the method with the weights; `null` when the engine rejects them (for example a zero sum). */
export async function rankWithWeights(
  base: SensitivityBase,
  weights: readonly number[],
  run: JobRunner = executeResultJob,
): Promise<Ranking | null> {
  const outcome = await run(jobWithWeights(base, weights));
  if (!outcome.ok) return null;
  const list = (outcome.result as { ranking?: unknown }).ranking;
  if (!isRankedList(list)) return null;
  const byId = new Map(list.map((entry) => [entry.alternativeId, entry]));
  const entries = base.alternativeIds.map((id) => byId.get(id));
  if (entries.some((entry) => entry === undefined)) return null;
  return {
    ranks: entries.map((entry) => entry!.rank),
    scores: entries.map((entry) => entry!.score),
  };
}

export interface SweepPoint {
  /** The weight of the varied criterion. */
  readonly weight: number;
  /** The weights of all criteria at this point. */
  readonly weights: readonly number[];
  /** `null` where the engine could not run. */
  readonly ranking: Ranking | null;
}

export const SWEEP_POINTS = 11;

/**
 * One-at-a-time scenario: the weight of one criterion goes from `from` to `to`, the rest is
 * redistributed, and the engine runs at every point. Every number of the chart is an engine
 * run; nothing is interpolated.
 */
export async function sweepCriterion(params: {
  readonly base: SensitivityBase;
  readonly criterionIndex: number;
  readonly redistribution: WeightRedistribution;
  readonly from?: number;
  readonly to?: number;
  readonly points?: number;
  readonly run?: JobRunner;
  readonly isCancelled?: () => boolean;
}): Promise<SweepPoint[]> {
  const { base, criterionIndex, redistribution } = params;
  const values = sweepValues(params.from ?? 0, params.to ?? 1, params.points ?? SWEEP_POINTS);
  const result: SweepPoint[] = [];
  for (const weight of values) {
    if (params.isCancelled?.()) break;
    const weights = setWeight(base.weights, criterionIndex, weight, redistribution);
    result.push({ weight, weights, ranking: await rankWithWeights(base, weights, params.run) });
  }
  return result;
}

// --- Saved scenarios ----------------------------------------------------------------------

/** A named set of weights saved in the project, with the ranking they gave. */
export interface SavedScenario {
  readonly id: string;
  readonly name: string;
  readonly createdAt: string;
  readonly redistribution: WeightRedistribution;
  /** Weight by criterion id. */
  readonly weights: Readonly<Record<string, number>>;
  /** Rank and score by alternative id, as the engine gave them. */
  readonly ranking: Readonly<Record<string, { readonly rank: number; readonly score: number }>>;
}

const SETTING_PREFIX = 'sensitivity.scenarios.';

/** The project setting that holds the scenarios of one decision problem. */
export function scenariosKey(datasetId: string): string {
  return `${SETTING_PREFIX}${datasetId}`;
}

function isScenario(value: unknown): value is SavedScenario {
  if (value === null || typeof value !== 'object') return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item['id'] === 'string' &&
    typeof item['name'] === 'string' &&
    typeof item['weights'] === 'object' &&
    item['weights'] !== null &&
    typeof item['ranking'] === 'object' &&
    item['ranking'] !== null
  );
}

/** The saved scenarios of a decision problem, oldest first. Malformed entries are skipped. */
export function readScenarios(settings: ProjectSettings, datasetId: string): SavedScenario[] {
  const value = settings[scenariosKey(datasetId)];
  return Array.isArray(value) ? value.filter(isScenario) : [];
}

export function scenariosValue(scenarios: readonly SavedScenario[]): JsonValue | undefined {
  return scenarios.length === 0 ? undefined : (scenarios as unknown as JsonValue);
}

export function makeScenario(params: {
  readonly id: string;
  readonly name: string;
  readonly createdAt: string;
  readonly base: SensitivityBase;
  readonly weights: readonly number[];
  readonly ranking: Ranking;
  readonly redistribution: WeightRedistribution;
}): SavedScenario {
  const { base } = params;
  return {
    id: params.id,
    name: params.name,
    createdAt: params.createdAt,
    redistribution: params.redistribution,
    weights: Object.fromEntries(
      base.criterionIds.map((id, i) => [id, params.weights[i] as number]),
    ),
    ranking: Object.fromEntries(
      base.alternativeIds.map((id, i) => [
        id,
        { rank: params.ranking.ranks[i] as number, score: params.ranking.scores[i] as number },
      ]),
    ),
  };
}

/** The scenario's weights in the order of the base criteria; `null` if a criterion is missing. */
export function scenarioWeights(base: SensitivityBase, scenario: SavedScenario): number[] | null {
  const weights = base.criterionIds.map((id) => scenario.weights[id]);
  return weights.every((value): value is number => typeof value === 'number') ? weights : null;
}

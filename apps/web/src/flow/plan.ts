import { crispWeights, textLiteral, type WeightVector } from '@mateo/engine';
import type { TFN } from '@mateo/fuzzy';
import type { Dataset, LinguisticScale, StoredAnalysis } from '@mateo/project';
import { samplePreset } from '../library/samples';
import type { AnalysisConfiguration, WeightSource } from '../workspace/analyses';
import {
  buildCrispMatrix,
  buildTfnMatrix,
  type DatasetProblem,
  type FuzzyModel,
} from '../workspace/engineInput';
import { workspaceRegistry } from '../workspace/registry';
import type { ParameterValues, RunJob } from '../workspace/runnerCore';
import type { WeightChoice } from './state';

/** A calculation to run and store, with what is stored next to it. */
export interface RunPlan {
  readonly job: RunJob;
  readonly numberType: 'crisp' | 'tfn';
  readonly configuration: AnalysisConfiguration;
}

export type AnyWeights = WeightVector | WeightVector<TFN>;

export type WeightPlan =
  | { readonly kind: 'run'; readonly run: RunPlan }
  | { readonly kind: 'direct'; readonly weights: AnyWeights; readonly source: WeightSource }
  /** The person has not answered everything yet; nothing is wrong. */
  | { readonly kind: 'incomplete' }
  | { readonly kind: 'problems'; readonly problems: readonly DatasetProblem[] };

/** Accepts `0.25` and `0,25`. */
export function parseNumber(text: string): number | null {
  const trimmed = text.trim().replace(',', '.');
  if (trimmed === '') return null;
  const value = Number(trimmed);
  return Number.isFinite(value) ? value : null;
}

export function defaultParameters(methodId: string): ParameterValues {
  return Object.fromEntries(
    Object.entries(workspaceRegistry().get(methodId).parameters).map(([name, definition]) => [
      name,
      definition.default,
    ]),
  );
}

function criterionName(dataset: Dataset, id: string): string {
  const criterion = dataset.criteria.find((item) => item.id === id);
  return criterion ? criterion.name || criterion.code : id;
}

/** The weighting method the choice runs, if it runs one. */
export function weightingMethodOf(choice: WeightChoice): string | null {
  switch (choice.mode) {
    case 'data':
      return choice.dataMethod;
    case 'order':
      return choice.linguistic ? 'fuzzy-swara' : 'swara';
    default:
      return null;
  }
}

/** What it takes to get the weights the person chose. */
export function planWeights(dataset: Dataset, choice: WeightChoice): WeightPlan {
  const matrixId = dataset.matrices[0]?.id ?? '';
  const ids = dataset.criteria.map((criterion) => criterion.id);
  if (dataset.criteria.length < 2) return { kind: 'problems', problems: [{ code: 'too-small' }] };

  switch (choice.mode) {
    case 'sample': {
      const preset = choice.sampleId ? samplePreset(choice.sampleId) : undefined;
      const values = preset?.weights;
      if (!preset || !values || values.length !== ids.length) return { kind: 'incomplete' };
      const fuzzy = typeof values[0] === 'object';
      const weights: AnyWeights = fuzzy
        ? {
            numberType: 'tfn',
            entries: ids.map((criterionId, index) => ({
              criterionId,
              value: values[index] as TFN,
            })),
          }
        : crispWeights(ids, values as number[]);
      return { kind: 'direct', weights, source: { source: 'sample', sampleId: preset.sampleId } };
    }
    case 'manual': {
      const parsed = ids.map((id) => parseNumber(choice.manual[id] ?? ''));
      if (parsed.some((value) => value === null || value < 0)) return { kind: 'incomplete' };
      const values = parsed as number[];
      if (values.reduce((sum, value) => sum + value, 0) <= 0) return { kind: 'incomplete' };
      return { kind: 'direct', weights: crispWeights(ids, values), source: { source: 'manual' } };
    }
    case 'order': {
      const criteria = choice.order.map((id) => ({
        id,
        name: textLiteral(criterionName(dataset, id)),
      }));
      let input: unknown;
      if (choice.linguistic) {
        const assessments = choice.order.map((id, index) =>
          index === 0 ? null : choice.terms[id] || null,
        );
        if (assessments.some((value, index) => index > 0 && value === null)) {
          return { kind: 'incomplete' };
        }
        input = { criteria, assessments };
      } else {
        const importance = choice.order.map((id, index) =>
          index === 0 ? null : parseNumber(choice.importance[id] ?? ''),
        );
        if (importance.some((value, index) => index > 0 && value === null)) {
          return { kind: 'incomplete' };
        }
        input = { criteria, comparativeImportance: importance };
      }
      const methodId = choice.linguistic ? 'fuzzy-swara' : 'swara';
      return {
        kind: 'run',
        run: {
          job: { methodId, input, parameters: defaultParameters(methodId) },
          numberType: choice.linguistic ? 'tfn' : 'crisp',
          configuration: {
            workspace: 'weighting',
            matrixId,
            fuzzyModel: choice.linguistic ? 'tfn' : 'classical',
          },
        },
      };
    }
    case 'data': {
      const built = buildCrispMatrix(dataset, matrixId);
      if (!built.ok) return { kind: 'problems', problems: built.problems };
      return {
        kind: 'run',
        run: {
          job: {
            methodId: choice.dataMethod,
            input: { matrix: built.matrix },
            parameters: defaultParameters(choice.dataMethod),
          },
          numberType: 'crisp',
          configuration: { workspace: 'weighting', matrixId, fuzzyModel: 'classical' },
        },
      };
    }
  }
}

/** The weights a stored weighting analysis found. */
export function weightsOf(analysis: StoredAnalysis): AnyWeights | null {
  const result = analysis.record.result as { weights?: AnyWeights } | undefined;
  return result?.weights ?? null;
}

/** The weights as plain shares for bars: a TFN shows its middle value. */
export function weightShares(weights: AnyWeights): Map<string, number> {
  const values = weights.entries.map((entry) =>
    typeof entry.value === 'number' ? entry.value : entry.value.m,
  );
  const total = values.reduce((sum, value) => sum + value, 0);
  return new Map(
    weights.entries.map((entry, index) => [
      entry.criterionId,
      total > 0 ? (values[index] as number) / total : 0,
    ]),
  );
}

function sumsToOne(weights: AnyWeights): boolean {
  if (weights.numberType !== 'crisp') return true;
  const total = (weights as WeightVector).entries.reduce((sum, entry) => sum + entry.value, 0);
  return Math.abs(total - 1) < 1e-9;
}

export type RankingPlan =
  | { readonly kind: 'run'; readonly run: RunPlan }
  | { readonly kind: 'problems'; readonly problems: readonly DatasetProblem[] };

/**
 * MARCOS on the decision problem with the chosen weights. The fuzzy model is used when the
 * data holds fuzzy numbers or terms, or the weights are fuzzy; plain numbers use the
 * classical model. Weights that do not add up to 1 (typed by hand) are normalized, which
 * leaves the ranking unchanged.
 */
export function planRanking(
  dataset: Dataset,
  scales: readonly LinguisticScale[],
  weights: AnyWeights,
  source: WeightSource,
  fuzzyData: boolean,
): RankingPlan {
  const matrixId = dataset.matrices[0]?.id ?? '';
  const fuzzyModel: FuzzyModel = fuzzyData || weights.numberType === 'tfn' ? 'tfn' : 'classical';
  const built =
    fuzzyModel === 'classical'
      ? buildCrispMatrix(dataset, matrixId)
      : buildTfnMatrix(dataset, scales, matrixId);
  if (!built.ok) return { kind: 'problems', problems: built.problems };
  const methodId = fuzzyModel === 'classical' ? 'marcos' : 'fuzzy-marcos';
  const parameters = defaultParameters(methodId);
  return {
    kind: 'run',
    run: {
      job: {
        methodId,
        input: { matrix: built.matrix, weights },
        parameters:
          'normalizeWeights' in parameters && !sumsToOne(weights)
            ? { ...parameters, normalizeWeights: true }
            : parameters,
      },
      numberType: fuzzyModel === 'classical' ? 'crisp' : 'tfn',
      configuration: { workspace: 'ranking', matrixId, fuzzyModel, weights: source },
    },
  };
}

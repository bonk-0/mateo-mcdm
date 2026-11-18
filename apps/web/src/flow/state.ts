import type { Dataset } from '@mateo/project';
import type { SampleId } from '../library/samples';
import { useCallback } from 'react';
import { create } from 'zustand';

/**
 * How the criteria get their weights, in the person's words:
 * - `data`: computed from the decision matrix (CRITIC or MEREC).
 * - `order`: the person ranks the criteria and says how much more each one matters (SWARA;
 *   with linguistic terms, Fuzzy SWARA).
 * - `manual`: the person types the weights.
 * - `sample`: the weights printed in the paper of a Method Library sample.
 */
export type WeightMode = 'data' | 'order' | 'manual' | 'sample';
export type DataMethod = 'critic' | 'merec';

export interface WeightChoice {
  readonly mode: WeightMode;
  readonly dataMethod: DataMethod;
  /** Criterion ids, most important first. */
  readonly order: readonly string[];
  /** Ordered mode: answer the comparisons with linguistic terms (Fuzzy SWARA). */
  readonly linguistic: boolean;
  /** SWARA comparative importance per criterion id, as typed. */
  readonly importance: Readonly<Record<string, string>>;
  /** Fuzzy SWARA term id per criterion id. */
  readonly terms: Readonly<Record<string, string>>;
  /** Manual weight per criterion id, as typed. */
  readonly manual: Readonly<Record<string, string>>;
  /** The Method Library sample whose paper weights `sample` mode uses. */
  readonly sampleId?: SampleId;
}

export const DEFAULT_CHOICE: WeightChoice = {
  mode: 'data',
  dataMethod: 'critic',
  order: [],
  linguistic: false,
  importance: {},
  terms: {},
  manual: {},
};

interface FlowState {
  /** The decision problem the three steps work on. `null`: the project's first one. */
  readonly datasetId: string | null;
  readonly choices: Readonly<Record<string, WeightChoice>>;
  setDataset: (id: string | null) => void;
  setChoice: (datasetId: string, patch: Partial<WeightChoice>) => void;
}

/**
 * What the person chose along the decision path. It lives for the session of the app: the
 * results themselves are stored in the project, and a reopened project starts again from
 * the recommended choice.
 */
export const useFlowState = create<FlowState>()((set) => ({
  datasetId: null,
  choices: {},
  setDataset: (datasetId) => set({ datasetId }),
  setChoice: (datasetId, patch) =>
    set((state) => ({
      choices: {
        ...state.choices,
        [datasetId]: { ...(state.choices[datasetId] ?? DEFAULT_CHOICE), ...patch },
      },
    })),
}));

/** The open decision problem of `datasets`: the chosen one, else the first. */
export function activeDataset(
  datasets: readonly Dataset[],
  datasetId: string | null,
): Dataset | undefined {
  return datasets.find((item) => item.id === datasetId) ?? datasets[0];
}

/**
 * The order of the criteria for ranking: the person's order, without criteria removed since
 * and with criteria added since at the end.
 */
export function orderedCriteria(dataset: Dataset, order: readonly string[]): string[] {
  const ids = dataset.criteria.map((criterion) => criterion.id);
  const kept = order.filter((id) => ids.includes(id));
  return [...kept, ...ids.filter((id) => !kept.includes(id))];
}

/** The weight choice of a decision problem, with its order kept in step with the criteria. */
export function useWeightChoice(
  dataset: Dataset,
): [WeightChoice, (patch: Partial<WeightChoice>) => void] {
  const stored = useFlowState((state) => state.choices[dataset.id]);
  const setChoice = useFlowState((state) => state.setChoice);
  const choice = stored ?? DEFAULT_CHOICE;
  const update = useCallback(
    (patch: Partial<WeightChoice>) => setChoice(dataset.id, patch),
    [setChoice, dataset.id],
  );
  return [{ ...choice, order: orderedCriteria(dataset, choice.order) }, update];
}

/**
 * Whether the data needs the fuzzy model: a fuzzy criterion, or a fuzzy number or a
 * linguistic term in a cell. Plain numbers alone use the classical model.
 */
export function needsFuzzyModel(dataset: Dataset): boolean {
  if (dataset.criteria.some((criterion) => criterion.numberType === 'tfn')) return true;
  return dataset.matrices.some((matrix) =>
    Object.values(matrix.cells).some((row) =>
      Object.values(row).some((cell) => cell !== undefined && cell.kind !== 'crisp'),
    ),
  );
}

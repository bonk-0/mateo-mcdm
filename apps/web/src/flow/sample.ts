import type { Dataset } from '@mateo/project';
import { useEffect } from 'react';
import { useSearchParams } from 'react-router';
import { presetFor } from '../library/preset';
import type { WorkspacePreset } from '../library/samples';
import { useFlowState, type WeightChoice } from './state';

/** The weight choice that reproduces a sample's paper. */
function choiceOf(dataset: Dataset, preset: WorkspacePreset): Partial<WeightChoice> {
  const byCriterion = <T>(values: readonly (T | null)[] | undefined) =>
    Object.fromEntries(
      dataset.criteria.flatMap((criterion, index) => {
        const value = values?.[index];
        return value === null || value === undefined ? [] : [[criterion.id, String(value)]];
      }),
    );
  switch (preset.methodId) {
    case 'critic':
    case 'merec':
      return { mode: 'data', dataMethod: preset.methodId };
    case 'swara':
      return {
        mode: 'order',
        linguistic: false,
        order: dataset.criteria.map((criterion) => criterion.id),
        importance: byCriterion(preset.importance),
      };
    case 'fuzzy-swara':
      return {
        mode: 'order',
        linguistic: true,
        order: dataset.criteria.map((criterion) => criterion.id),
        terms: byCriterion(preset.terms),
      };
    default:
      return preset.weights ? { mode: 'sample', sampleId: preset.sampleId } : {};
  }
}

/** Samples whose answers were filled in, so a later change by the person is kept. */
const applied = new Set<string>();

/**
 * The Method Library sample the steps were opened with (`?sample=`), if it belongs to this
 * decision problem. Its answers are filled in once.
 */
export function useSamplePreset(dataset: Dataset): WorkspacePreset | undefined {
  const [search] = useSearchParams();
  const preset = presetFor(search, dataset);
  const setChoice = useFlowState((state) => state.setChoice);
  useEffect(() => {
    if (!preset || applied.has(dataset.id)) return;
    applied.add(dataset.id);
    setChoice(dataset.id, choiceOf(dataset, preset));
  }, [preset, dataset, setChoice]);
  return preset;
}

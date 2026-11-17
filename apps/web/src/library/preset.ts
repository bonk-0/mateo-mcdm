import type { Dataset } from '@mateo/project';
import { isSampleId, sampleDatasetId, samplePreset, type WorkspacePreset } from './samples';

/** Query parameter that tells a workspace it was opened from a Method Library sample. */
export const SAMPLE_PARAM = 'sample';
/** Query parameter that selects the decision problem of a workspace. */
export const DATASET_PARAM = 'dataset';

/**
 * The preset of the sample a workspace was opened with, or `undefined`. A preset only applies to
 * the sample's own decision problem: with another problem selected the workspace stays as it is.
 */
export function presetFor(search: URLSearchParams, dataset: Dataset): WorkspacePreset | undefined {
  const id = search.get(SAMPLE_PARAM);
  if (!isSampleId(id) || dataset.id !== sampleDatasetId(id)) return undefined;
  return samplePreset(id);
}

/** The address of a workspace opened with a sample. */
export function sampleAddress(route: string, id: string, datasetId: string): string {
  const params = new URLSearchParams({ [SAMPLE_PARAM]: id, [DATASET_PARAM]: datasetId });
  return `${route}?${params.toString()}`;
}

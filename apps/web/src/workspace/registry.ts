import { createMethodRegistry, type MethodRegistry } from '@mateo/engine';
import {
  bwmMethod,
  criticMethod,
  fucomMethod,
  fuzzyMarcosMethod,
  fuzzySwaraMethod,
  lopcowMethod,
  marcosMethod,
  merecMethod,
  swaraMethod,
} from '@mateo/methods';

/** Ids of the methods the Phase 1 workspaces run. */
export const WEIGHTING_METHOD_IDS = ['critic', 'merec', 'swara', 'fuzzy-swara'] as const;
export const RANKING_METHOD_IDS = ['marcos', 'fuzzy-marcos'] as const;

export type WeightingMethodId = (typeof WEIGHTING_METHOD_IDS)[number];
export type RankingMethodId = (typeof RANKING_METHOD_IDS)[number];

let registry: MethodRegistry | undefined;

/**
 * Every method the app can run, created on first use in the page and in the worker alike.
 * The workspaces offer the ids above; LOPCOW, FUCOM and BWM get their workspaces in P2.7.
 */
export function workspaceRegistry(): MethodRegistry {
  registry ??= createMethodRegistry([
    criticMethod,
    merecMethod,
    swaraMethod,
    fuzzySwaraMethod,
    lopcowMethod,
    fucomMethod,
    bwmMethod,
    marcosMethod,
    fuzzyMarcosMethod,
  ]);
  return registry;
}

export function isWeightingMethod(id: string): id is WeightingMethodId {
  return (WEIGHTING_METHOD_IDS as readonly string[]).includes(id);
}

export function isRankingMethod(id: string): id is RankingMethodId {
  return (RANKING_METHOD_IDS as readonly string[]).includes(id);
}

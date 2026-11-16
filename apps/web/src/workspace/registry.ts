import { createMethodRegistry, type MethodRegistry } from '@mateo/engine';
import {
  criticMethod,
  fuzzyMarcosMethod,
  fuzzySwaraMethod,
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

/** The methods of Phase 1. Created on first use, in the page and in the worker alike. */
export function workspaceRegistry(): MethodRegistry {
  registry ??= createMethodRegistry([
    criticMethod,
    merecMethod,
    swaraMethod,
    fuzzySwaraMethod,
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

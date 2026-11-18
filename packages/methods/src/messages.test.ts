/**
 * Every i18n key the methods emit (step names and explanations, row and column labels,
 * parameter labels, validation messages) has an English and a Turkish text with the same
 * placeholders.
 */
import type { ParameterSchema, Trace } from '@mateo/engine';
import { crispWeights, isTextKey, messageKeyForCode, runMethod } from '@mateo/engine';
import { describe, expect, it } from 'vitest';
import marcosFixture from '../marcos/fixtures/damjanovic-2022-s1.json';
import fuzzyFixture from '../fuzzy-marcos/fixtures/stankovic-2020.json';
import type { MethodsMessageKey } from './index';
import { loadHighsSolver } from '@mateo/solver';
import bwmFixture from '../bwm/fixtures/rezaei-car.json';
import fucomFixture from '../fucom/fixtures/pamucar-2018-example-2.json';
import lopcowFixture from '../lopcow/fixtures/biswas-2024.json';
import {
  BWM_ISSUE_CODES,
  CRITIC_ISSUE_CODES,
  FUCOM_ISSUE_CODES,
  LOPCOW_ISSUE_CODES,
  FUZZY_MARCOS_ISSUE_CODES,
  FUZZY_SWARA_ISSUE_CODES,
  MARCOS_ISSUE_CODES,
  MEREC_ISSUE_CODES,
  SWARA_ISSUE_CODES,
  METHODS_MESSAGES,
  bwmMethod,
  criticMethod,
  fucomMethod,
  lopcowMethod,
  fuzzyMarcosMethod,
  fuzzySwaraMethod,
  marcosMethod,
  merecMethod,
  swaraMethod,
} from './index';
import criticFixture from '../critic/fixtures/diakoulaki-1995.json';
import merecFixture from '../merec/fixtures/keshavarz-ghorabaee-2021.json';
import swaraFixture from '../swara/fixtures/kersuliene-2010.json';
import imfFixture from '../swara/fixtures/imf-swara-damjanovic-2022-s1.json';
import { crispInput, crispMatrixInput, orderedCriteria, tfnInput } from './testing/inputs';

const known = new Set(Object.keys(METHODS_MESSAGES.en));

function traceKeys(trace: Trace): string[] {
  const keys = new Set<string>();
  for (const step of trace.steps) {
    keys.add(step.nameKey);
    keys.add(step.explanationKey);
    for (const row of step.output.cells) {
      for (const cell of row) {
        if (cell.derivation.kind === 'empty' && cell.derivation.reasonKey !== undefined) {
          keys.add(cell.derivation.reasonKey);
        }
      }
    }
    for (const item of [...step.output.rows, ...step.output.columns]) {
      if (isTextKey(item.label)) keys.add(item.label.key);
    }
    for (const formula of step.formulas) {
      if (formula.condition !== undefined && isTextKey(formula.condition)) {
        keys.add(formula.condition.key);
      }
    }
  }
  return [...keys].filter((key) => key !== 'trace.axis.weight'); // engine key
}

describe('method messages', () => {
  it('has the same keys and placeholders in English and Turkish', () => {
    // Arguments only (`{name}`, `{name, type...}`), not the branches of a select.
    const placeholders = (text: string) =>
      [...text.matchAll(/\{\s*(\w+)\s*[,}]/g)].map((match) => match[1]).sort();
    expect(Object.keys(METHODS_MESSAGES.tr).sort()).toEqual(
      Object.keys(METHODS_MESSAGES.en).sort(),
    );
    for (const key of Object.keys(METHODS_MESSAGES.en) as MethodsMessageKey[]) {
      expect(placeholders(METHODS_MESSAGES.tr[key]), key).toEqual(
        placeholders(METHODS_MESSAGES.en[key]),
      );
    }
  });

  it('covers every issue code', () => {
    for (const code of [
      ...Object.values(MARCOS_ISSUE_CODES),
      ...Object.values(FUZZY_MARCOS_ISSUE_CODES),
      ...Object.values(CRITIC_ISSUE_CODES),
      ...Object.values(MEREC_ISSUE_CODES),
      ...Object.values(SWARA_ISSUE_CODES),
      ...Object.values(FUZZY_SWARA_ISSUE_CODES),
      ...Object.values(LOPCOW_ISSUE_CODES),
      ...Object.values(FUCOM_ISSUE_CODES),
      ...Object.values(BWM_ISSUE_CODES),
    ]) {
      expect(known.has(messageKeyForCode(code)), code).toBe(true);
    }
  });

  it('covers every key of the method definitions and their traces', async () => {
    const solver = await loadHighsSolver();
    const bwmInput = {
      criteria: orderedCriteria(bwmFixture.input.criteria.map((c) => ({ id: c.id, name: c.id }))),
      best: bwmFixture.input.best,
      worst: bwmFixture.input.worst,
      bestToOthers: bwmFixture.input.bestToOthers,
      othersToWorst: bwmFixture.input.othersToWorst,
    };
    const ranked = orderedCriteria(fucomFixture.input.ranking.map((id) => ({ id, name: id })));
    const traces = [
      runMethod(lopcowMethod, crispMatrixInput(lopcowFixture.input)).trace,
      runMethod(fucomMethod, {
        criteria: ranked,
        priorities: { kind: 'significance', values: fucomFixture.input.significance },
      }).trace,
      runMethod(fucomMethod, {
        criteria: ranked,
        priorities: { kind: 'comparative', values: [2, 1, 1, 3] },
      }).trace,
      ...(['nonlinear', 'linear'] as const).map(
        (model) => runMethod(bwmMethod, bwmInput, { model }, { solver }).trace,
      ),
      runMethod(marcosMethod, crispInput(marcosFixture.input), { normalizeWeights: true }).trace,
      runMethod(fuzzyMarcosMethod, tfnInput(fuzzyFixture.input)).trace,
      runMethod(criticMethod, crispMatrixInput(criticFixture.input)).trace,
      runMethod(merecMethod, crispMatrixInput(merecFixture.input)).trace,
      runMethod(swaraMethod, {
        criteria: orderedCriteria(swaraFixture.input.criteria),
        comparativeImportance: swaraFixture.input.comparativeImportance,
      }).trace,
      ...(['graded-mean', 'centroid'] as const).map(
        (defuzzification) =>
          runMethod(
            fuzzySwaraMethod,
            {
              criteria: orderedCriteria(imfFixture.input.criteria),
              assessments: imfFixture.input.assessments,
            },
            { defuzzification },
          ).trace,
      ),
      runMethod(
        fuzzyMarcosMethod,
        {
          ...tfnInput(fuzzyFixture.input),
          weights: crispWeights(
            fuzzyFixture.input.criteria.map((c) => c.id),
            [1, 2, 3, 4, 5, 6],
          ),
        },
        { normalizeWeights: true },
      ).trace,
    ];
    const methods: readonly { nameKey: string; parameters: ParameterSchema }[] = [
      marcosMethod,
      fuzzyMarcosMethod,
      criticMethod,
      merecMethod,
      swaraMethod,
      fuzzySwaraMethod,
      lopcowMethod,
      fucomMethod,
      bwmMethod,
    ];
    const definitionKeys = methods.flatMap((method) => [
      method.nameKey,
      ...Object.values(method.parameters).flatMap((p) => [
        p.labelKey,
        ...(p.descriptionKey === undefined ? [] : [p.descriptionKey]),
        ...('options' in p ? p.options.map((o) => o.labelKey) : []),
      ]),
    ]);
    const used = [...new Set([...traces.flatMap(traceKeys), ...definitionKeys])];
    expect(used.filter((key) => !known.has(key))).toEqual([]);
    expect(used.length).toBeGreaterThan(50);
  });
});

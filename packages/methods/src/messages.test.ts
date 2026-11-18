/**
 * Every i18n key the methods emit (step names and explanations, row and column labels,
 * parameter labels, validation messages) has an English and a Turkish text with the same
 * placeholders.
 */
import type { ParameterSchema, Trace } from '@mateo/engine';
import { crispWeights, isTextKey, messageKeyForCode, runMethod, textLiteral } from '@mateo/engine';
import { describe, expect, it } from 'vitest';
import marcosFixture from '../marcos/fixtures/damjanovic-2022-s1.json';
import fuzzyFixture from '../fuzzy-marcos/fixtures/stankovic-2020.json';
import type { MethodsMessageKey } from './index';
import { loadHighsSolver } from '@mateo/solver';
import bwmFixture from '../bwm/fixtures/rezaei-car.json';
import fucomFixture from '../fucom/fixtures/pamucar-2018-example-2.json';
import dematelFixture from '../dematel/fixtures/chen-2018.json';
import lopcowFixture from '../lopcow/fixtures/biswas-2024.json';
import coprasFixture from '../copras/fixtures/podvezko-2011.json';
import fuzzyCoprasFixture from '../copras/fixtures/yazdani-2011-fuzzy.json';
import mooraFixture from '../moora/fixtures/brauers-2006.json';
import arasFixture from '../aras/fixtures/zavadskas-2010.json';
import {
  ARAS_ISSUE_CODES,
  BWM_ISSUE_CODES,
  COPRAS_ISSUE_CODES,
  FUZZY_ARAS_ISSUE_CODES,
  FUZZY_COPRAS_ISSUE_CODES,
  FUZZY_MOORA_ISSUE_CODES,
  MOORA_ISSUE_CODES,
  arasMethod,
  coprasMethod,
  fuzzyArasMethod,
  fuzzyCoprasMethod,
  fuzzyMooraMethod,
  mooraMethod,
  CRITIC_ISSUE_CODES,
  DEMATEL_ISSUE_CODES,
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
  dematelMethod,
  fucomMethod,
  fuzzyDematelMethod,
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
import {
  crispInput,
  crispMatrixInput,
  orderedCriteria,
  smallTfnMatrix,
  smallTfnWeights,
  smallWeights,
  tfnInput,
} from './testing/inputs';

const known = new Set(Object.keys(METHODS_MESSAGES.en));

const t = (l: number, m: number, u: number) => ({ l, m, u });

/** Traces of the fuzzy MOORA and ARAS-F variants, with every optional input present. */
function fuzzyFamilyTraces(): Trace[] {
  const matrix = smallTfnMatrix(
    [
      [t(2, 3, 4), t(1, 2, 3)],
      [t(4, 6, 8), t(2, 3, 5)],
    ],
    ['benefit', 'cost'],
  );
  const tfnWeights = smallTfnWeights(t(0.2, 0.4, 0.6), t(0.1, 0.2, 0.3));
  const crispW = smallWeights(0.5, 0.5);
  const optimal = {
    numberType: 'tfn' as const,
    entries: [
      { criterionId: 'c1', value: t(5, 7, 9) },
      { criterionId: 'c2', value: t(1, 1, 2) },
    ],
  };
  return [
    runMethod(fuzzyMooraMethod, { matrix }).trace,
    ...(['ratio-system', 'reference-point'] as const).flatMap((rankBy) => [
      runMethod(fuzzyMooraMethod, { matrix, weights: tfnWeights }, { rankBy }).trace,
      runMethod(fuzzyMooraMethod, { matrix, weights: crispW }, { rankBy }).trace,
    ]),
    runMethod(fuzzyArasMethod, { matrix, weights: tfnWeights }).trace,
    runMethod(
      fuzzyArasMethod,
      { matrix, weights: crispW, optimal },
      { defuzzification: 'graded-mean' },
    ).trace,
  ];
}

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
      ...Object.values(COPRAS_ISSUE_CODES),
      ...Object.values(FUZZY_COPRAS_ISSUE_CODES),
      ...Object.values(MOORA_ISSUE_CODES),
      ...Object.values(FUZZY_MOORA_ISSUE_CODES),
      ...Object.values(ARAS_ISSUE_CODES),
      ...Object.values(FUZZY_ARAS_ISSUE_CODES),
      ...Object.values(DEMATEL_ISSUE_CODES),
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
    const dematelInput = {
      factors: dematelFixture.input.factors.map((id) => ({ id, name: textLiteral(id) })),
      relations: [dematelFixture.input.directRelation, dematelFixture.input.directRelation],
    };
    const fuzzyDematelInput = {
      ...dematelInput,
      relations: dematelInput.relations.map((m) =>
        m.map((row) => row.map((x) => ({ l: Math.max(x - 1, 0), m: x, u: x + 1 }))),
      ),
    };
    const traces = [
      runMethod(lopcowMethod, crispMatrixInput(lopcowFixture.input)).trace,
      runMethod(dematelMethod, { ...dematelInput, relations: [dematelInput.relations[0]!] }).trace,
      runMethod(dematelMethod, dematelInput, {
        normalization: 'max-row-sum',
        threshold: 'custom',
        weightBasis: 'distance',
      }).trace,
      ...(['centroid', 'graded-mean', 'cfcs'] as const).flatMap((defuzzification) => [
        runMethod(fuzzyDematelMethod, fuzzyDematelInput, { defuzzification }).trace,
        runMethod(
          fuzzyDematelMethod,
          {
            ...fuzzyDematelInput,
            relations: [fuzzyDematelInput.relations[0]!],
          },
          {
            defuzzification,
            normalization: 'max-row-sum',
            threshold: 'custom',
            weightBasis: 'distance',
          },
        ).trace,
      ]),
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
      runMethod(coprasMethod, crispInput(coprasFixture.input)).trace,
      ...(['centroid', 'graded-mean'] as const).map(
        (defuzzification) =>
          runMethod(
            fuzzyCoprasMethod,
            tfnInput(fuzzyCoprasFixture.input as Parameters<typeof tfnInput>[0]),
            { defuzzification },
          ).trace,
      ),
      runMethod(fuzzyCoprasMethod, {
        ...tfnInput(fuzzyCoprasFixture.input as Parameters<typeof tfnInput>[0]),
        weights: crispWeights(
          fuzzyCoprasFixture.input.criteria.map((c) => c.id),
          [1, 2, 3, 4, 5],
        ),
      }).trace,
      // MOORA and ARAS: with and without weights / the optimal alternative, both rankings.
      runMethod(mooraMethod, crispMatrixInput(mooraFixture.input)).trace,
      runMethod(mooraMethod, {
        ...crispMatrixInput(mooraFixture.input),
        weights: crispWeights(
          mooraFixture.input.criteria.map((c) => c.id),
          [1, 2, 3, 1, 2, 3, 1],
        ),
      }).trace,
      runMethod(arasMethod, crispInput(arasFixture.input)).trace,
      runMethod(arasMethod, {
        ...crispInput(arasFixture.input),
        optimal: crispWeights(
          arasFixture.input.criteria.map((c) => c.id),
          arasFixture.input.optimal,
        ),
      }).trace,
      ...fuzzyFamilyTraces(),
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
      coprasMethod,
      fuzzyCoprasMethod,
      mooraMethod,
      fuzzyMooraMethod,
      arasMethod,
      fuzzyArasMethod,
      marcosMethod,
      fuzzyMarcosMethod,
      criticMethod,
      merecMethod,
      swaraMethod,
      fuzzySwaraMethod,
      lopcowMethod,
      fucomMethod,
      bwmMethod,
      dematelMethod,
      fuzzyDematelMethod,
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

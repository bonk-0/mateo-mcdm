/**
 * Fuzzy COPRAS with triangular fuzzy numbers.
 *
 * Formulation: docs/methods/copras.md, from Yazdani, Alidoosti and Zavadskas (2011): every
 * TFN, the weights included, is defuzzified by its centroid (BNP) first, and crisp COPRAS
 * follows. Mateo shows the two stages as two explicit parts of the trace: the defuzzified
 * matrix and weights, then the steps of `copras` unchanged.
 *
 * Steps: initial fuzzy matrix → weights → defuzzified matrix → [defuzzified weights] →
 * the steps of COPRAS (column sums … ranking).
 */
import type {
  DecisionMatrix,
  Reference,
  StepHandle,
  ValidationCollector,
  WeightVector,
} from '@mateo/engine';
import {
  alignWeights,
  createTraceBuilder,
  createValidation,
  defineMethod,
  defineParameters,
  term,
} from '@mateo/engine';
import type { DefuzzificationId, TFN } from '@mateo/fuzzy';
import { checkTfnMatrix, defuzzify, encodeTfn, tfnOps } from '@mateo/fuzzy';
import { checkTfnOrCrispWeights, formula } from '../src/common';
import type { CoprasResult } from './copras';
import { addCoprasSteps, COPRAS_REFERENCES, validateCoprasCalculation } from './copras';

export const FUZZY_COPRAS_ID = 'fuzzy-copras';
export const FUZZY_COPRAS_VERSION = '1.0.0';

export const FUZZY_COPRAS_ISSUE_CODES = {
  /** The weights are neither crisp nor TFN. */
  unsupportedWeights: 'fuzzy-copras.unsupported-weights',
} as const;

/** TFN weights (the paper's case) or crisp weights, which need no defuzzification. */
export type FuzzyCoprasWeights = WeightVector<TFN> | WeightVector<number>;

export interface FuzzyCoprasInput {
  readonly matrix: DecisionMatrix<TFN>;
  readonly weights: FuzzyCoprasWeights;
}

export type FuzzyCoprasResult = CoprasResult;

const parameters = defineParameters({
  defuzzification: {
    type: 'enum',
    labelKey: 'methods.fuzzyCopras.parameters.defuzzification.label',
    descriptionKey: 'methods.fuzzyCopras.parameters.defuzzification.description',
    default: 'centroid',
    options: [
      { value: 'centroid', labelKey: 'methods.fuzzyCopras.parameters.defuzzification.centroid' },
      {
        value: 'graded-mean',
        labelKey: 'methods.fuzzyCopras.parameters.defuzzification.gradedMean',
      },
    ],
  },
});

export const FUZZY_COPRAS_REFERENCES: readonly Reference[] = [
  {
    id: 'yazdani2011',
    authors: ['Yazdani, M.', 'Alidoosti, A.', 'Zavadskas, E. K.'],
    year: 2011,
    title: 'Risk analysis of critical infrastructures using fuzzy COPRAS',
    source: 'Ekonomska istraživanja – Economic Research',
    volume: '24',
    issue: '4',
    pages: '27-40',
    doi: '10.1080/1331677X.2011.11517478',
    note: 'Section 3, Eqs. 5-17, and the worked example of Tables 4-7, used as the golden test. Defuzzification by the centroid (BNP) first, then crisp COPRAS.',
  },
  ...COPRAS_REFERENCES,
];

const key = (path: string): string => `methods.fuzzyCopras.${path}`;
const step = (id: string) => ({
  id,
  nameKey: key(`steps.${id}.name`),
  explanationKey: key(`steps.${id}.explanation`),
});

const isTfnWeights = (weights: FuzzyCoprasWeights): weights is WeightVector<TFN> =>
  weights.numberType === 'tfn';

function validateFuzzyCopras(
  input: FuzzyCoprasInput,
  defuzzification: DefuzzificationId,
  v: ValidationCollector,
): void {
  v.add(checkTfnMatrix(input?.matrix, { sign: 'non-negative', supportedNumberTypes: ['tfn'] }));
  if (v.hasErrors) return;
  const { matrix } = input;
  const criterionIds = matrix.criteria.map((criterion) => criterion.id);

  checkTfnOrCrispWeights(
    input.weights,
    criterionIds,
    FUZZY_COPRAS_ISSUE_CODES.unsupportedWeights,
    v,
  );
  if (v.hasErrors) return;

  const crispMatrix: DecisionMatrix<number> = {
    ...matrix,
    values: matrix.values.map((row) => row.map((value) => defuzzify(defuzzification, value))),
  };
  const crispWeights = alignWeights<TFN | number>(input.weights, criterionIds).map((w) =>
    typeof w === 'number' ? w : defuzzify(defuzzification, w as TFN),
  );
  validateCoprasCalculation(crispMatrix, crispWeights, v);
}

export const fuzzyCoprasMethod = defineMethod({
  id: FUZZY_COPRAS_ID,
  version: FUZZY_COPRAS_VERSION,
  category: 'ranking',
  nameKey: key('name'),
  supportedNumberTypes: ['tfn'],
  inputSchema: [
    { name: 'matrix', kind: 'decision-matrix', required: true, numberTypes: ['tfn'] },
    { name: 'weights', kind: 'weights', required: true, numberTypes: ['tfn', 'crisp'] },
  ],
  outputSchema: [
    { name: 'scores', kind: 'scores', numberTypes: ['crisp'] },
    { name: 'ranking', kind: 'ranking', numberTypes: ['crisp'] },
  ],
  parameters,
  references: FUZZY_COPRAS_REFERENCES,

  validate(input: FuzzyCoprasInput, params) {
    const v = createValidation();
    validateFuzzyCopras(input, params.defuzzification, v);
    return v.result();
  },

  run(input: FuzzyCoprasInput, params) {
    const { matrix } = input;
    const defuzzification: DefuzzificationId = params.defuzzification;
    const tb = createTraceBuilder({
      methodId: FUZZY_COPRAS_ID,
      methodVersion: FUZZY_COPRAS_VERSION,
    });

    const fuzzyMatrix = tb.inputMatrix<TFN>({
      ...step('initial-matrix'),
      matrix,
      encode: encodeTfn,
    });

    const weights = input.weights;
    const fuzzyWeights = isTfnWeights(weights)
      ? tb.inputWeights<TFN>({
          ...step('weights'),
          weights,
          criteria: matrix.criteria,
          encode: encodeTfn,
        })
      : undefined;
    const crispWeights = isTfnWeights(weights)
      ? undefined
      : tb.inputWeights<number>({ ...step('weights'), weights, criteria: matrix.criteria });

    // Stage 1: defuzzification of every rating ...
    const x = tb.table<number>({
      ...step('defuzzified-matrix'),
      formulas: [defuzzifyFormula(defuzzification, 'x', 'x_{ij}', String.raw`\tilde{x}_{ij}`)],
      rows: fuzzyMatrix.rows,
      columns: fuzzyMatrix.columns,
      visualization: { view: 'matrix', basedOn: fuzzyMatrix.id },
      cell: (row, column) =>
        tfnOps.defuzzify(defuzzification, term(fuzzyMatrix.cell(row.index, column.index), 'a')),
    });

    // ... and of every weight that is a TFN. Crisp weights are used as they are.
    const w: StepHandle<number> =
      fuzzyWeights === undefined
        ? (crispWeights as StepHandle<number>)
        : tb.rowVector<number>({
            ...step('defuzzified-weights'),
            formulas: [defuzzifyFormula(defuzzification, 'w', 'w_j', String.raw`\tilde{w}_j`)],
            items: fuzzyWeights.columns,
            row: fuzzyWeights.rows[0],
            cell: (column) =>
              tfnOps.defuzzify(defuzzification, term(fuzzyWeights.at(column.index), 'a')),
          });

    // Stage 2: crisp COPRAS on the defuzzified values.
    const result = addCoprasSteps(tb, x, w, matrix.criteria, matrix.alternatives);
    return { result, trace: tb.build() };
  },
});

function defuzzifyFormula(
  id: DefuzzificationId,
  result: string,
  resultLatex: string,
  tfnLatex: string,
) {
  const template =
    id === 'centroid'
      ? String.raw`{{${result}}} = \frac{ a^l + a^m + a^u }{3}, \; {{a}} = (a^l, a^m, a^u)`
      : String.raw`{{${result}}} = \frac{ a^l + 4 a^m + a^u }{6}, \; {{a}} = (a^l, a^m, a^u)`;
  return formula(`defuzzify-${id}`, template, [
    [result, resultLatex],
    ['a', tfnLatex],
  ]);
}

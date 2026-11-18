/**
 * What classical and fuzzy DEMATEL have in common: the options, the factor list, the
 * trace steps that follow the crisp prominence and relation (weights, threshold) and the
 * result of a run. Formulation: docs/methods/dematel.md.
 */
import type {
  EnumOption,
  Reference,
  StepHandle,
  TextParams,
  TraceAxisItem,
  Tracked,
  TraceBuilder,
  ValidationCollector,
  WeightVector,
} from '@mateo/engine';
import { crisp, crispWeights, defineParameters, ISSUE_CODES, parameter, term } from '@mateo/engine';
import { formula, quantity } from '../src/common';
import type { NamedCriterion } from '../src/criteria';

export const DEMATEL_ISSUE_CODES = {
  /** An expert matrix is not a square matrix with one row and column per factor. */
  relationShape: 'dematel.relation-shape',
  /** A factor is rated as influencing itself. A warning: the value is kept. */
  nonZeroDiagonal: 'dematel.non-zero-diagonal',
  /** The direct-relation matrix is all zeros, so there is nothing to normalize. */
  zeroMatrix: 'dematel.zero-matrix',
  /** I − X cannot be inverted: the series X + X² + … does not converge. */
  nearSingular: 'dematel.near-singular',
} as const;

/** Reference of the method and of the open-access paper whose example is the golden test. */
export const DEMATEL_REFERENCES: readonly Reference[] = [
  {
    id: 'gabus1972',
    authors: ['Gabus, A.', 'Fontela, E.'],
    year: 1972,
    title: 'World problems, an invitation to further thought within the framework of DEMATEL',
    source: 'Battelle Geneva Research Centre',
    note: 'Original report of the method (not available online; see chen2018 for the formulation).',
  },
  {
    id: 'chen2018',
    authors: ['Chen, C.-Y.', 'Tzeng, G.-H.', 'Huang, J.-J.'],
    year: 2018,
    title: 'Generalized DEMATEL technique with centrality measurements',
    source: 'Technological and Economic Development of Economy',
    volume: '24',
    issue: '2',
    pages: '600-614',
    doi: '10.3846/20294913.2016.1216471',
    note: 'Eqs. 1-4 and the classical case (α = 0) of Section 3: the formulation and the golden test.',
  },
];

export const DEMATEL_NORMALIZATIONS = ['max-row-or-column-sum', 'max-row-sum'] as const;
export type DematelNormalization = (typeof DEMATEL_NORMALIZATIONS)[number];

export const DEMATEL_THRESHOLDS = ['mean', 'custom'] as const;
export type DematelThreshold = (typeof DEMATEL_THRESHOLDS)[number];

export const DEMATEL_WEIGHT_BASES = ['prominence', 'distance'] as const;
export type DematelWeightBasis = (typeof DEMATEL_WEIGHT_BASES)[number];

const options = <O extends string>(
  prefix: string,
  values: readonly O[],
  keys: Readonly<Record<O, string>>,
): EnumOption<O>[] =>
  values.map((value) => ({
    value,
    labelKey: `methods.dematel.parameters.${prefix}.${keys[value]}`,
  }));

/** Options of both variants. Defaults: the classical form, the mean of T, D + R. */
export const DEMATEL_PARAMETERS = defineParameters({
  normalization: {
    type: 'enum',
    default: 'max-row-or-column-sum',
    labelKey: 'methods.dematel.parameters.normalization.label',
    descriptionKey: 'methods.dematel.parameters.normalization.description',
    options: options('normalization', DEMATEL_NORMALIZATIONS, {
      'max-row-or-column-sum': 'maxRowOrColumnSum',
      'max-row-sum': 'maxRowSum',
    }),
  },
  threshold: {
    type: 'enum',
    default: 'mean',
    labelKey: 'methods.dematel.parameters.threshold.label',
    descriptionKey: 'methods.dematel.parameters.threshold.description',
    options: options('threshold', DEMATEL_THRESHOLDS, { mean: 'mean', custom: 'custom' }),
  },
  customThreshold: {
    type: 'number',
    default: 0,
    min: 0,
    labelKey: 'methods.dematel.parameters.customThreshold.label',
    descriptionKey: 'methods.dematel.parameters.customThreshold.description',
  },
  weightBasis: {
    type: 'enum',
    default: 'prominence',
    labelKey: 'methods.dematel.parameters.weightBasis.label',
    descriptionKey: 'methods.dematel.parameters.weightBasis.description',
    options: options('weightBasis', DEMATEL_WEIGHT_BASES, {
      prominence: 'prominence',
      distance: 'distance',
    }),
  },
});

export interface DematelOptions {
  readonly normalization: DematelNormalization;
  readonly threshold: DematelThreshold;
  readonly customThreshold: number;
  readonly weightBasis: DematelWeightBasis;
}

/** Cause: D − R above the tolerance; effect: below it; neutral: within it. */
export type DematelGroup = 'cause' | 'effect' | 'neutral';

/** D − R within this of 0 is reported as neutral, not as the sign of a rounding error. */
export const RELATION_TOLERANCE = 1e-9;

export interface DematelEdge {
  /** The influencing factor. */
  readonly from: string;
  /** The influenced factor. */
  readonly to: string;
  /** The entry of the total-relation matrix. */
  readonly value: number;
}

/** Fields of the result that classical and fuzzy DEMATEL share (crisp numbers). */
export interface DematelCommonResult {
  /** The constant s that divides the direct-relation matrix. */
  readonly normalizationConstant: number;
  /** The total-relation matrix T (defuzzified for fuzzy DEMATEL), rows influence columns. */
  readonly totalRelation: readonly (readonly number[])[];
  /** The threshold that selects the relations of the cause-effect map. */
  readonly threshold: number;
  /** Off-diagonal entries of T that are at least the threshold. */
  readonly relations: readonly DematelEdge[];
  /** Weights from the prominence (see `weightBasis`), keyed by factor id. */
  readonly weights: WeightVector<number>;
}

export type DematelFactor = NamedCriterion;

export const key = (path: string): string => `methods.dematel.${path}`;
export const step = (id: string) => ({
  id,
  nameKey: key(`steps.${id}.name`),
  explanationKey: key(`steps.${id}.explanation`),
});

export function factorAxis(factors: readonly DematelFactor[]): TraceAxisItem[] {
  return factors.map(({ id, name }) => ({ id, label: name, kind: 'factor' }));
}

/** The factor list: at least two factors with distinct string ids. */
export function checkFactors(value: unknown, v: ValidationCollector): value is DematelFactor[] {
  const malformed = () =>
    v.error(ISSUE_CODES.inputMalformed, {
      params: { input: 'factors' },
      location: { input: 'factors' },
    });
  if (
    !Array.isArray(value) ||
    !value.every(
      (f) => typeof f === 'object' && f !== null && typeof (f as { id?: unknown }).id === 'string',
    )
  ) {
    malformed();
    return false;
  }
  if (value.length < 2) {
    v.error(ISSUE_CODES.matrixTooFewCriteria, {
      params: { count: value.length, min: 2 },
      location: { input: 'factors' },
    });
    return false;
  }
  const seen = new Set<string>();
  let unique = true;
  (value as DematelFactor[]).forEach((factor, index) => {
    if (seen.has(factor.id)) {
      unique = false;
      v.error(ISSUE_CODES.matrixDuplicateCriterion, {
        params: { id: factor.id },
        location: { input: 'factors', column: { index, id: factor.id } },
      });
    }
    seen.add(factor.id);
  });
  return unique;
}

/**
 * Checks that `relations` holds at least one n × n matrix per expert and hands every cell
 * to `checkCell`, which reports its problems and returns whether the cell is usable.
 * Returns true when every cell is usable.
 */
export function checkExpertMatrices(
  relations: unknown,
  factors: readonly DematelFactor[],
  v: ValidationCollector,
  checkCell: (
    cell: unknown,
    location: {
      input: string;
      row: { index: number; id: string };
      column: { index: number; id: string };
    },
  ) => boolean,
): boolean {
  const n = factors.length;
  if (!Array.isArray(relations) || relations.length === 0) {
    v.error(ISSUE_CODES.inputMalformed, {
      params: { input: 'relations' },
      location: { input: 'relations' },
    });
    return false;
  }
  let usable = true;
  relations.forEach((matrix: unknown, expert) => {
    const input = `relations[${expert}]`;
    if (!Array.isArray(matrix)) {
      usable = false;
      v.error(ISSUE_CODES.inputMalformed, { params: { input }, location: { input } });
      return;
    }
    const wrongRow = matrix.findIndex((row: unknown) => !Array.isArray(row) || row.length !== n);
    if (matrix.length !== n || wrongRow >= 0) {
      usable = false;
      v.error(DEMATEL_ISSUE_CODES.relationShape, {
        params: { expert: expert + 1, order: n },
        location: { input },
      });
      return;
    }
    (matrix as unknown[][]).forEach((row, i) =>
      row.forEach((cell, j) => {
        const location = {
          input,
          row: { index: i, id: (factors[i] as DematelFactor).id },
          column: { index: j, id: (factors[j] as DematelFactor).id },
        };
        if (!checkCell(cell, location)) usable = false;
      }),
    );
  });
  return usable;
}

export function warnDiagonal(
  v: ValidationCollector,
  factors: readonly DematelFactor[],
  expert: number,
  index: number,
): void {
  const id = (factors[index] as DematelFactor).id;
  v.warning(DEMATEL_ISSUE_CODES.nonZeroDiagonal, {
    params: { id, expert: expert + 1 },
    location: {
      input: `relations[${expert}]`,
      row: { index, id },
      column: { index, id },
    },
  });
}

// ------------------------------------------------------------------ steps after D + R, D − R

export interface TailInput {
  readonly tb: TraceBuilder;
  readonly factors: readonly DematelFactor[];
  readonly options: DematelOptions;
  /** The crisp total-relation matrix (rows influence columns). */
  readonly total: StepHandle<number>;
  /** Crisp D + R (column 0) and D − R (column 1), one row per factor. */
  readonly prominenceRelation: StepHandle<number>;
}

export interface TailResult {
  readonly threshold: number;
  readonly relations: readonly DematelEdge[];
  readonly weights: WeightVector<number>;
}

const WEIGHT_BASIS_TERMS = [
  ['a', 'a_i'],
  ['p', 'D_i + R_i'],
  ['q', 'D_i - R_i'],
] as const;

/**
 * Weights from prominence, then the threshold of the cause-effect map. `prominence`:
 * w_i = (D_i + R_i) / Σ (D_k + R_k). `distance`: a_i = √((D_i + R_i)² + (D_i − R_i)²) and
 * w_i = a_i / Σ a_k, which also credits a factor for being a strong cause or effect.
 */
export function recordTail(input: TailInput): TailResult {
  const { tb, factors, options: opts, total, prominenceRelation: pr } = input;
  const items = factorAxis(factors);
  const ids = factors.map((factor) => factor.id);

  let basis: (index: number) => Tracked<number>;
  let basisSource: string;
  if (opts.weightBasis === 'distance') {
    const distance = tb.rowVector<number>({
      ...step('weight-basis'),
      formulas: [
        formula('distance', String.raw`{{a}} = \sqrt{ ({{p}})^2 + ({{q}})^2 }`, WEIGHT_BASIS_TERMS),
      ],
      items,
      row: quantity('a', key('rows.weightBasis')),
      cell: (column) =>
        crisp.sqrt(
          crisp.add(
            crisp.power(term(pr.cell(column.index, 0), 'p'), 2),
            crisp.power(term(pr.cell(column.index, 1), 'q'), 2),
          ),
        ),
    });
    basis = (index) => distance.at(index);
    basisSource = distance.id;
  } else {
    basis = (index) => pr.cell(index, 0);
    basisSource = pr.id;
  }

  const basisValues = items.map((_, index) => basis(index));
  const sum = tb.scalar<number>({
    ...step('weight-basis-sum'),
    formulas: [
      formula('sum', String.raw`{{S}} = \sum_{k=1}^{n} {{a}}`, [
        ['S', String.raw`\sum_{k} a_k`],
        ['a', 'a_k'],
      ]),
    ],
    value: crisp.sum(basisValues.map((value) => term(value, 'a'))),
  });
  const weights = tb.rowVector<number>({
    ...step('weights'),
    role: 'result',
    formulas: [
      formula('weight', String.raw`{{w}} = \frac{ {{a}} }{ {{S}} }`, [
        ['w', 'w_i'],
        ['a', 'a_i'],
        ['S', String.raw`\sum_{k} a_k`],
      ]),
    ],
    items,
    row: quantity('w', key('rows.weight')),
    visualization: { view: 'bars', basedOn: basisSource },
    cell: (column) => crisp.divide(term(basis(column.index), 'a'), term(sum.at(), 'S')),
  });

  const thresholdValue =
    opts.threshold === 'mean'
      ? crisp.mean(term(total.all(), 't'))
      : parameter('customThreshold', opts.customThreshold, 'alpha');
  const threshold = tb.scalar<number>({
    ...step('threshold'),
    explanationParams: { threshold: opts.threshold } satisfies TextParams,
    formulas: [
      formula('mean', String.raw`{{alpha}} = \frac{1}{n^2} \sum_{i=1}^{n} \sum_{j=1}^{n} {{t}}`, [
        ['alpha', String.raw`\alpha`],
        ['t', 't_{ij}'],
      ]),
    ],
    value: thresholdValue,
  });

  const totals = total.values();
  const cut = threshold.at().value;
  const relations: DematelEdge[] = [];
  totals.forEach((row, i) =>
    row.forEach((value, j) => {
      if (i !== j && value >= cut) {
        relations.push({ from: ids[i] as string, to: ids[j] as string, value });
      }
    }),
  );
  return {
    threshold: cut,
    relations,
    weights: crispWeights(ids, weights.values()[0] as number[]),
  };
}

export function groupOf(relation: number): DematelGroup {
  if (relation > RELATION_TOLERANCE) return 'cause';
  if (relation < -RELATION_TOLERANCE) return 'effect';
  return 'neutral';
}

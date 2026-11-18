/**
 * DEMATEL: DEcision MAking Trial and Evaluation Laboratory.
 *
 * Formulation: docs/methods/dematel.md, from Chen, Tzeng, Huang (2018), Eqs. 1-4.
 *
 * Steps: direct-relation matrix Z (the mean of the experts' matrices) → normalization
 * constant s → X = Z / s → (I − X)⁻¹ → total relation T = X (I − X)⁻¹ → dispatched and
 * received influence D, R → prominence D + R and relation D − R → weights → threshold of
 * the cause-effect map.
 *
 * Input: the `factors` and `relations`, one n × n matrix per expert, entry (i, j) being the
 * influence of factor i on factor j (any non-negative scale, usually 0-4). A non-zero
 * diagonal is allowed by the formula: it is kept and reported as a warning.
 */
import type { Trace, TraceAxisItem, ValidationCollector } from '@mateo/engine';
import {
  createTraceBuilder,
  createValidation,
  crisp,
  defineMethod,
  ISSUE_CODES,
  maximum,
  mean,
  sum,
  term,
  textLiteral,
} from '@mateo/engine';
import { formula, quantity } from '../src/common';
import type { Matrix } from './linear';
import { inverseOfIdentityMinus } from './linear';
import { inverseMatrix, tracedInverse } from './operations';
import type {
  DematelCommonResult,
  DematelFactor,
  DematelGroup,
  DematelNormalization,
  DematelOptions,
} from './shared';
import {
  checkExpertMatrices,
  checkFactors,
  DEMATEL_ISSUE_CODES,
  DEMATEL_PARAMETERS,
  DEMATEL_REFERENCES,
  factorAxis,
  groupOf,
  key,
  recordTail,
  step,
  warnDiagonal,
} from './shared';

export const DEMATEL_ID = 'dematel';
export const DEMATEL_VERSION = '1.0.0';

export interface DematelInput {
  readonly factors: readonly DematelFactor[];
  /** One n × n direct-relation matrix per expert; entry (i, j): influence of i on j. */
  readonly relations: readonly (readonly (readonly number[])[])[];
}

export interface DematelFactorResult {
  readonly factorId: string;
  /** D: the influence the factor dispatches (row sum of T). */
  readonly dispatch: number;
  /** R: the influence the factor receives (column sum of T). */
  readonly receive: number;
  /** D + R: how involved the factor is. */
  readonly prominence: number;
  /** D − R: positive for a cause, negative for an effect. */
  readonly relation: number;
  readonly group: DematelGroup;
}

export interface DematelResult extends DematelCommonResult {
  readonly factors: readonly DematelFactorResult[];
}

/** Z: the element-wise mean of the experts' matrices (one expert: the matrix itself). */
function averageMatrix(experts: readonly Matrix[]): number[][] {
  const first = experts[0] as Matrix;
  return first.map((row, i) =>
    row.map((_, j) =>
      experts.length === 1
        ? (row[j] as number)
        : mean(experts.map((m) => (m[i] as readonly number[])[j] as number)),
    ),
  );
}

/** s of the chosen normalization: the largest row sum, or the larger of that and the largest column sum. */
function normalizationOf(z: Matrix, normalization: DematelNormalization): number {
  const rows = maximum(z.map((row) => sum(row)));
  if (normalization === 'max-row-sum') return rows;
  const columns = maximum(z.map((_, j) => sum(z.map((row) => row[j] as number))));
  return maximum([rows, columns]);
}

function validateDematel(input: DematelInput, options: DematelOptions, v: ValidationCollector) {
  if (typeof input !== 'object' || input === null) {
    v.error(ISSUE_CODES.inputMalformed, {
      params: { input: 'factors' },
      location: { input: 'factors' },
    });
    return;
  }
  if (!checkFactors(input.factors, v)) return;
  const { factors, relations } = input;
  const usable = checkExpertMatrices(relations, factors, v, (cell, location) => {
    if (cell === null || cell === undefined) {
      v.error(ISSUE_CODES.matrixMissingValue, { location });
      return false;
    }
    if (typeof cell !== 'number' || !Number.isFinite(cell)) {
      v.error(ISSUE_CODES.matrixInvalidValue, { location });
      return false;
    }
    if (cell < 0) {
      v.error(ISSUE_CODES.matrixNegativeValue, { params: { value: cell }, location });
      return false;
    }
    return true;
  });
  if (!usable) return;

  relations.forEach((matrix, expert) =>
    factors.forEach((_, i) => {
      if ((matrix[i] as readonly number[])[i] !== 0) warnDiagonal(v, factors, expert, i);
    }),
  );

  const z = averageMatrix(relations);
  const s = normalizationOf(z, options.normalization);
  if (!(s > 0)) {
    v.error(DEMATEL_ISSUE_CODES.zeroMatrix, { location: { input: 'relations' } });
    return;
  }
  const outcome = inverseOfIdentityMinus(z.map((row) => row.map((value) => value / s)));
  if (outcome.kind === 'singular') {
    v.error(DEMATEL_ISSUE_CODES.nearSingular, {
      params: { condition: Number.isFinite(outcome.condition) ? outcome.condition : 'infinite' },
      location: { input: 'relations' },
    });
  }
}

const FACTOR_TERMS = [
  ['d', 'D_i'],
  ['r', 'R_i'],
  ['t', 't_{ij}'],
] as const;

export const dematelMethod = defineMethod({
  id: DEMATEL_ID,
  version: DEMATEL_VERSION,
  category: 'relationship',
  nameKey: key('name'),
  supportedNumberTypes: ['crisp'],
  inputSchema: [
    { name: 'factors', kind: 'factor-list', required: true, numberTypes: ['crisp'] },
    { name: 'relations', kind: 'relation-matrices', required: true, numberTypes: ['crisp'] },
  ],
  outputSchema: [
    { name: 'factors', kind: 'relationship', numberTypes: ['crisp'] },
    { name: 'weights', kind: 'weights', numberTypes: ['crisp'] },
  ],
  parameters: DEMATEL_PARAMETERS,
  references: DEMATEL_REFERENCES,

  validate(input: DematelInput, params) {
    const v = createValidation();
    validateDematel(input, params, v);
    return v.result();
  },

  run(input: DematelInput, params): { result: DematelResult; trace: Trace } {
    const { factors, relations } = input;
    const n = factors.length;
    const items = factorAxis(factors);
    const tb = createTraceBuilder({ methodId: DEMATEL_ID, methodVersion: DEMATEL_VERSION });
    const experts = relations.length;

    // Z. With several experts the matrices are shown stacked, then averaged cell by cell.
    let z;
    if (experts === 1) {
      z = tb.input<number>({
        ...step('direct-relation'),
        explanationParams: { experts },
        input: 'relations',
        rows: items,
        columns: items,
        values: relations[0] as Matrix,
      });
    } else {
      const stacked: TraceAxisItem[] = relations.flatMap((_, expert) =>
        factors.map(({ id }) => ({
          id: `e${expert + 1}:${id}`,
          label: textLiteral(`E${expert + 1} · ${id}`),
          kind: 'factor',
        })),
      );
      const all = tb.input<number>({
        ...step('expert-matrices'),
        input: 'relations',
        rows: stacked,
        columns: items,
        values: relations.flatMap((matrix) => matrix.map((row) => [...row])),
      });
      z = tb.table<number>({
        ...step('direct-relation'),
        explanationParams: { experts },
        formulas: [
          formula('mean', String.raw`{{z}} = \frac{1}{H} \sum_{k=1}^{H} {{x}}`, [
            ['z', 'z_{ij}'],
            ['x', String.raw`x^{k}_{ij}`],
            ['H', 'H'],
          ]),
        ],
        rows: items,
        columns: items,
        visualization: { view: 'matrix', basedOn: all.id },
        cell: (row, column) =>
          crisp.mean(
            relations.map((_, expert) => term(all.cell(expert * n + row.index, column.index), 'x')),
          ),
      });
    }

    const rowSums = tb.columnVector<number>({
      ...step('row-sums'),
      formulas: [
        formula('row-sum', String.raw`{{r}} = \sum_{j=1}^{n} {{z}}`, [
          ['r', String.raw`\sum_{j} z_{ij}`],
          ['z', 'z_{ij}'],
        ]),
      ],
      items,
      column: quantity('rowSum', key('columns.rowSum')),
      cell: (row) => crisp.sum(term(z.row(row.index), 'z')),
    });
    const bothSums = params.normalization === 'max-row-or-column-sum';
    const columnSums = bothSums
      ? tb.rowVector<number>({
          ...step('column-sums'),
          formulas: [
            formula('column-sum', String.raw`{{c}} = \sum_{i=1}^{n} {{z}}`, [
              ['c', String.raw`\sum_{i} z_{ij}`],
              ['z', 'z_{ij}'],
            ]),
          ],
          items,
          row: quantity('columnSum', key('rows.columnSum')),
          cell: (column) => crisp.sum(term(z.column(column.index), 'z')),
        })
      : undefined;
    const s = tb.scalar<number>({
      ...step('normalization-constant'),
      explanationParams: { normalization: params.normalization },
      formulas: [
        formula(
          bothSums ? 'both' : 'rows',
          bothSums
            ? String.raw`{{s}} = \max \left( \max_i \sum_{j} z_{ij}, \; \max_j \sum_{i} z_{ij} \right)`
            : String.raw`{{s}} = \max_i \sum_{j} z_{ij}`,
          [['s', 's']],
        ),
      ],
      value:
        columnSums === undefined
          ? crisp.max(rowSums.all())
          : crisp.max([crisp.max(rowSums.all()), crisp.max(columnSums.all())]),
    });

    const x = tb.table<number>({
      ...step('normalized-matrix'),
      formulas: [
        formula('normalize', String.raw`{{x}} = \frac{ {{z}} }{ {{s}} }`, [
          ['x', 'x_{ij}'],
          ['z', 'z_{ij}'],
          ['s', 's'],
        ]),
      ],
      rows: items,
      columns: items,
      visualization: { view: 'matrix', basedOn: z.id },
      cell: (row, column) =>
        crisp.divide(term(z.cell(row.index, column.index), 'z'), term(s.at(), 's')),
    });

    const inverse = inverseMatrix(x.values()) as number[][];
    const inv = tb.table<number>({
      ...step('inverse'),
      formulas: [
        formula('inverse', String.raw`{{inv}} = \left[ (I - X)^{-1} \right]_{ij}`, [
          ['inv', String.raw`\left[ (I - X)^{-1} \right]_{ij}`],
        ]),
      ],
      rows: items,
      columns: items,
      visualization: { view: 'matrix', basedOn: x.id },
      cell: (row, column) => tracedInverse(x.all(), inverse, row.index, column.index),
    });

    const t = tb.table<number>({
      ...step('total-relation'),
      role: 'intermediate',
      formulas: [
        formula('total', String.raw`{{t}} = \sum_{k=1}^{n} {{x}} \, {{inv}}`, [
          ['t', 't_{ij}'],
          ['x', 'x_{ik}'],
          ['inv', String.raw`\left[ (I - X)^{-1} \right]_{kj}`],
        ]),
      ],
      rows: items,
      columns: items,
      visualization: { view: 'matrix', basedOn: x.id },
      cell: (row, column) =>
        crisp.sumOfProducts(term(x.row(row.index), 'x'), term(inv.column(column.index), 'inv')),
    });

    const influence = tb.table<number>({
      ...step('influence'),
      formulas: [
        formula('dispatch', String.raw`{{d}} = \sum_{j=1}^{n} {{t}}`, [
          ['d', 'D_i'],
          ['t', 't_{ij}'],
        ]),
        formula('receive', String.raw`{{r}} = \sum_{i=1}^{n} {{t}}`, [
          ['r', 'R_j'],
          ['t', 't_{ij}'],
        ]),
      ],
      rows: items,
      columns: [quantity('D', key('columns.dispatch')), quantity('R', key('columns.receive'))],
      visualization: { view: 'bars', basedOn: t.id },
      cell: (row, column) =>
        column.index === 0
          ? { tracked: crisp.sum(term(t.row(row.index), 't')), formula: 'dispatch' }
          : { tracked: crisp.sum(term(t.column(row.index), 't')), formula: 'receive' },
    });

    const pr = tb.table<number>({
      ...step('prominence-relation'),
      formulas: [
        formula('prominence', String.raw`{{p}} = {{d}} + {{r}}`, [
          ['p', 'D_i + R_i'],
          ...FACTOR_TERMS.slice(0, 2),
        ]),
        formula('relation', String.raw`{{q}} = {{d}} - {{r}}`, [
          ['q', 'D_i - R_i'],
          ...FACTOR_TERMS.slice(0, 2),
        ]),
      ],
      rows: items,
      columns: [
        quantity('prominence', key('columns.prominence')),
        quantity('relation', key('columns.relation')),
      ],
      visualization: { view: 'bars', basedOn: influence.id },
      cell: (row, column) => {
        const d = term(influence.cell(row.index, 0), 'd');
        const r = term(influence.cell(row.index, 1), 'r');
        return column.index === 0
          ? { tracked: crisp.add(d, r), formula: 'prominence' }
          : { tracked: crisp.subtract(d, r), formula: 'relation' };
      },
    });

    const tail = recordTail({
      tb,
      factors,
      options: params,
      total: t,
      prominenceRelation: pr,
    });

    const influenceValues = influence.values();
    const prValues = pr.values();
    const result: DematelResult = {
      normalizationConstant: s.at().value,
      totalRelation: t.values(),
      factors: factors.map((factor, i) => ({
        factorId: factor.id,
        dispatch: (influenceValues[i] as number[])[0] as number,
        receive: (influenceValues[i] as number[])[1] as number,
        prominence: (prValues[i] as number[])[0] as number,
        relation: (prValues[i] as number[])[1] as number,
        group: groupOf((prValues[i] as number[])[1] as number),
      })),
      ...tail,
    };
    return { result, trace: tb.build() };
  },
});

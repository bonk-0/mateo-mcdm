import {
  textLiteral,
  type DecisionMatrix,
  type MethodRunRecord,
  type WeightVector,
} from '@mateo/engine';
import { IMF_SWARA_SCALE, type TFN } from '@mateo/fuzzy';
import { REFERENCE_FIXTURES, type ReferenceFixture, type ReferenceFixtureId } from '@mateo/methods';
import type { CellValue, Dataset, ModelCriterion } from '@mateo/project';
import { workspaceRegistry } from '../workspace/registry';
import { executeJob, type ParameterValues } from '../workspace/runnerCore';

/**
 * Sample data of the Method Library: the reference example of each method (P1.4 fixture) as
 * engine input for the reference example, as a dataset for the workspace and as a CSV file.
 * The numbers are always the ones printed in the source paper; nothing is rounded here.
 */

export type SampleId = ReferenceFixtureId;

export const SAMPLE_IDS: readonly SampleId[] = [
  'marcos',
  'fuzzy-marcos',
  'critic',
  'merec',
  'swara',
  'fuzzy-swara',
];

export function isSampleId(value: string | null): value is SampleId {
  return value !== null && (SAMPLE_IDS as readonly string[]).includes(value);
}

/** Where a sample opens: the workspace of its method family. */
export type SampleRoute = '/weights' | '/result';

interface SampleDefinition {
  readonly methodId: string;
  readonly route: SampleRoute;
  /** Methods that need a decision matrix; SWARA works on an ordered list of criteria. */
  readonly kind: 'matrix' | 'ordered';
}

const DEFINITIONS: Readonly<Record<SampleId, SampleDefinition>> = {
  marcos: { methodId: 'marcos', route: '/result', kind: 'matrix' },
  'fuzzy-marcos': { methodId: 'fuzzy-marcos', route: '/result', kind: 'matrix' },
  critic: { methodId: 'critic', route: '/weights', kind: 'matrix' },
  merec: { methodId: 'merec', route: '/weights', kind: 'matrix' },
  swara: { methodId: 'swara', route: '/weights', kind: 'ordered' },
  'fuzzy-swara': { methodId: 'fuzzy-swara', route: '/weights', kind: 'ordered' },
};

export function sampleFixture(id: SampleId): ReferenceFixture {
  return REFERENCE_FIXTURES[id];
}

export function sampleMethodId(id: SampleId): string {
  return DEFINITIONS[id].methodId;
}

export function sampleRoute(id: SampleId): SampleRoute {
  return DEFINITIONS[id].route;
}

export function sampleKind(id: SampleId): 'matrix' | 'ordered' {
  return DEFINITIONS[id].kind;
}

// ---- reading a fixture ---------------------------------------------------------------

interface FixtureCriterion {
  readonly id: string;
  /** Some fixtures name their criteria only by id. */
  readonly name: string;
  readonly direction?: 'benefit' | 'cost';
}

type Tuple = readonly [number, number, number];

const toTfn = (tuple: Tuple): TFN => ({ l: tuple[0], m: tuple[1], u: tuple[2] });

function criteriaOf(fixture: ReferenceFixture): readonly FixtureCriterion[] {
  return (
    fixture.input['criteria'] as readonly (Omit<FixtureCriterion, 'name'> & { name?: string })[]
  ).map((criterion) => ({ ...criterion, name: criterion.name ?? criterion.id }));
}

function alternativesOf(fixture: ReferenceFixture): readonly string[] {
  return (fixture.input['alternatives'] as readonly string[] | undefined) ?? [];
}

function isFuzzy(id: SampleId): boolean {
  return id === 'fuzzy-marcos' || id === 'fuzzy-swara';
}

/** The assessments of an ordered fixture as they are entered in the workspace. */
function orderedAnswers(id: SampleId): readonly (string | number | null)[] {
  const input = REFERENCE_FIXTURES[id].input;
  return (input['assessments'] ?? input['comparativeImportance']) as readonly (
    string | number | null
  )[];
}

// ---- engine input --------------------------------------------------------------------

function engineMatrix<T>(id: SampleId, convert: (value: never) => T): DecisionMatrix<T> {
  const fixture = REFERENCE_FIXTURES[id];
  const matrix = fixture.input['matrix'] as readonly (readonly never[])[];
  return {
    alternatives: alternativesOf(fixture).map((name) => ({ id: name, name: textLiteral(name) })),
    criteria: criteriaOf(fixture).map((criterion) => ({
      id: criterion.id,
      name: textLiteral(criterion.name),
      direction: criterion.direction ?? 'benefit',
      numberType: isFuzzy(id) ? 'tfn' : 'crisp',
    })),
    values: matrix.map((row) => row.map(convert)),
  };
}

function engineWeights(id: SampleId): WeightVector<never> | undefined {
  const fixture = REFERENCE_FIXTURES[id];
  const weights = fixture.input['weights'] as readonly unknown[] | undefined;
  if (!weights) return undefined;
  const fuzzy = isFuzzy(id);
  return {
    numberType: fuzzy ? 'tfn' : 'crisp',
    entries: criteriaOf(fixture).map((criterion, j) => ({
      criterionId: criterion.id,
      value: (fuzzy ? toTfn(weights[j] as Tuple) : weights[j]) as never,
    })),
  };
}

/** The input of the reference run, exactly as the workspace would build it from the sample. */
export function sampleInput(id: SampleId): unknown {
  const fixture = REFERENCE_FIXTURES[id];
  switch (id) {
    case 'critic':
    case 'merec':
      return { matrix: engineMatrix(id, (value: number) => value) };
    case 'marcos':
      return {
        matrix: engineMatrix(id, (value: number) => value),
        weights: engineWeights(id),
      };
    case 'fuzzy-marcos':
      return {
        matrix: engineMatrix(id, (value: Tuple) => toTfn(value)),
        weights: engineWeights(id),
      };
    case 'swara':
    case 'fuzzy-swara': {
      const criteria = criteriaOf(fixture).map(({ id: criterionId, name }) => ({
        id: criterionId,
        name: textLiteral(name),
      }));
      return id === 'swara'
        ? { criteria, comparativeImportance: orderedAnswers(id) }
        : { criteria, assessments: orderedAnswers(id) };
    }
  }
}

/** Parameters of the reference run: the fixture's, limited to the ones the method declares. */
export function sampleParameters(id: SampleId): ParameterValues {
  const declared = workspaceRegistry().get(DEFINITIONS[id].methodId).parameters;
  return Object.fromEntries(
    Object.entries(REFERENCE_FIXTURES[id].parameters).filter(([name]) => name in declared),
  ) as ParameterValues;
}

/** Runs the reference example through the real method, the way a workspace run does. */
export function runSample(id: SampleId): MethodRunRecord<unknown> {
  const outcome = executeJob({
    methodId: DEFINITIONS[id].methodId,
    input: sampleInput(id),
    parameters: sampleParameters(id),
  });
  if (!outcome.ok) throw new Error(`The reference example of ${id} does not run.`);
  return outcome.record;
}

// ---- dataset for the workspace -------------------------------------------------------

/** Dataset ids are fixed, so opening a sample twice reuses the dataset. */
export function sampleDatasetId(id: SampleId): string {
  return `sample-${id}`;
}

/** The name of a sample dataset; the caller translates it. */
export interface SampleDatasetOptions {
  readonly name: string;
  readonly description: string;
  readonly now: string;
}

export function sampleDataset(id: SampleId, options: SampleDatasetOptions): Dataset {
  const fixture = REFERENCE_FIXTURES[id];
  const fuzzy = isFuzzy(id);
  const base = sampleDatasetId(id);
  const criteria: ModelCriterion[] = criteriaOf(fixture).map((criterion, j) => ({
    id: `${base}-c${j + 1}`,
    code: `C${j + 1}`,
    name: criterion.name,
    description: '',
    direction: criterion.direction ?? 'benefit',
    unit: '',
    numberType: id === 'fuzzy-marcos' ? 'tfn' : 'crisp',
    scaleId: null,
  }));
  const names = alternativesOf(fixture);
  const alternatives = names.map((name, i) => ({
    id: `${base}-a${i + 1}`,
    code: `A${i + 1}`,
    name,
    description: '',
    group: '',
  }));
  const matrix = (fixture.input['matrix'] ?? []) as readonly (readonly unknown[])[];
  const cells: Record<string, Record<string, CellValue>> = {};
  alternatives.forEach((alternative, i) => {
    cells[alternative.id] = Object.fromEntries(
      criteria.map((criterion, j): [string, CellValue] => {
        const value = matrix[i]?.[j];
        return [
          criterion.id,
          fuzzy
            ? { kind: 'tfn', value: toTfnValue(value as Tuple) }
            : { kind: 'crisp', value: value as number },
        ];
      }),
    );
  });
  return {
    id: base,
    name: options.name,
    description: options.description,
    createdAt: options.now,
    criteria,
    alternatives,
    matrices: [{ id: `${base}-matrix`, name: 'Decision matrix', role: 'decision', cells }],
  };
}

function toTfnValue(tuple: Tuple): { l: number; m: number; u: number } {
  return { l: tuple[0], m: tuple[1], u: tuple[2] };
}

// ---- workspace preset ----------------------------------------------------------------

/**
 * What a workspace fills in when it is opened from a sample. Entries follow the order of
 * the dataset's criteria.
 */
export interface WorkspacePreset {
  readonly sampleId: SampleId;
  readonly methodId: string;
  /** SWARA: comparative importance s_j (`null` for the first criterion). */
  readonly importance?: readonly (number | null)[];
  /** Fuzzy SWARA: term id per criterion (`null` for the first criterion). */
  readonly terms?: readonly (string | null)[];
  /** MARCOS: the weights of the paper. TFNs for Fuzzy MARCOS. */
  readonly weights?: readonly (number | TFN)[];
}

export function samplePreset(id: SampleId): WorkspacePreset {
  const fixture = REFERENCE_FIXTURES[id];
  const methodId = DEFINITIONS[id].methodId;
  switch (id) {
    case 'swara':
      return {
        sampleId: id,
        methodId,
        importance: orderedAnswers(id) as readonly (number | null)[],
      };
    case 'fuzzy-swara':
      return {
        sampleId: id,
        methodId,
        terms: (orderedAnswers(id) as readonly (string | null)[]).map((abbreviation) => {
          if (abbreviation === null) return null;
          return (
            IMF_SWARA_SCALE.terms.find((term) => term.abbreviation === abbreviation)?.id ?? null
          );
        }),
      };
    case 'marcos':
      return { sampleId: id, methodId, weights: fixture.input['weights'] as readonly number[] };
    case 'fuzzy-marcos':
      return {
        sampleId: id,
        methodId,
        weights: (fixture.input['weights'] as readonly Tuple[]).map(toTfn),
      };
    default:
      return { sampleId: id, methodId };
  }
}

// ---- CSV -----------------------------------------------------------------------------

/** A byte order mark, so that spreadsheet programs read the file as UTF-8. */
const BOM = String.fromCharCode(0xfeff);

function field(text: string): string {
  return /[",\n;]/u.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

const tripleText = (tuple: Tuple): string => `(${tuple.join('; ')})`;

/**
 * The sample as a CSV file. Matrix samples import in the Data Center (directions in the
 * header, weights in a row the importer reports but never applies); SWARA samples list the
 * criteria in order of importance with the experts' assessment.
 */
export function sampleCsv(
  id: SampleId,
  labels: { alternative: string; weight: string; criterion: string; assessment: string },
): string {
  const fixture = REFERENCE_FIXTURES[id];
  const rows: string[][] = [];
  if (DEFINITIONS[id].kind === 'ordered') {
    rows.push([labels.criterion, labels.assessment]);
    const answers = orderedAnswers(id);
    criteriaOf(fixture).forEach((criterion, j) => {
      rows.push([criterion.name, answers[j] === null ? '' : String(answers[j])]);
    });
  } else {
    const fuzzy = isFuzzy(id);
    const criteria = criteriaOf(fixture);
    rows.push([
      labels.alternative,
      ...criteria.map(
        (criterion) => `${criterion.name} (${criterion.direction === 'cost' ? 'min' : 'max'})`,
      ),
    ]);
    const matrix = fixture.input['matrix'] as readonly (readonly unknown[])[];
    alternativesOf(fixture).forEach((name, i) => {
      rows.push([
        name,
        ...(matrix[i] ?? []).map((value) => (fuzzy ? tripleText(value as Tuple) : String(value))),
      ]);
    });
    const weights = fixture.input['weights'] as readonly unknown[] | undefined;
    if (weights) {
      rows.push([
        labels.weight,
        ...weights.map((value) => (fuzzy ? tripleText(value as Tuple) : String(value))),
      ]);
    }
  }
  return `${BOM}${rows.map((row) => row.map(field).join(',')).join('\r\n')}\r\n`;
}

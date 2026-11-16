import {
  createTraceBuilder,
  crisp,
  crispWeights,
  defineMethod,
  NO_PARAMETERS,
  createValidation,
  runMethod,
  term,
  type DecisionMatrix,
  type MethodRunRecord,
  type WeightVector,
} from '@mateo/engine';
import { addDataset, putScale, setCells } from '../history/commands';
import { crispCell, termCell, tfnCell } from '../model/cells';
import type { Dataset, LinguisticScale } from '../model/types';
import type { ProjectRepositoryOptions } from '../repository/repository';
import { createProjectRepository, type ProjectRepository } from '../repository/repository';
import type { ProjectSession } from '../repository/session';
import type { StorageAdapter } from '../sql/types';
import { memoryFileStore, type FileStore } from '../storage/file-store';
import { createTauriStorage } from '../storage/tauri';
import { createWasmStorage, type Sqlite3Like } from '../storage/wasm';
import { createFakeTauri, type FakeTauri } from './fake-tauri';
import { loadSqlite } from './sqlite';

/** One storage adapter under test, with direct access to the files behind it. */
export interface TestStorage {
  readonly kind: 'wasm' | 'tauri';
  readonly storage: StorageAdapter;
  readFile(location: string): Promise<Uint8Array | null>;
  writeFile(location: string, bytes: Uint8Array): Promise<void>;
  /** Only for `tauri`. */
  readonly fake?: FakeTauri;
  /** Only for `wasm`. */
  readonly files?: FileStore;
}

export const STORAGE_KINDS = ['wasm', 'tauri'] as const;

export async function createTestStorage(kind: 'wasm' | 'tauri'): Promise<TestStorage> {
  const sqlite3 = await loadSqlite();
  if (kind === 'wasm') {
    const files = memoryFileStore();
    return {
      kind,
      files,
      storage: createWasmStorage({ sqlite3: sqlite3 as unknown as Sqlite3Like, files }),
      readFile: (location) => files.read(location),
      writeFile: (location, bytes) => files.write(location, bytes),
    };
  }
  const fake = createFakeTauri(sqlite3);
  return {
    kind,
    fake,
    storage: createTauriStorage(fake),
    readFile: (location) => Promise.resolve(fake.disk.get(location)?.slice() ?? null),
    writeFile: (location, bytes) => {
      fake.disk.set(location, bytes.slice());
      fake.journalModes.set(location, 'delete');
      return Promise.resolve();
    },
  };
}

/** A repository with a deterministic clock and ids. */
export function createTestRepository(
  storage: StorageAdapter,
  options: Partial<ProjectRepositoryOptions> = {},
): ProjectRepository {
  let tick = 0;
  let id = 0;
  return createProjectRepository({
    storage,
    appVersion: '0.1.0-test',
    now: () => new Date(Date.UTC(2026, 0, 1, 12, 0, tick++)),
    newId: () => `id-${String(++id).padStart(4, '0')}`,
    ...options,
  });
}

export const SAMPLE_SCALE: LinguisticScale = {
  id: 'scale-5',
  name: { key: 'scales.fiveLevel.name' },
  sourceId: 'five-level',
  numberType: 'tfn',
  terms: [
    {
      id: 'VL',
      label: { key: 'scales.terms.veryLow' },
      abbreviation: 'VL',
      value: { l: 0, m: 0, u: 0.25 },
    },
    {
      id: 'L',
      label: { key: 'scales.terms.low' },
      abbreviation: 'L',
      value: { l: 0, m: 0.25, u: 0.5 },
    },
    { id: 'M', label: { text: 'Orta' }, abbreviation: 'M', value: { l: 0.25, m: 0.5, u: 0.75 } },
    {
      id: 'H',
      label: { key: 'scales.terms.high' },
      abbreviation: 'H',
      value: { l: 0.5, m: 0.75, u: 1 },
    },
    {
      id: 'VH',
      label: { key: 'scales.terms.veryHigh' },
      abbreviation: 'VH',
      value: { l: 0.75, m: 1, u: 1 },
    },
  ],
};

/** Three alternatives; a crisp, a TFN and a linguistic criterion; one cell left empty. */
export const SAMPLE_DATASET: Dataset = {
  id: 'ds-suppliers',
  name: 'Tedarikçi seçimi',
  description: 'Supplier selection with İ, ı, ş, ğ and 😀',
  createdAt: '2026-01-01T09:00:00.000Z',
  criteria: [
    {
      id: 'c-price',
      code: 'C1',
      name: 'Fiyat',
      description: '',
      direction: 'cost',
      unit: 'EUR',
      numberType: 'crisp',
      scaleId: null,
    },
    {
      id: 'c-quality',
      code: 'C2',
      name: 'Kalite',
      description: 'Expert judgement',
      direction: 'benefit',
      unit: '',
      numberType: 'tfn',
      scaleId: null,
    },
    {
      id: 'c-service',
      code: 'C3',
      name: 'Servis',
      description: '',
      direction: 'benefit',
      unit: '',
      numberType: 'tfn',
      scaleId: 'scale-5',
    },
  ],
  alternatives: [
    { id: 'a-1', code: 'A1', name: 'Alpha', description: '', group: 'Local' },
    { id: 'a-2', code: 'A2', name: 'Beta', description: 'Second "supplier"', group: 'Local' },
    { id: 'a-3', code: 'A3', name: 'Gamma', description: '', group: '' },
  ],
  matrices: [{ id: 'm-decision', name: 'Decision matrix', role: 'decision', cells: {} }],
};

/** Numbers that are easy to damage: not exactly representable, tiny, huge, negative zero. */
export const SAMPLE_CELLS = [
  { alternativeId: 'a-1', criterionId: 'c-price', value: crispCell(0.1 + 0.2) },
  {
    alternativeId: 'a-1',
    criterionId: 'c-quality',
    value: tfnCell(1 / 3, 2 / 3, 0.9999999999999999),
  },
  { alternativeId: 'a-1', criterionId: 'c-service', value: termCell('H') },
  { alternativeId: 'a-2', criterionId: 'c-price', value: crispCell(1.7976931348623157e308) },
  {
    alternativeId: 'a-2',
    criterionId: 'c-quality',
    value: tfnCell(5e-324, 1e-7, 123456789.12345679),
  },
  { alternativeId: 'a-2', criterionId: 'c-service', value: termCell('VL') },
  { alternativeId: 'a-3', criterionId: 'c-price', value: crispCell(-0) },
  // (a-3, c-quality) is left empty on purpose.
  { alternativeId: 'a-3', criterionId: 'c-service', value: tfnCell(-2.5, 0, 1e21) },
];

/** Fills a session with the sample scale, dataset and cells. */
export function fillSample(session: ProjectSession): void {
  session.execute(putScale(SAMPLE_SCALE));
  session.execute(addDataset(SAMPLE_DATASET));
  session.execute(setCells(SAMPLE_DATASET.id, 'm-decision', SAMPLE_CELLS));
}

// --- A real engine run to store ------------------------------------------------------

interface ToyInput {
  readonly matrix: DecisionMatrix<number>;
  readonly weights: WeightVector;
}

/** A minimal method built on the real engine: score = sum of weight × value. */
const toyMethod = defineMethod({
  id: 'toy-weighted-sum',
  version: '1.2.3',
  category: 'ranking',
  nameKey: 'methods.toy.name',
  supportedNumberTypes: ['crisp'],
  inputSchema: [
    { name: 'matrix', kind: 'decision-matrix', required: true, numberTypes: ['crisp'] },
    { name: 'weights', kind: 'weights', required: true, numberTypes: ['crisp'] },
  ],
  outputSchema: [{ name: 'scores', kind: 'scores', numberTypes: ['crisp'] }],
  parameters: NO_PARAMETERS,
  references: [],
  validate(input: ToyInput) {
    const validation = createValidation();
    if (input.matrix.alternatives.length < 3) {
      validation.warning('toy.few-alternatives', {
        params: { count: input.matrix.alternatives.length },
        location: { input: 'matrix' },
      });
    }
    return validation.result();
  },
  run(input: ToyInput) {
    const tb = createTraceBuilder({ methodId: 'toy-weighted-sum', methodVersion: '1.2.3' });
    const x = tb.inputMatrix({
      id: 'initial-matrix',
      nameKey: 'steps.initial.name',
      explanationKey: 'steps.initial.explanation',
      matrix: input.matrix,
    });
    const w = tb.inputWeights({
      id: 'weights',
      nameKey: 'steps.weights.name',
      explanationKey: 'steps.weights.explanation',
      weights: input.weights,
      criteria: input.matrix.criteria,
    });
    const weighted = tb.table({
      id: 'weighted-matrix',
      nameKey: 'steps.weighted.name',
      explanationKey: 'steps.weighted.explanation',
      formulas: [
        {
          id: 'weighted',
          template: String.raw`{{v}} = {{w}} \cdot {{x}}`,
          terms: [
            { name: 'v', latex: 'v_{ij}' },
            { name: 'w', latex: 'w_j' },
            { name: 'x', latex: 'x_{ij}' },
          ],
        },
      ],
      rows: x.rows,
      columns: x.columns,
      visualization: { view: 'matrix', basedOn: x.id },
      cell: (row, column) =>
        crisp.multiply(term(w.at(column.index), 'w'), term(x.cell(row.index, column.index), 'x')),
    });
    const s = tb.columnVector({
      id: 'scores',
      role: 'result',
      nameKey: 'steps.scores.name',
      explanationKey: 'steps.scores.explanation',
      formulas: [
        {
          id: 'score',
          template: String.raw`{{S}} = \sum_{j} {{v}}`,
          terms: [
            { name: 'S', latex: 'S_i' },
            { name: 'v', latex: 'v_{ij}' },
          ],
        },
      ],
      items: weighted.rows,
      cell: (item) => crisp.sum(term(weighted.row(item.index), 'v')),
    });
    const scores = s.values().map((cells) => cells[0] as number);
    return { result: { scores }, trace: tb.build() };
  },
});

export interface ToyRun {
  readonly methodInput: ToyInput;
  readonly record: MethodRunRecord<unknown>;
}

/** Runs the toy method through `runMethod`, giving a genuine run record and trace. */
export function runToyMethod(): ToyRun {
  const methodInput: ToyInput = {
    matrix: {
      alternatives: [
        { id: 'a-1', name: { text: 'Alpha' } },
        { id: 'a-2', name: { text: 'Beta' } },
      ],
      criteria: [
        {
          id: 'c-price',
          name: { text: 'Fiyat' },
          direction: 'cost',
          unit: 'EUR',
          numberType: 'crisp',
        },
        { id: 'c-speed', name: { text: 'Hız' }, direction: 'benefit', numberType: 'crisp' },
      ],
      values: [
        [0.1, 0.7],
        [1 / 3, 2 / 7],
      ],
    },
    weights: crispWeights(['c-price', 'c-speed'], [0.3, 0.7]),
  };
  const record = runMethod(toyMethod, methodInput, {}, { verifyTrace: true });
  return { methodInput, record };
}

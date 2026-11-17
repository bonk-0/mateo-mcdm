import type { SampleId } from './samples';

/**
 * The Method Library's pages (docs/phases/phase-1.md, P1.17). A page can carry several
 * variants of one method (SWARA and fuzzy SWARA); each variant has its own reference
 * example, steps and sample data. Texts live in the `library` catalog under
 * `pages.<id>` and `variants.<sampleId>`; the lists of ids below name the entries a page shows.
 */

export type LibraryPageId = 'marcos' | 'fuzzy-marcos' | 'critic' | 'merec' | 'swara';

export type MethodFamily = 'weighting' | 'ranking';

export interface Reference {
  /** `method`: where the method was introduced. `formulation`/`example`: where the formulas and worked example were read. */
  readonly role: 'method' | 'formulation' | 'example' | 'related';
  /** Bibliographic data as in docs/methods (P1.4); it is never translated. */
  readonly citation: string;
  readonly doi: string;
}

export interface LibraryVariant {
  readonly sampleId: SampleId;
  /** `true` for variants that work on triangular fuzzy numbers. */
  readonly fuzzy: boolean;
  /** Ids of the entries under `variants.<sampleId>.inputs`. */
  readonly inputs: readonly string[];
  /** Ids of the entries under `variants.<sampleId>.notes`. */
  readonly notes: readonly string[];
  readonly references: readonly Reference[];
}

export interface LibraryPage {
  readonly id: LibraryPageId;
  readonly family: MethodFamily;
  readonly variants: readonly LibraryVariant[];
  readonly related: readonly LibraryPageId[];
}

const STANKOVIC_2020: Reference = {
  role: 'formulation',
  citation:
    'Stanković, M., Stević, Ž., Das, D. K., Subotić, M., Pamučar, D. (2020). A new fuzzy MARCOS method for road traffic risk analysis. Mathematics, 8(3), 457.',
  doi: '10.3390/math8030457',
};

const DAMJANOVIC_2022: Reference = {
  role: 'example',
  citation:
    'Damjanović, M., Stević, Ž., Stanimirović, D., Tanackov, I., Marinković, D. (2022). Impact of the number of vehicles on traffic safety: multiphase modeling. Facta Universitatis, Series: Mechanical Engineering, 20(1), 177–197.',
  doi: '10.22190/FUME220215012D',
};

export const LIBRARY_PAGES: readonly LibraryPage[] = [
  {
    id: 'marcos',
    family: 'ranking',
    related: ['fuzzy-marcos', 'critic', 'merec', 'swara'],
    variants: [
      {
        sampleId: 'marcos',
        fuzzy: false,
        inputs: ['matrix', 'weights'],
        notes: ['crossover', 'constants', 'weightsScale', 'zeros', 'ties'],
        references: [
          {
            role: 'method',
            citation:
              'Stević, Ž., Pamučar, D., Puška, A., Chatterjee, P. (2020). Sustainable supplier selection in healthcare industries using a new MCDM method: Measurement of alternatives and ranking according to COmpromise solution (MARCOS). Computers & Industrial Engineering, 140, 106231.',
            doi: '10.1016/j.cie.2019.106231',
          },
          STANKOVIC_2020,
          DAMJANOVIC_2022,
        ],
      },
    ],
  },
  {
    id: 'fuzzy-marcos',
    family: 'ranking',
    related: ['marcos', 'critic', 'merec', 'swara'],
    variants: [
      {
        sampleId: 'fuzzy-marcos',
        fuzzy: true,
        inputs: ['matrix', 'weights', 'scale'],
        notes: ['componentwise', 'sharedDenominator', 'crispWeights', 'rankOrder', 'zeros'],
        references: [{ ...STANKOVIC_2020, role: 'method' }],
      },
    ],
  },
  {
    id: 'critic',
    family: 'weighting',
    related: ['merec', 'swara', 'marcos'],
    variants: [
      {
        sampleId: 'critic',
        fuzzy: false,
        inputs: ['matrix'],
        notes: ['population', 'constant', 'negative', 'conflict'],
        references: [
          {
            role: 'method',
            citation:
              'Diakoulaki, D., Mavrotas, G., Papayannakis, L. (1995). Determining objective weights in multiple criteria problems: The CRITIC method. Computers & Operations Research, 22(7), 763–770.',
            doi: '10.1016/0305-0548(94)00059-H',
          },
        ],
      },
    ],
  },
  {
    id: 'merec',
    family: 'weighting',
    related: ['critic', 'swara', 'marcos'],
    variants: [
      {
        sampleId: 'merec',
        fuzzy: false,
        inputs: ['matrix'],
        notes: ['reverse', 'divisor', 'positive', 'rounding'],
        references: [
          {
            role: 'method',
            citation:
              'Keshavarz-Ghorabaee, M., Amiri, M., Zavadskas, E. K., Turskis, Z., Antucheviciene, J. (2021). Determination of objective weights using a new method based on the removal effects of criteria (MEREC). Symmetry, 13(4), 525.',
            doi: '10.3390/sym13040525',
          },
        ],
      },
    ],
  },
  {
    id: 'swara',
    family: 'weighting',
    related: ['critic', 'merec', 'marcos', 'fuzzy-marcos'],
    variants: [
      {
        sampleId: 'swara',
        fuzzy: false,
        inputs: ['criteria', 'importance'],
        notes: ['naming', 'order', 'first'],
        references: [
          {
            role: 'method',
            citation:
              'Keršulienė, V., Zavadskas, E. K., Turskis, Z. (2010). Selection of rational dispute resolution method by applying new step-wise weight assessment ratio analysis (SWARA). Journal of Business Economics and Management, 11(2), 243–258.',
            doi: '10.3846/jbem.2010.12',
          },
        ],
      },
      {
        sampleId: 'fuzzy-swara',
        fuzzy: true,
        inputs: ['criteria', 'terms'],
        notes: ['variant', 'erratum', 'defuzzification', 'sum'],
        references: [
          {
            role: 'method',
            citation:
              'Vrtagić, S., Softić, E., Subotić, M., Stević, Ž., Dordevic, M., Ponjavic, M. (2021). Ranking road sections based on MCDM model: New improved fuzzy SWARA (IMF SWARA). Axioms, 10(2), 92.',
            doi: '10.3390/axioms10020092',
          },
          DAMJANOVIC_2022,
          {
            role: 'related',
            citation:
              'Stević, Ž., Das, D. K., Tešić, R., Vidas, M., Vojinović, D. (2022). Mathematics, 10(4), 635. Shows on seven published applications why the fuzzy SWARA scale of Mavi et al. (2017) gives inconsistent weights.',
            doi: '10.3390/math10040635',
          },
        ],
      },
    ],
  },
];

export function findLibraryPage(id: string | undefined): LibraryPage | undefined {
  return LIBRARY_PAGES.find((page) => page.id === id);
}

export function libraryPath(id?: LibraryPageId): string {
  return id ? `/learn/library/${id}` : '/learn/library';
}

/**
 * The worked examples of P1.4 (docs/methods/fixtures.md) as data, for the Method Library
 * (P1.17): every page shows a reference example, runs it through the real method and
 * offers it as sample data. The JSON files stay the single source; nothing is copied.
 */
import critic from '../critic/fixtures/diakoulaki-1995.json' with { type: 'json' };
import fuzzyMarcos from '../fuzzy-marcos/fixtures/stankovic-2020.json' with { type: 'json' };
import marcos from '../marcos/fixtures/damjanovic-2022-s1.json' with { type: 'json' };
import merec from '../merec/fixtures/keshavarz-ghorabaee-2021.json' with { type: 'json' };
import imfSwara from '../swara/fixtures/imf-swara-damjanovic-2022-s1.json' with { type: 'json' };
import swara from '../swara/fixtures/kersuliene-2010.json' with { type: 'json' };

/** The parts of a fixture that the library reads. `input` is method-specific. */
export interface ReferenceFixture {
  readonly method: string;
  readonly variant: string;
  readonly numberType: string;
  readonly title: string;
  readonly source: {
    readonly role: string;
    readonly citation: string;
    readonly doi: string;
    readonly location: string;
    readonly note?: string;
  };
  readonly parameters: Readonly<Record<string, unknown>>;
  readonly input: Readonly<Record<string, unknown>>;
  /** Printed values that the formulation does not reproduce, with the recomputed value. */
  readonly deviations: readonly {
    readonly path: string;
    readonly printed: number;
    readonly recomputed: number;
  }[];
  readonly result: Readonly<
    Record<
      string,
      { readonly printedIn: string; readonly decimals?: number; readonly values: unknown }
    >
  >;
}

/** One reference example per library page (IMF SWARA: scenario S1). */
export const REFERENCE_FIXTURES = {
  critic: critic as ReferenceFixture,
  merec: merec as ReferenceFixture,
  swara: swara as ReferenceFixture,
  'fuzzy-swara': imfSwara as ReferenceFixture,
  marcos: marcos as ReferenceFixture,
  'fuzzy-marcos': fuzzyMarcos as ReferenceFixture,
} as const;

export type ReferenceFixtureId = keyof typeof REFERENCE_FIXTURES;

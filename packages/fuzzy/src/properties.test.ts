/**
 * Property tests (docs/phases/phase-1.md, P1.3): the laws every operation must obey for
 * any valid operands, above all that degenerate TFNs `(x, x, x)` behave exactly like the
 * crisp numbers they stand for.
 *
 * The seed is fixed so that CI is reproducible; change it locally to explore.
 */
import { maximum, mean, minimum, product, sum } from '@mateo/engine';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import type { TFN } from './index';
import {
  centroid,
  decodeTfn,
  encodeTfn,
  fromCrisp,
  gradedMean,
  isTfn,
  tfn,
  tfnAdd,
  tfnAddScalar,
  tfnArithmeticMean,
  tfnDivide,
  tfnDivideByScalar,
  tfnEquals,
  tfnGeometricMean,
  tfnMax,
  tfnMin,
  tfnMinMeanMax,
  tfnMultiply,
  tfnMultiplyByScalar,
  tfnPower,
  tfnProduct,
  tfnScalarDividedBy,
  tfnScalarMinus,
  tfnSubtract,
  tfnSubtractScalar,
  tfnSum,
} from './index';

fc.configureGlobal({ seed: 20261115, numRuns: 500 });

const number = (min: number, max: number) =>
  fc.double({ min, max, noNaN: true, noDefaultInfinity: true });

/** Crisp numbers of everyday magnitude, with both signs and zero. */
const anyNumber = fc.oneof(number(-1e6, 1e6), fc.integer({ min: -20, max: 20 }));
const positiveNumber = fc.oneof(number(1e-3, 1e6), fc.integer({ min: 1, max: 20 }));
const nonZeroNumber = fc.oneof(
  positiveNumber,
  positiveNumber.map((x) => -x),
);

const tfnFrom = (component: fc.Arbitrary<number>): fc.Arbitrary<TFN> =>
  fc.tuple(component, component, component).map(([a, b, c]) => {
    const [l, m, u] = [a, b, c].sort((x, y) => x - y) as [number, number, number];
    return tfn(l, m, u);
  });

/** Bases and exponents of the power rule: small enough that no power overflows. */
const smallNonNegative = fc.oneof(number(0, 20), fc.integer({ min: 0, max: 5 }));

const anyTfn = tfnFrom(anyNumber);
const positiveTfn = tfnFrom(positiveNumber);
const nonNegativeTfn = tfnFrom(fc.oneof(positiveNumber, fc.constant(0)));
/** A TFN whose support does not contain zero: entirely positive or entirely negative. */
const zeroFreeTfn = fc.oneof(
  positiveTfn,
  positiveTfn.map((a) => tfn(-a.u, -a.m, -a.l)),
);

/** A point of the support of a TFN: `l + t·(u − l)`, clamped against rounding. */
const pointOf = (a: TFN, t: number): number => Math.min(Math.max(a.l + t * (a.u - a.l), a.l), a.u);
const unit = number(0, 1);

/** Exact equality that treats `-0` and `+0` as equal, as `===` does. */
function expectSame(actual: TFN, expected: TFN): void {
  if (!tfnEquals(actual, expected)) expect(actual).toEqual(expected);
}

function expectCrisp(actual: TFN, crisp: number): void {
  expectSame(actual, { l: crisp, m: crisp, u: crisp });
}

describe('degenerate TFNs (x, x, x) equal crisp results', () => {
  it('binary arithmetic', () => {
    fc.assert(
      fc.property(anyNumber, anyNumber, (x, y) => {
        expectCrisp(tfnAdd(fromCrisp(x), fromCrisp(y)), x + y);
        expectCrisp(tfnSubtract(fromCrisp(x), fromCrisp(y)), x - y);
        expectCrisp(tfnMultiply(fromCrisp(x), fromCrisp(y)), x * y);
      }),
    );
    fc.assert(
      fc.property(anyNumber, nonZeroNumber, (x, y) => {
        expectCrisp(tfnDivide(fromCrisp(x), fromCrisp(y)), x / y);
      }),
    );
  });

  it('scalar arithmetic', () => {
    fc.assert(
      fc.property(anyNumber, anyNumber, (x, k) => {
        expectCrisp(tfnAddScalar(fromCrisp(x), k), x + k);
        expectCrisp(tfnSubtractScalar(fromCrisp(x), k), x - k);
        expectCrisp(tfnScalarMinus(k, fromCrisp(x)), k - x);
        expectCrisp(tfnMultiplyByScalar(fromCrisp(x), k), x * k);
      }),
    );
    fc.assert(
      fc.property(anyNumber, nonZeroNumber, (x, k) => {
        expectCrisp(tfnDivideByScalar(fromCrisp(x), k), x / k);
        expectCrisp(tfnScalarDividedBy(x, fromCrisp(k)), x / k);
      }),
    );
  });

  it('aggregation', () => {
    fc.assert(
      fc.property(fc.array(anyNumber, { minLength: 1, maxLength: 12 }), (xs) => {
        const values = xs.map(fromCrisp);
        expectCrisp(tfnSum(values), sum(xs));
        expectCrisp(tfnMin(values), minimum(xs));
        expectCrisp(tfnMax(values), maximum(xs));
        expectCrisp(tfnArithmeticMean(values), mean(xs));
        expectCrisp(tfnProduct(values), product(xs));
        const combined = tfnMinMeanMax(values);
        expect(combined.l === minimum(xs)).toBe(true);
        expect(combined.u === maximum(xs)).toBe(true);
        expect(Math.abs(combined.m - mean(xs))).toBeLessThanOrEqual(1e-9);
      }),
    );
    fc.assert(
      fc.property(fc.array(positiveNumber, { minLength: 1, maxLength: 12 }), (xs) => {
        expectCrisp(tfnGeometricMean(xs.map(fromCrisp)), Math.pow(product(xs), 1 / xs.length));
      }),
    );
  });

  it('power', () => {
    fc.assert(
      fc.property(smallNonNegative, smallNonNegative, (x, w) => {
        expectCrisp(tfnPower(fromCrisp(x), fromCrisp(w)), x ** w);
      }),
    );
  });

  it('defuzzification returns x itself', () => {
    fc.assert(
      fc.property(anyNumber, (x) => {
        expect(gradedMean(fromCrisp(x)) === x).toBe(true);
        expect(centroid(fromCrisp(x)) === x).toBe(true);
      }),
    );
  });
});

describe('closure: valid operands give a valid TFN', () => {
  it('arithmetic on TFNs of any sign', () => {
    fc.assert(
      fc.property(anyTfn, anyTfn, zeroFreeTfn, anyNumber, nonZeroNumber, (a, b, d, k, nz) => {
        const results = [
          tfnAdd(a, b),
          tfnSubtract(a, b),
          tfnMultiply(a, b),
          tfnDivide(a, d),
          tfnAddScalar(a, k),
          tfnSubtractScalar(a, k),
          tfnScalarMinus(k, a),
          tfnMultiplyByScalar(a, k),
          tfnDivideByScalar(a, nz),
          tfnScalarDividedBy(k, d),
        ];
        results.forEach((result, index) => expect(isTfn(result), `operation ${index}`).toBe(true));
      }),
    );
  });

  it('aggregation', () => {
    fc.assert(
      fc.property(fc.array(anyTfn, { minLength: 1, maxLength: 12 }), (values) => {
        for (const aggregate of [tfnSum, tfnMin, tfnMax, tfnArithmeticMean, tfnMinMeanMax]) {
          expect(isTfn(aggregate(values)), aggregate.name).toBe(true);
        }
      }),
    );
    fc.assert(
      fc.property(fc.array(nonNegativeTfn, { minLength: 1, maxLength: 12 }), (values) => {
        expect(isTfn(tfnGeometricMean(values))).toBe(true);
        expect(isTfn(tfnProduct(values))).toBe(true);
      }),
    );
    fc.assert(
      fc.property(tfnFrom(smallNonNegative), tfnFrom(smallNonNegative), (base, exponent) => {
        expect(isTfn(tfnPower(base, exponent))).toBe(true);
      }),
    );
  });
});

describe('the approximation is exact at the peak and encloses the support', () => {
  it('the modal value of a result is the crisp operation on the modal values', () => {
    fc.assert(
      fc.property(anyTfn, anyTfn, zeroFreeTfn, (a, b, d) => {
        expect(tfnAdd(a, b).m === a.m + b.m).toBe(true);
        expect(tfnSubtract(a, b).m === a.m - b.m).toBe(true);
        expect(tfnMultiply(a, b).m === a.m * b.m).toBe(true);
        expect(tfnDivide(a, d).m === a.m / d.m).toBe(true);
      }),
    );
  });

  it('x ∘ y lies in the support of a ∘ b for every x in a and y in b', () => {
    fc.assert(
      fc.property(anyTfn, anyTfn, zeroFreeTfn, unit, unit, (a, b, d, s, t) => {
        const x = pointOf(a, s);
        const y = pointOf(b, t);
        const z = pointOf(d, t);
        const inside = (result: TFN, value: number): boolean =>
          result.l <= value && value <= result.u;
        expect(inside(tfnAdd(a, b), x + y)).toBe(true);
        expect(inside(tfnSubtract(a, b), x - y)).toBe(true);
        expect(inside(tfnMultiply(a, b), x * y)).toBe(true);
        expect(inside(tfnDivide(a, d), x / z)).toBe(true);
      }),
    );
  });

  it('gives the textbook formulas for positive operands', () => {
    fc.assert(
      fc.property(nonNegativeTfn, nonNegativeTfn, positiveTfn, (a, b, d) => {
        expectSame(tfnMultiply(a, b), { l: a.l * b.l, m: a.m * b.m, u: a.u * b.u });
        expectSame(tfnDivide(a, d), { l: a.l / d.u, m: a.m / d.m, u: a.u / d.l });
      }),
    );
  });
});

describe('algebraic laws', () => {
  it('addition and multiplication are commutative', () => {
    fc.assert(
      fc.property(anyTfn, anyTfn, (a, b) => {
        expectSame(tfnAdd(a, b), tfnAdd(b, a));
        expectSame(tfnMultiply(a, b), tfnMultiply(b, a));
      }),
    );
  });

  it('(0, 0, 0) and (1, 1, 1) are neutral', () => {
    fc.assert(
      fc.property(anyTfn, (a) => {
        expectSame(tfnAdd(a, fromCrisp(0)), a);
        expectSame(tfnSubtract(a, fromCrisp(0)), a);
        expectSame(tfnMultiply(a, fromCrisp(1)), a);
        expectSame(tfnDivide(a, fromCrisp(1)), a);
      }),
    );
  });

  it('subtraction is addition of the negated TFN, and scalar forms agree with TFN forms', () => {
    fc.assert(
      fc.property(anyTfn, anyTfn, anyNumber, nonZeroNumber, (a, b, k, nz) => {
        expectSame(tfnSubtract(a, b), tfnAdd(a, tfnScalarMinus(0, b)));
        expectSame(tfnAddScalar(a, k), tfnAdd(a, fromCrisp(k)));
        expectSame(tfnSubtractScalar(a, k), tfnSubtract(a, fromCrisp(k)));
        expectSame(tfnScalarMinus(k, a), tfnSubtract(fromCrisp(k), a));
        expectSame(tfnMultiplyByScalar(a, k), tfnMultiply(a, fromCrisp(k)));
        expectSame(tfnDivideByScalar(a, nz), tfnDivide(a, fromCrisp(nz)));
      }),
    );
    fc.assert(
      fc.property(anyNumber, zeroFreeTfn, (k, d) => {
        expectSame(tfnScalarDividedBy(k, d), tfnDivide(fromCrisp(k), d));
      }),
    );
  });

  it('extremes are idempotent and independent of the order of the operands', () => {
    fc.assert(
      fc.property(fc.array(anyTfn, { minLength: 1, maxLength: 12 }), (values) => {
        const reversed = [...values].reverse();
        expectSame(tfnMin(values), tfnMin(reversed));
        expectSame(tfnMax(values), tfnMax(reversed));
        expectSame(tfnMin([tfnMin(values), ...values]), tfnMin(values));
        expectSame(tfnMax([tfnMax(values), ...values]), tfnMax(values));
      }),
    );
  });

  it('the geometric mean never exceeds the arithmetic mean', () => {
    fc.assert(
      fc.property(fc.array(nonNegativeTfn, { minLength: 1, maxLength: 12 }), (values) => {
        const geometric = tfnGeometricMean(values);
        const arithmetic = tfnArithmeticMean(values);
        for (const key of ['l', 'm', 'u'] as const) {
          expect(geometric[key]).toBeLessThanOrEqual(arithmetic[key] * (1 + 1e-12));
        }
      }),
    );
  });
});

describe('defuzzification', () => {
  it('lies in the support and between the peak and the middle of the support', () => {
    fc.assert(
      fc.property(anyTfn, (a) => {
        const tolerance = 1e-9 * Math.max(1, Math.abs(a.l), Math.abs(a.u));
        for (const value of [gradedMean(a), centroid(a)]) {
          expect(value).toBeGreaterThanOrEqual(a.l - tolerance);
          expect(value).toBeLessThanOrEqual(a.u + tolerance);
        }
        expect(Math.abs(gradedMean(a) - (a.l + 4 * a.m + a.u) / 6)).toBeLessThanOrEqual(tolerance);
        expect(Math.abs(centroid(a) - (a.l + a.m + a.u) / 3)).toBeLessThanOrEqual(tolerance);
      }),
    );
  });

  it('is linear: df(a ⊕ b) = df(a) + df(b) and df(k·a) = k·df(a)', () => {
    fc.assert(
      fc.property(anyTfn, anyTfn, anyNumber, (a, b, k) => {
        for (const df of [gradedMean, centroid]) {
          const scale = Math.max(1, Math.abs(a.l), Math.abs(a.u), Math.abs(b.l), Math.abs(b.u));
          expect(Math.abs(df(tfnAdd(a, b)) - (df(a) + df(b)))).toBeLessThanOrEqual(1e-9 * scale);
          expect(Math.abs(df(tfnMultiplyByScalar(a, k)) - k * df(a))).toBeLessThanOrEqual(
            1e-9 * scale * Math.max(1, Math.abs(k)),
          );
        }
      }),
    );
  });
});

describe('trace encoding', () => {
  it('round-trips every valid TFN, also through JSON', () => {
    fc.assert(
      fc.property(anyTfn, (a) => {
        const encoded = encodeTfn(a);
        expectSame(decodeTfn(encoded), a);
        expect(JSON.parse(JSON.stringify(encoded))).toEqual(encoded);
      }),
    );
  });
});

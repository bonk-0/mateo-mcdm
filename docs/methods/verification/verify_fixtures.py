#!/usr/bin/env python3
"""Independent cross-check of the Phase 1 method fixtures.

Recomputes every method from each fixture's `input` with a small, dependency-free
reference implementation and compares the result with every value the paper prints
(`steps.*` and `result.*`). A printed value matches when

    |recomputed - printed| <= 0.5 * 10^-decimals  (+1e-9)

which is the golden-test tolerance described in docs/methods/fixtures.md. Every
mismatch must be listed in the fixture's `deviations`; a listed deviation that no
longer deviates is also an error.

This script is a review aid for P1.4, not the engine. It is not part of CI.

Usage:
    python3 docs/methods/verification/verify_fixtures.py            # check
    python3 docs/methods/verification/verify_fixtures.py --list     # print every mismatch
"""

from __future__ import annotations

import glob
import json
import math
import os
import sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
FIXTURES = os.path.join(ROOT, 'packages', 'methods', '*', 'fixtures', '*.json')


# ---------------------------------------------------------------- helpers


def mean(xs):
    return sum(xs) / len(xs)


def pop_std(xs):
    m = mean(xs)
    return math.sqrt(sum((x - m) ** 2 for x in xs) / len(xs))


def pearson(a, b):
    ma, mb = mean(a), mean(b)
    cov = sum((x - ma) * (y - mb) for x, y in zip(a, b))
    return cov / math.sqrt(sum((x - ma) ** 2 for x in a) * sum((y - mb) ** 2 for y in b))


def columns(matrix):
    return [list(c) for c in zip(*matrix)]


def competition_rank(scores):
    """Standard competition ranking (1, 2, 2, 4), highest score first."""
    return [1 + sum(1 for t in scores if t > s + 1e-12) for s in scores]


# TFN helpers: a TFN is [l, m, u]
def t_add(a, b):
    return [a[0] + b[0], a[1] + b[1], a[2] + b[2]]


def t_div(a, b):
    """Approximate TFN division (l1/u2, m1/m2, u1/l2)."""
    return [a[0] / b[2], a[1] / b[1], a[2] / b[0]]


def t_scale(a, k):
    return [a[0] * k, a[1] * k, a[2] * k]


def graded_mean(a):
    return (a[0] + 4 * a[1] + a[2]) / 6


def t_sum(ts):
    out = [0.0, 0.0, 0.0]
    for t in ts:
        out = t_add(out, t)
    return out


# ---------------------------------------------------------------- methods


def critic(inp, _params):
    x = inp['matrix']
    dirs = [c['direction'] for c in inp['criteria']]
    cols = columns(x)
    best = [max(c) if d == 'benefit' else min(c) for c, d in zip(cols, dirs)]
    worst = [min(c) if d == 'benefit' else max(c) for c, d in zip(cols, dirs)]
    norm = [[(v - worst[j]) / (best[j] - worst[j]) for j, v in enumerate(row)] for row in x]
    ncols = columns(norm)
    sd = [pop_std(c) for c in ncols]
    r = [[pearson(a, b) for b in ncols] for a in ncols]
    info = [sd[j] * sum(1 - r[j][k] for k in range(len(ncols))) for j in range(len(ncols))]
    w = [c / sum(info) for c in info]
    return {
        'steps': {'normalizedMatrix': norm, 'standardDeviations': sd, 'correlationMatrix': r},
        'result': {'weights': w},
    }


def merec(inp, _params):
    x = inp['matrix']
    dirs = [c['direction'] for c in inp['criteria']]
    cols = columns(x)
    n = [
        [(min(cols[j]) / v) if dirs[j] == 'benefit' else (v / max(cols[j])) for j, v in enumerate(row)]
        for row in x
    ]
    m = len(dirs)
    a = [[abs(math.log(v)) for v in row] for row in n]
    s = [math.log(1 + sum(row) / m) for row in a]
    sp = [[math.log(1 + (sum(row) - row[j]) / m) for j in range(m)] for row in a]
    e = [sum(abs(sp[i][j] - s[i]) for i in range(len(x))) for j in range(m)]
    return {
        'steps': {
            'normalizedMatrix': n,
            'overallPerformance': s,
            'removalPerformance': sp,
            'removalEffects': e,
        },
        'result': {'weights': [v / sum(e) for v in e]},
    }


def swara(inp, params, variant):
    if variant == 'classical':
        s = inp['comparativeImportance']
        k = [1.0] + [1 + v for v in s[1:]]
        q = [1.0]
        for kj in k[1:]:
            q.append(q[-1] / kj)
        return {
            'steps': {'coefficients': k, 'recalculatedWeights': q},
            'result': {'weights': [v / sum(q) for v in q]},
        }
    scale = {t['abbreviation']: t['tfn'] for t in inp['scale']}
    s = [None] + [scale[a] for a in inp['assessments'][1:]]
    one = [1.0, 1.0, 1.0]
    k = [one] + [t_add(v, one) for v in s[1:]]
    q = [one]
    for kj in k[1:]:
        q.append(t_div(q[-1], kj))
    total = t_sum(q)
    w = [t_div(v, total) for v in q]
    assert params.get('defuzzification') == 'graded-mean'
    return {
        'steps': {
            'coefficients': k,
            'recalculatedWeights': q,
            'recalculatedWeightsSum': total,
            'fuzzyWeights': w,
        },
        'result': {'weights': [graded_mean(v) for v in w]},
    }


def marcos(inp, _params):
    x = inp['matrix']
    dirs = [c['direction'] for c in inp['criteria']]
    w = inp['weights']
    cols = columns(x)
    aai = [min(c) if d == 'benefit' else max(c) for c, d in zip(cols, dirs)]
    ai = [max(c) if d == 'benefit' else min(c) for c, d in zip(cols, dirs)]
    ext = [aai] + x + [ai]
    norm = [[(v / ai[j]) if dirs[j] == 'benefit' else (ai[j] / v) for j, v in enumerate(row)] for row in ext]
    weighted = [[v * w[j] for j, v in enumerate(row)] for row in norm]
    s = [sum(row) for row in weighted]
    s_aai, s_ai, si = s[0], s[-1], s[1:-1]
    km = [v / s_aai for v in si]
    kp = [v / s_ai for v in si]
    fkm = [p / (p + m) for p, m in zip(kp, km)]
    fkp = [m / (p + m) for p, m in zip(kp, km)]
    fk = [(p + m) / (1 + (1 - a) / a + (1 - b) / b) for p, m, a, b in zip(kp, km, fkp, fkm)]
    rows = ['AAI'] + inp['alternatives'] + ['AI']
    return {
        'rows': rows,
        'steps': {
            'extendedMatrix': ext,
            'normalizedMatrix': norm,
            'weightedMatrix': weighted,
            'sums': s,
            'kMinus': km,
            'kPlus': kp,
            'fKMinus': fkm,
            'fKPlus': fkp,
            'fK': fk,
        },
        'result': {'ranking': competition_rank(fk)},
    }


def fuzzy_marcos(inp, params):
    assert params.get('defuzzification') == 'graded-mean'
    x = inp['matrix']
    dirs = [c['direction'] for c in inp['criteria']]
    w = inp['weights']
    n_c = len(dirs)

    def comp(j, k, f):
        return f(row[j][k] for row in x)

    aai = [[comp(j, k, min if dirs[j] == 'benefit' else max) for k in range(3)] for j in range(n_c)]
    ide = [[comp(j, k, max if dirs[j] == 'benefit' else min) for k in range(3)] for j in range(n_c)]
    ext = [aai] + x + [ide]

    def normalize(v, j):
        d = ide[j]
        if dirs[j] == 'benefit':
            return [v[0] / d[2], v[1] / d[2], v[2] / d[2]]
        return [d[0] / v[2], d[0] / v[1], d[0] / v[0]]

    norm = [[normalize(v, j) for j, v in enumerate(row)] for row in ext]
    weighted = [[[n[k] * w[j][k] for k in range(3)] for j, n in enumerate(row)] for row in norm]
    s = [t_sum(row) for row in weighted]
    s_aai, s_id, si = s[0], s[-1], s[1:-1]
    km = [t_div(v, s_aai) for v in si]
    kp = [t_div(v, s_id) for v in si]
    t = [t_add(a, b) for a, b in zip(km, kp)]
    d = [max(v[k] for v in t) for k in range(3)]
    df = graded_mean(d)
    fkp = [t_scale(v, 1 / df) for v in km]
    fkm = [t_scale(v, 1 / df) for v in kp]
    ckm, ckp = [graded_mean(v) for v in km], [graded_mean(v) for v in kp]
    cfkm, cfkp = [graded_mean(v) for v in fkm], [graded_mean(v) for v in fkp]
    fk = [
        (p + m) / (1 + (1 - a) / a + (1 - b) / b) for p, m, a, b in zip(ckp, ckm, cfkp, cfkm)
    ]
    alts = inp['alternatives']
    rank = competition_rank(fk)
    order = sorted(range(len(alts)), key=lambda i: -fk[i])
    position = {alts[i]: rank[i] for i in order}
    rows = ['AAI'] + alts + ['ID']
    return {
        'rows': rows,
        'steps': {
            'weights': w,
            'initialMatrix': x,
            'normalizedMatrix': norm,
            'weightedMatrix': weighted,
            'sums': s,
            'kMinus': km,
            'kPlus': kp,
            't': t,
            'd': d,
            'dfCrisp': df,
            'fKMinus': fkm,
            'fKPlus': fkp,
            'crispKMinus': ckm,
            'crispKPlus': ckp,
            'crispFKMinus': cfkm,
            'crispFKPlus': cfkp,
            'fK': fk,
        },
        'result': {'ranking': rank, 'positionsInText': position},
    }


def run(fx):
    method, variant = fx['method'], fx['variant']
    inp, params = fx['input'], fx.get('parameters', {})
    if method == 'critic':
        return critic(inp, params)
    if method == 'merec':
        return merec(inp, params)
    if method == 'swara':
        return swara(inp, params, variant)
    if method == 'marcos':
        return marcos(inp, params)
    if method == 'fuzzy-marcos':
        return fuzzy_marcos(inp, params)
    raise ValueError(f'unknown method {method}')


# ---------------------------------------------------------------- comparison


def select_rows(block, computed, rows_all):
    """Pick the computed rows that the printed table shows, by row label."""
    labels = block.get('rows')
    if labels is None:
        return computed
    if len(computed) == len(rows_all):
        index = {r: i for i, r in enumerate(rows_all)}
    else:  # alternative-only vectors
        alts = rows_all[1:-1]
        index = {r: i for i, r in enumerate(alts)}
    return [computed[index[r]] for r in labels]


def walk(printed, computed, path, decimals, out):
    if printed is None:
        return
    if isinstance(printed, dict):
        for key, value in printed.items():
            walk(value, computed[key], f'{path}.{key}', decimals, out)
        return
    if isinstance(printed, list):
        assert isinstance(computed, list) and len(computed) == len(printed), path
        for i, (p, c) in enumerate(zip(printed, computed)):
            walk(p, c, f'{path}[{i}]', decimals, out)
        return
    tol = 0.5 * 10 ** (-decimals) + 1e-9 if decimals is not None else 1e-9
    if abs(printed - computed) > tol:
        out.append((path, printed, computed))


def check(path):
    fx = json.load(open(path, encoding='utf-8'))
    got = run(fx)
    rows_all = got.get('rows')
    mismatches = []
    for section in ('steps', 'result'):
        for name, block in fx[section].items():
            computed = got[section][name]
            if 'rows' in block and rows_all is not None:
                computed = select_rows(block, computed, rows_all)
            values = block['values']
            decimals = block.get('decimals')
            if isinstance(values, dict):  # label -> value
                for label, v in values.items():
                    walk(v, computed[label], f'{section}.{name}.values.{label}', decimals, mismatches)
            else:
                walk(values, computed, f'{section}.{name}.values', decimals, mismatches)
    return fx, mismatches


def main():
    list_all = '--list' in sys.argv
    failed = False
    for path in sorted(glob.glob(FIXTURES)):
        fx, mismatches = check(path)
        documented = {d['path'] for d in fx.get('deviations', [])}
        found = {m[0] for m in mismatches}
        undocumented = [m for m in mismatches if m[0] not in documented]
        stale = sorted(documented - found)
        rel = os.path.relpath(path, ROOT)
        status = 'ok' if not undocumented and not stale else 'FAIL'
        failed |= status == 'FAIL'
        print(f'{status:4}  {rel}: {len(mismatches)} documented deviation(s)')
        for p, printed, computed in mismatches if list_all else undocumented:
            print(f'      {p}: printed {printed}, recomputed {computed:.6g}')
        for p in stale:
            print(f'      stale deviation (now matches): {p}')
    sys.exit(1 if failed else 0)


if __name__ == '__main__':
    main()

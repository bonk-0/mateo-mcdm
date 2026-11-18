"""Reference implementations of the Phase 2 methods for verify_fixtures.py.

Each function takes a fixture's `input` and `parameters` and returns
{'steps': {...}, 'result': {...}} keyed like the fixture. These are review aids
written straight from the equations in docs/methods/<method>.md, not the engine.
"""

from __future__ import annotations

import math

from lp import minimize_lp


def columns(matrix):
    return [list(c) for c in zip(*matrix)]


def rank_desc(scores):
    """Standard competition ranking, highest score first."""
    return [1 + sum(1 for t in scores if t > s + 1e-12) for s in scores]


def rank_asc(scores):
    """Standard competition ranking, lowest score first."""
    return [1 + sum(1 for t in scores if t < s - 1e-12) for s in scores]


def directions(inp):
    return [c['direction'] for c in inp['criteria']]


# ---------------------------------------------------------------- weighting


def lopcow(inp, _params):
    x = inp['matrix']
    dirs = directions(inp)
    cols = columns(x)
    m = len(x)
    r = [
        [
            (v - min(cols[j])) / (max(cols[j]) - min(cols[j]))
            if dirs[j] == 'benefit'
            else (max(cols[j]) - v) / (max(cols[j]) - min(cols[j]))
            for j, v in enumerate(row)
        ]
        for row in x
    ]
    rc = columns(r)
    mean_sq = [sum(v * v for v in c) / m for c in rc]
    sd = []
    for c in rc:
        mu = sum(c) / m
        sd.append(math.sqrt(sum((v - mu) ** 2 for v in c) / (m - 1)))  # sample standard deviation
    pv = [abs(math.log(math.sqrt(q) / s) * 100) for q, s in zip(mean_sq, sd)]
    return {
        'steps': {
            'normalizedMatrix': r,
            'meanSquares': mean_sq,
            'standardDeviations': sd,
            'percentageValues': pv,
            'percentageValuesSum': sum(pv),
        },
        'result': {'weights': [p / sum(pv) for p in pv]},
    }


def fucom(inp, _params):
    """Crisp FUCOM. With priorities derived from significance values the chain
    w_k = phi_k * w_(k+1) satisfies both conditions exactly, so chi = 0 and the
    optimisation model has this unique solution."""
    order = inp['ranking']
    if 'significance' in inp:
        s = inp['significance']
        phi = [s[k + 1] / s[k] for k in range(len(s) - 1)]
    else:
        phi = inp['comparativePriorities']
    rel = [1.0]
    for p in reversed(phi):
        rel.insert(0, rel[0] * p)
    total = sum(rel)
    w_ranked = [v / total for v in rel]
    ids = [c['id'] for c in inp['criteria']]
    weights = [w_ranked[order.index(i)] for i in ids]
    chi = max(
        [abs(w_ranked[k] / w_ranked[k + 1] - phi[k]) for k in range(len(phi))]
        + [abs(w_ranked[k] / w_ranked[k + 2] - phi[k] * phi[k + 1]) for k in range(len(phi) - 1)]
    )
    return {
        'steps': {
            'comparativePriorities': phi,
            'transitivePriorities': [phi[k] * phi[k + 1] for k in range(len(phi) - 1)],
        },
        'result': {'weights': weights, 'chi': chi},
    }


def _bwm_rows(bo, ow, b, w, xi):
    """Linear rows A w <= 0 of the BWM feasibility problem at a fixed xi:
    |w_B - a_Bj w_j| <= xi w_j and |w_j - a_jW w_W| <= xi w_W."""
    n = len(bo)
    rows = []
    for j in range(n):
        for s in (1, -1):
            r = [0.0] * n
            r[b] += s
            r[j] -= s * bo[j] + xi
            rows.append(r)
            r = [0.0] * n
            r[j] += s
            r[w] -= s * ow[j] + xi
            rows.append(r)
    return rows


def bwm_consistency_index(a_bw):
    """Rezaei (2015): the largest xi for a_BW, root of xi^2 - (1 + 2a) xi + (a^2 - a) = 0."""
    return ((1 + 2 * a_bw) - math.sqrt((1 + 2 * a_bw) ** 2 - 4 * (a_bw * a_bw - a_bw))) / 2


def bwm(inp, _params):
    ids = [c['id'] for c in inp['criteria']]
    b, w = ids.index(inp['best']), ids.index(inp['worst'])
    bo, ow = inp['bestToOthers'], inp['othersToWorst']
    n = len(ids)
    eq = ([[1.0] * n], [1.0])

    # Nonlinear model (Rezaei 2015): bisection on xi; feasibility at fixed xi is linear.
    def feasible(xi):
        return minimize_lp([0.0] * n, _bwm_rows(bo, ow, b, w, xi), [0.0] * (4 * n), *eq) is not None

    lo, hi = 0.0, float(max(bo) + max(ow))
    for _ in range(60):
        mid = (lo + hi) / 2
        lo, hi = (lo, mid) if feasible(mid) else (mid, hi)
    xi = hi + 1e-8  # a hair above the optimum keeps the interval LPs feasible
    rows = _bwm_rows(bo, ow, b, w, xi)
    intervals = []
    for j in range(n):
        e = [0.0] * n
        e[j] = 1.0
        low = minimize_lp(e, rows, [0.0] * len(rows), *eq)
        high = minimize_lp([-v for v in e], rows, [0.0] * len(rows), *eq)
        intervals.append([low[0], -high[0]])
    centers = [(a + c) / 2 for a, c in intervals]

    # Linear model (Rezaei 2016): variables w_1..w_n, xi_L.
    a_ub, b_ub = [], []
    for j in range(n):
        for s in (1, -1):
            r = [0.0] * (n + 1)
            r[b] += s
            r[j] -= s * bo[j]
            r[n] = -1.0
            a_ub.append(r)
            r = [0.0] * (n + 1)
            r[j] += s
            r[w] -= s * ow[j]
            r[n] = -1.0
            a_ub.append(r)
            b_ub += [0.0, 0.0]
    obj, sol = minimize_lp([0.0] * n + [1.0], a_ub, b_ub, [[1.0] * n + [0.0]], [1.0])
    a_bw = bo[w]
    return {
        'steps': {
            'nonlinearXi': xi,
            'nonlinearIntervals': intervals,
            'consistencyIndex': bwm_consistency_index(a_bw),
        },
        'result': {
            'nonlinearWeights': centers,
            'consistencyRatio': xi / bwm_consistency_index(a_bw),
            'linearWeights': sol[:n],
            'linearXi': obj,
        },
    }


# ---------------------------------------------------------------- ranking


def edas(inp, _params):
    x = inp['matrix']
    dirs = directions(inp)
    wts = inp['weights']
    n = len(x)
    av = [sum(c) / n for c in columns(x)]

    def pos(v, j):
        d = v - av[j] if dirs[j] == 'benefit' else av[j] - v
        return max(0.0, d) / av[j]

    def neg(v, j):
        d = av[j] - v if dirs[j] == 'benefit' else v - av[j]
        return max(0.0, d) / av[j]

    pda = [[pos(v, j) for j, v in enumerate(row)] for row in x]
    nda = [[neg(v, j) for j, v in enumerate(row)] for row in x]
    sp = [sum(wts[j] * v for j, v in enumerate(row)) for row in pda]
    sn = [sum(wts[j] * v for j, v in enumerate(row)) for row in nda]
    nsp = [v / max(sp) for v in sp]
    nsn = [1 - v / max(sn) for v in sn]
    score = [(a + c) / 2 for a, c in zip(nsp, nsn)]
    return {
        'steps': {
            'averageSolution': av,
            'positiveDistances': pda,
            'negativeDistances': nda,
            'weightedPositiveSums': sp,
            'normalizedPositiveSums': nsp,
            'weightedNegativeSums': sn,
            'normalizedNegativeSums': nsn,
        },
        'result': {'appraisalScores': score, 'ranking': rank_desc(score)},
    }


def linear_max_normalize(x, dirs):
    """x / max for benefit and min / x for cost criteria (CODAS, WASPAS)."""
    cols = columns(x)
    return [
        [v / max(cols[j]) if dirs[j] == 'benefit' else min(cols[j]) / v for j, v in enumerate(row)]
        for row in x
    ]


def codas(inp, params):
    x = inp['matrix']
    wts = inp['weights']
    tau = params['tau']
    n = linear_max_normalize(x, directions(inp))
    r = [[wts[j] * v for j, v in enumerate(row)] for row in n]
    ns = [min(c) for c in columns(r)]
    e = [math.sqrt(sum((v - ns[j]) ** 2 for j, v in enumerate(row))) for row in r]
    t = [sum(abs(v - ns[j]) for j, v in enumerate(row)) for row in r]
    k = len(x)
    h = [
        [(e[i] - e[q]) + (1 if abs(e[i] - e[q]) >= tau else 0) * (t[i] - t[q]) for q in range(k)]
        for i in range(k)
    ]
    score = [sum(row) for row in h]
    return {
        'steps': {
            'normalizedMatrix': n,
            'weightedMatrix': r,
            'negativeIdeal': ns,
            'euclideanDistances': e,
            'taxicabDistances': t,
            'relativeAssessment': h,
        },
        'result': {'assessmentScores': score, 'ranking': rank_desc(score)},
    }


def waspas(inp, params):
    x = inp['matrix']
    wts = inp['weights']
    n = linear_max_normalize(x, directions(inp))
    q1 = [sum(wts[j] * v for j, v in enumerate(row)) for row in n]
    q2 = [math.prod(v ** wts[j] for j, v in enumerate(row)) for row in n]
    lambdas = params.get('lambdaGrid', [])
    grid = [[lam * a + (1 - lam) * b for lam in lambdas] for a, b in zip(q1, q2)]
    # Optimal lambda per alternative (Zavadskas et al. 2012, Eqs. 11-19), relative
    # error of the normalised values sigma(x) = 0.05 x.
    k = params.get('relativeError', 0.05)
    var1 = [sum((wts[j] * k * v) ** 2 for j, v in enumerate(row)) for row in n]
    var2 = [sum((p * wts[j] * k) ** 2 for j in range(len(wts))) for p in q2]
    lam = [b / (a + b) for a, b in zip(var1, var2)]
    q = [lv * a + (1 - lv) * b for lv, a, b in zip(lam, q1, q2)]
    sd_grid = [
        [math.sqrt(g * g * a + (1 - g) ** 2 * b) for g in lambdas] for a, b in zip(var1, var2)
    ]
    return {
        'steps': {
            'normalizedMatrix': n,
            'wsm': q1,
            'wpm': q2,
            'jointByLambda': grid,
            'standardDeviationByLambda': sd_grid,
            'optimalLambda': lam,
        },
        'result': {'jointCriterion': q, 'ranking': rank_desc(q)},
    }


def waspas_tfn(inp, _params):
    """Fuzzy WASPAS of Turskis et al. (2015): benefit criteria are divided by the
    largest upper value, products use the TFN power rule of their Eq. 13 and the
    crisp scores are centroids; lambda = sum P / (sum Q + sum P)."""
    x = inp['matrix']
    wts = inp['weights']
    dirs = directions(inp)
    cols = columns(x)
    norm = []
    for row in x:
        out = []
        for j, v in enumerate(row):
            if dirs[j] == 'benefit':
                top = max(t[2] for t in cols[j])
                out.append([v[0] / top, v[1] / top, v[2] / top])
            else:
                low = min(t[0] for t in cols[j])
                out.append([low / v[2], low / v[1], low / v[0]])
        norm.append(out)
    wsm = [[[v[k] * wts[j][k] for k in range(3)] for j, v in enumerate(row)] for row in norm]
    wpm = [[[v[0] ** wts[j][2], v[1] ** wts[j][1], v[2] ** wts[j][0]] for j, v in enumerate(row)] for row in norm]
    q = [[sum(c[k] for c in row) for k in range(3)] for row in wsm]
    p = [[math.prod(c[k] for c in row) for k in range(3)] for row in wpm]
    qc = [sum(t) / 3 for t in q]
    pc = [sum(t) / 3 for t in p]
    lam = sum(pc) / (sum(qc) + sum(pc))
    score = [lam * a + (1 - lam) * b for a, b in zip(qc, pc)]
    return {
        'steps': {
            'normalizedMatrix': norm,
            'wsmMatrix': wsm,
            'wpmMatrix': wpm,
            'wsm': q,
            'wpm': p,
            'crispWsm': qc,
            'crispWpm': pc,
            'lambda': lam,
        },
        'result': {'jointCriterion': score, 'ranking': rank_desc(score)},
    }


def aras(inp, _params):
    x = inp['matrix']
    wts = inp['weights']
    dirs = directions(inp)
    cols = columns(x)
    opt = inp.get('optimal') or [max(c) if d == 'benefit' else min(c) for c, d in zip(cols, dirs)]
    ext = [opt] + x
    tr = [[v if dirs[j] == 'benefit' else 1 / v for j, v in enumerate(row)] for row in ext]
    sums = [sum(c) for c in columns(tr)]
    norm = [[v / sums[j] for j, v in enumerate(row)] for row in tr]
    weighted = [[wts[j] * v for j, v in enumerate(row)] for row in norm]
    s = [sum(row) for row in weighted]
    k = [v / s[0] for v in s]
    return {
        'steps': {'normalizedMatrix': norm, 'weightedMatrix': weighted, 'optimality': s},
        'result': {'utility': k, 'ranking': rank_desc(k[1:])},
    }


def copras(inp, _params):
    x = inp['matrix']
    wts = inp['weights']
    dirs = directions(inp)
    sums = [sum(c) for c in columns(x)]
    d = [[wts[j] * v / sums[j] for j, v in enumerate(row)] for row in x]
    plus = [sum(v for j, v in enumerate(row) if dirs[j] == 'benefit') for row in d]
    minus = [sum(v for j, v in enumerate(row) if dirs[j] == 'cost') for row in d]
    inv = sum(1 / v for v in minus)
    q = [p + sum(minus) / (m * inv) for p, m in zip(plus, minus)]
    return {
        'steps': {'weightedNormalizedMatrix': d, 'sPlus': plus, 'sMinus': minus},
        'result': {
            'relativeSignificance': q,
            'utilityDegree': [100 * v / max(q) for v in q],
            'ranking': rank_desc(q),
        },
    }


def moora(inp, _params):
    x = inp['matrix']
    dirs = directions(inp)
    wts = inp.get('weights') or [1.0] * len(dirs)
    roots = [math.sqrt(sum(v * v for v in c)) for c in columns(x)]
    n = [[v / roots[j] for j, v in enumerate(row)] for row in x]
    y = [
        sum(wts[j] * v * (1 if dirs[j] == 'benefit' else -1) for j, v in enumerate(row)) for row in n
    ]
    nc = columns(n)
    ref = [max(c) if d == 'benefit' else min(c) for c, d in zip(nc, dirs)]
    dev = [[abs(ref[j] - v) for j, v in enumerate(row)] for row in n]
    mx = [max(row) for row in dev]
    return {
        'steps': {
            'squareRoots': roots,
            'normalizedMatrix': n,
            'referencePoint': ref,
            'deviations': dev,
        },
        'result': {
            'ratioSystem': y,
            'ratioSystemRanking': rank_desc(y),
            'maxDeviation': mx,
            'referencePointRanking': rank_asc(mx),
        },
    }


def vikor(inp, params):
    x = inp['matrix']
    dirs = directions(inp)
    w = inp['weights']
    w = [v / sum(w) for v in w]
    n_crit = len(dirs)
    v = params['v'] if params['v'] != 'opricovic-tzeng-2008' else (n_crit + 1) / (2 * n_crit)
    cols = columns(x)
    best = [max(c) if d == 'benefit' else min(c) for c, d in zip(cols, dirs)]
    worst = [min(c) if d == 'benefit' else max(c) for c, d in zip(cols, dirs)]
    terms = [[w[j] * (best[j] - a) / (best[j] - worst[j]) for j, a in enumerate(row)] for row in x]
    s = [sum(r) for r in terms]
    r = [max(t) for t in terms]
    q = [
        v * (a - min(s)) / (max(s) - min(s)) + (1 - v) * (b - min(r)) / (max(r) - min(r))
        for a, b in zip(s, r)
    ]
    alts = inp['alternatives']
    order = sorted(range(len(q)), key=lambda i: q[i])
    dq = 1 / (len(alts) - 1)
    first = order[0]
    c1 = q[order[1]] - q[first] >= dq
    c2 = s[first] == min(s) or r[first] == min(r)
    if not c1:
        compromise = [alts[i] for i in order if q[i] - q[first] < dq]
    elif not c2:
        compromise = [alts[first], alts[order[1]]]
    else:
        compromise = [alts[first]]
    return {
        'steps': {'best': best, 'worst': worst, 'groupUtility': s, 'individualRegret': r},
        'result': {'compromiseIndex': q, 'ranking': rank_asc(q), 'compromiseSolution': compromise},
    }


def _inverse(a):
    n = len(a)
    m = [list(row) + [1.0 if i == j else 0.0 for j in range(n)] for i, row in enumerate(a)]
    for c in range(n):
        p = max(range(c, n), key=lambda r: abs(m[r][c]))
        m[c], m[p] = m[p], m[c]
        piv = m[c][c]
        m[c] = [v / piv for v in m[c]]
        for r in range(n):
            if r != c:
                f = m[r][c]
                m[r] = [a - f * b for a, b in zip(m[r], m[c])]
    return [row[n:] for row in m]


def dematel(inp, _params):
    z = inp['directRelation']
    n = len(z)
    s = max(max(sum(row) for row in z), max(sum(c) for c in columns(z)))
    x = [[v / s for v in row] for row in z]
    inv = _inverse([[(1.0 if i == j else 0.0) - x[i][j] for j in range(n)] for i in range(n)])
    t = [[sum(x[i][k] * inv[k][j] for k in range(n)) for j in range(n)] for i in range(n)]
    d = [sum(row) for row in t]
    r = [sum(c) for c in columns(t)]
    return {
        'steps': {'normalizationConstant': s, 'normalizedMatrix': x, 'totalRelation': t},
        'result': {
            'dispatch': d,
            'receive': r,
            'prominence': [a + b for a, b in zip(d, r)],
            'relation': [a - b for a, b in zip(d, r)],
        },
    }


def copras_tfn(inp, params):
    """Fuzzy COPRAS of Yazdani et al. (2011): every TFN, weights included, is
    defuzzified by its centroid (BNP) first; crisp COPRAS follows."""
    assert params.get('defuzzification') == 'centroid'
    crisp = {
        'criteria': inp['criteria'],
        'matrix': [[sum(t) / 3 for t in row] for row in inp['matrix']],
        'weights': [sum(t) / 3 for t in inp['weights']],
    }
    out = copras(crisp, {})
    out['steps']['crispMatrix'] = crisp['matrix']
    out['steps']['crispWeights'] = crisp['weights']
    return out


METHODS = {
    'lopcow': lopcow,
    'fucom': fucom,
    'bwm': bwm,
    'edas': edas,
    'codas': codas,
    'waspas': waspas,
    'waspas/tfn': waspas_tfn,
    'aras': aras,
    'copras': copras,
    'copras/tfn': copras_tfn,
    'moora': moora,
    'vikor': vikor,
    'dematel': dematel,
}

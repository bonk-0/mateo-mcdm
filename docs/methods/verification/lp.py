"""A small dense simplex solver, enough for the BWM and FUCOM checks.

minimize c.x  subject to  A_ub x <= b_ub,  A_eq x = b_eq,  x >= 0.
Returns (objective, x) or None when infeasible. Two-phase method with Bland's
rule, so it terminates on degenerate problems. Exact enough for the problem
sizes in the fixtures (tens of variables); not a general-purpose solver.
"""

from __future__ import annotations

EPS = 1e-11


def _pivot(t, row, col):
    p = t[row][col]
    t[row] = [v / p for v in t[row]]
    for r in range(len(t)):
        if r != row and abs(t[r][col]) > EPS:
            f = t[r][col]
            t[r] = [a - f * b for a, b in zip(t[r], t[row])]


def _simplex(t, basis, n_cols):
    """Minimise the last row of tableau t (reduced costs) over the first n_cols columns."""
    while True:
        cost = t[-1]
        col = next((j for j in range(n_cols) if cost[j] < -1e-10), None)
        if col is None:
            return True
        best, row = None, None
        for r in range(len(t) - 1):
            a = t[r][col]
            if a > 1e-10:
                ratio = t[r][-1] / a
                if best is None or ratio < best - 1e-12 or (abs(ratio - best) <= 1e-12 and basis[r] < basis[row]):
                    best, row = ratio, r
        if row is None:
            return False  # unbounded
        _pivot(t, row, col)
        basis[row] = col


def minimize_lp(c, a_ub, b_ub, a_eq=(), b_eq=()):
    n = len(c)
    rows, rhs, slack = [], [], []
    for a, b in zip(a_ub, b_ub):
        rows.append(list(a))
        rhs.append(b)
        slack.append(True)
    for a, b in zip(a_eq, b_eq):
        rows.append(list(a))
        rhs.append(b)
        slack.append(False)
    m = len(rows)
    n_slack = sum(slack)
    width = n + n_slack + m  # structural, slack, artificial
    t, basis, k = [], [], 0
    for i in range(m):
        row = rows[i] + [0.0] * (n_slack + m) + [rhs[i]]
        if slack[i]:
            row[n + k] = 1.0
            k += 1
        if row[-1] < 0:
            row = [-v for v in row]
        row[n + n_slack + i] = 1.0
        t.append(row)
        basis.append(n + n_slack + i)
    # Phase 1: minimise the sum of artificials.
    t.append([0.0] * (width + 1))
    for i in range(m):
        t[-1] = [a - b for a, b in zip(t[-1], t[i])]
    for j in range(n + n_slack, width):
        t[-1][j] = 0.0
    _simplex(t, basis, n + n_slack)
    if -t[-1][-1] > 1e-9:
        return None
    # Drive remaining artificials out of the basis where possible.
    for r in range(m):
        if basis[r] >= n + n_slack:
            col = next((j for j in range(n + n_slack) if abs(t[r][j]) > 1e-9), None)
            if col is not None:
                _pivot(t, r, col)
                basis[r] = col
    # Phase 2.
    cost = list(c) + [0.0] * (width - n) + [0.0]
    for r in range(m):
        if basis[r] < width and abs(cost[basis[r]]) > 0:
            f = cost[basis[r]]
            cost = [a - f * b for a, b in zip(cost, t[r])]
    t[-1] = cost
    for j in range(n + n_slack, width):
        t[-1][j] = 0.0
    if not _simplex(t, basis, n + n_slack):
        return None
    x = [0.0] * width
    for r in range(m):
        x[basis[r]] = t[r][-1]
    return sum(ci * xi for ci, xi in zip(c, x[:n])), x[:n]

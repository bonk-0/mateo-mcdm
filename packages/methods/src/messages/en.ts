/**
 * English texts for the keys the methods of this package emit (ICU message format).
 * English is the source language; `tr.ts` must define exactly the same keys.
 */
export const en = {
  'methods.common.forBenefitCriteria': 'for benefit criteria',
  'methods.common.forCostCriteria': 'for cost criteria',

  // ------------------------------------------------------------ MARCOS
  'methods.marcos.name': 'MARCOS',
  'methods.marcos.rows.antiIdeal': 'Anti-ideal solution (AAI)',
  'methods.marcos.rows.ideal': 'Ideal solution (AI)',
  'methods.marcos.columns.S': 'Sum S_i',
  'methods.marcos.columns.kMinus': 'Utility degree K⁻',
  'methods.marcos.columns.kPlus': 'Utility degree K⁺',
  'methods.marcos.columns.fKMinus': 'Utility function f(K⁻)',
  'methods.marcos.columns.fKPlus': 'Utility function f(K⁺)',
  'methods.marcos.columns.fK': 'Final utility f(K)',
  'methods.marcos.columns.rank': 'Rank',
  'methods.marcos.parameters.normalizeWeights.label': 'Normalize weights',
  'methods.marcos.parameters.normalizeWeights.description':
    'Divide every weight by the sum of the weights before they are used. Only the weighted matrix and the sums change; the utility degrees, utility functions and the ranking stay the same.',
  'methods.marcos.steps.initial-matrix.name': 'Initial decision matrix',
  'methods.marcos.steps.initial-matrix.explanation':
    'The performance of every alternative on every criterion, as entered.',
  'methods.marcos.steps.weights.name': 'Criterion weights',
  'methods.marcos.steps.weights.explanation': 'The importance of each criterion, as entered.',
  'methods.marcos.steps.normalized-weights.name': 'Normalized weights',
  'methods.marcos.steps.normalized-weights.explanation':
    'Each weight divided by the sum of all weights, so that the weights sum to 1.',
  'methods.marcos.steps.extended-matrix.name': 'Extended matrix',
  'methods.marcos.steps.extended-matrix.explanation':
    'The anti-ideal solution (the worst value of every criterion) is added as the first row and the ideal solution (the best value) as the last row. For a benefit criterion the best value is the largest; for a cost criterion it is the smallest.',
  'methods.marcos.steps.normalized-matrix.name': 'Normalized matrix',
  'methods.marcos.steps.normalized-matrix.explanation':
    'Every value is compared with the ideal solution: divided by it for benefit criteria, and divided into it for cost criteria. The ideal row becomes 1 everywhere.',
  'methods.marcos.steps.weighted-matrix.name': 'Weighted normalized matrix',
  'methods.marcos.steps.weighted-matrix.explanation':
    'Every normalized value multiplied by the weight of its criterion.',
  'methods.marcos.steps.sums.name': 'Sums S_i',
  'methods.marcos.steps.sums.explanation':
    'The sum of each row of the weighted matrix, including the anti-ideal and ideal rows.',
  'methods.marcos.steps.utility-degrees.name': 'Utility degrees',
  'methods.marcos.steps.utility-degrees.explanation':
    'K⁻ compares each alternative with the anti-ideal solution and K⁺ with the ideal solution: the alternative’s sum divided by theirs.',
  'methods.marcos.steps.utility-functions.name': 'Utility functions',
  'methods.marcos.steps.utility-functions.explanation':
    'f(K⁻) is the utility in relation to the anti-ideal solution and f(K⁺) in relation to the ideal solution. Note the crossover in the formulas: f(K⁻) has K⁺ in its numerator. Because K⁻ and K⁺ are both proportional to S_i, these two values are the same for every alternative.',
  'methods.marcos.steps.final-utility.name': 'Final utility f(K_i)',
  'methods.marcos.steps.final-utility.explanation':
    'The compromise of the two utility degrees and the two utility functions. A higher value is better.',
  'methods.marcos.steps.ranking.name': 'Ranking',
  'methods.marcos.steps.ranking.explanation':
    'Alternatives ordered by final utility, highest first. Equal values share a rank.',

  // ------------------------------------------------------------ Fuzzy MARCOS
  'methods.fuzzyMarcos.name': 'Fuzzy MARCOS',
  'methods.fuzzyMarcos.rows.antiIdeal': 'Anti-ideal solution (AAI)',
  'methods.fuzzyMarcos.rows.ideal': 'Ideal solution (ID)',
  'methods.fuzzyMarcos.columns.S': 'Sum S̃_i',
  'methods.fuzzyMarcos.columns.kMinus': 'Utility degree K⁻',
  'methods.fuzzyMarcos.columns.kPlus': 'Utility degree K⁺',
  'methods.fuzzyMarcos.columns.T': 'T̃_i = K̃⁻ ⊕ K̃⁺',
  'methods.fuzzyMarcos.columns.fKMinus': 'Utility function f(K⁻)',
  'methods.fuzzyMarcos.columns.fKPlus': 'Utility function f(K⁺)',
  'methods.fuzzyMarcos.columns.fK': 'Final utility f(K)',
  'methods.fuzzyMarcos.columns.rank': 'Rank',
  'methods.fuzzyMarcos.parameters.defuzzification.label': 'Defuzzification',
  'methods.fuzzyMarcos.parameters.defuzzification.description':
    'How the fuzzy utility degrees and utility functions are turned into crisp numbers before the final utility is calculated. The reference paper does not name the formula; the graded mean reproduces its results. df_crisp always uses the graded mean, as printed in the paper.',
  'methods.fuzzyMarcos.parameters.defuzzification.gradedMean': 'Graded mean (l + 4m + u) / 6',
  'methods.fuzzyMarcos.parameters.defuzzification.centroid': 'Centroid (l + m + u) / 3',
  'methods.fuzzyMarcos.parameters.normalizeWeights.label': 'Normalize weights',
  'methods.fuzzyMarcos.parameters.normalizeWeights.description':
    'Divide every crisp weight by the sum of the weights before they are used. Only available for crisp weights; the ranking does not change.',
  'methods.fuzzyMarcos.steps.initial-matrix.name': 'Initial fuzzy decision matrix',
  'methods.fuzzyMarcos.steps.initial-matrix.explanation':
    'The performance of every alternative on every criterion as a triangular fuzzy number (l, m, u).',
  'methods.fuzzyMarcos.steps.weights.name': 'Criterion weights',
  'methods.fuzzyMarcos.steps.weights.explanation':
    'The importance of each criterion, as entered: a triangular fuzzy number or a crisp number.',
  'methods.fuzzyMarcos.steps.normalized-weights.name': 'Normalized weights',
  'methods.fuzzyMarcos.steps.normalized-weights.explanation':
    'Each weight divided by the sum of all weights, so that the weights sum to 1.',
  'methods.fuzzyMarcos.steps.extended-matrix.name': 'Extended fuzzy matrix',
  'methods.fuzzyMarcos.steps.extended-matrix.explanation':
    'The anti-ideal solution is added as the first row and the ideal solution as the last row. The minimum and maximum are taken separately for l, m and u.',
  'methods.fuzzyMarcos.steps.normalized-matrix.name': 'Normalized fuzzy matrix',
  'methods.fuzzyMarcos.steps.normalized-matrix.explanation':
    'For a benefit criterion each component is divided by the upper value u of the ideal; for a cost criterion the lower value l of the ideal is divided by each component, which reverses their order.',
  'methods.fuzzyMarcos.steps.weighted-matrix.name': 'Weighted fuzzy matrix',
  'methods.fuzzyMarcos.steps.weighted-matrix.explanation':
    'Every normalized value multiplied by the weight of its criterion, component by component.',
  'methods.fuzzyMarcos.steps.sums.name': 'Fuzzy sums S̃_i',
  'methods.fuzzyMarcos.steps.sums.explanation':
    'The sum of each row of the weighted matrix, including the anti-ideal and ideal rows.',
  'methods.fuzzyMarcos.steps.utility-degrees.name': 'Fuzzy utility degrees',
  'methods.fuzzyMarcos.steps.utility-degrees.explanation':
    'K̃⁻ compares each alternative with the anti-ideal solution and K̃⁺ with the ideal solution, using fuzzy division: l is divided by the other’s u, m by m, and u by l.',
  'methods.fuzzyMarcos.steps.utility-degree-sums.name': 'Sums of the utility degrees T̃_i',
  'methods.fuzzyMarcos.steps.utility-degree-sums.explanation':
    'The two fuzzy utility degrees of each alternative added together.',
  'methods.fuzzyMarcos.steps.max-utility-degree-sum.name': 'Largest sum D̃',
  'methods.fuzzyMarcos.steps.max-utility-degree-sum.explanation':
    'The largest T̃_i, taken separately for l, m and u.',
  'methods.fuzzyMarcos.steps.max-utility-degree-sum-crisp.name': 'Crisp value of D̃ (df_crisp)',
  'methods.fuzzyMarcos.steps.max-utility-degree-sum-crisp.explanation':
    'D̃ defuzzified with the graded mean (l + 4m + u) / 6. All fuzzy utility functions are divided by this one number.',
  'methods.fuzzyMarcos.steps.utility-functions.name': 'Fuzzy utility functions',
  'methods.fuzzyMarcos.steps.utility-functions.explanation':
    'f(K̃⁻) is K̃⁺ divided by df_crisp and f(K̃⁺) is K̃⁻ divided by df_crisp. Note the crossover, as in the reference paper.',
  'methods.fuzzyMarcos.steps.defuzzification.name': 'Defuzzification',
  'methods.fuzzyMarcos.steps.defuzzification.explanation':
    'The fuzzy utility degrees and utility functions turned into crisp numbers with the {defuzzification, select, graded-mean {graded mean (l + 4m + u) / 6} centroid {centroid (l + m + u) / 3} other {selected formula}}.',
  'methods.fuzzyMarcos.steps.final-utility.name': 'Final utility f(K_i)',
  'methods.fuzzyMarcos.steps.final-utility.explanation':
    'The compromise of the crisp utility degrees and utility functions. A higher value is better.',
  'methods.fuzzyMarcos.steps.ranking.name': 'Ranking',
  'methods.fuzzyMarcos.steps.ranking.explanation':
    'Alternatives ordered by final utility, highest first. Equal values share a rank.',

  // ------------------------------------------------------------ CRITIC
  'methods.critic.name': 'CRITIC',
  'methods.critic.rows.weight': 'Weight w_j',
  'methods.critic.steps.initial-matrix.name': 'Initial decision matrix',
  'methods.critic.steps.initial-matrix.explanation':
    'The performance of every alternative on every criterion, as entered.',
  'methods.critic.steps.normalized-matrix.name': 'Normalized matrix',
  'methods.critic.steps.normalized-matrix.explanation':
    'Each criterion is rescaled to [0, 1]: the worst value becomes 0 and the best value 1. For a benefit criterion the best value is the largest; for a cost criterion it is the smallest.',
  'methods.critic.steps.means.name': 'Column means',
  'methods.critic.steps.means.explanation':
    'The mean of each normalized column, needed for the deviations.',
  'methods.critic.steps.deviations.name': 'Deviations from the mean d_ij',
  'methods.critic.steps.deviations.explanation':
    'Each normalized value minus the mean of its column. The standard deviations and the correlations are both calculated from these deviations.',
  'methods.critic.steps.standard-deviations.name': 'Standard deviations σ_j',
  'methods.critic.steps.standard-deviations.explanation':
    'The contrast intensity of each criterion: the population standard deviation of its normalized column. A criterion that separates the alternatives more carries more information.',
  'methods.critic.steps.correlation-matrix.name': 'Correlation matrix',
  'methods.critic.steps.correlation-matrix.explanation':
    'The Pearson correlation between every pair of normalized columns. Strongly correlated criteria say the same thing, so they conflict less.',
  'methods.critic.steps.conflict.name': 'Conflict',
  'methods.critic.steps.conflict.explanation':
    'The conflict of each criterion with all the others: the sum of (1 − r) over its row of the correlation matrix.',
  'methods.critic.steps.information-content.name': 'Information content C_j',
  'methods.critic.steps.information-content.explanation':
    'Contrast intensity times conflict: a criterion is informative when it separates the alternatives and disagrees with the other criteria.',
  'methods.critic.steps.weights.name': 'Criterion weights',
  'methods.critic.steps.weights.explanation':
    'Each information content divided by their sum, so the weights sum to 1.',

  // ------------------------------------------------------------ MEREC
  'methods.merec.name': 'MEREC',
  'methods.merec.columns.S': 'Performance S_i',
  'methods.merec.rows.weight': 'Weight w_j',
  'methods.merec.steps.initial-matrix.name': 'Initial decision matrix',
  'methods.merec.steps.initial-matrix.explanation':
    'The performance of every alternative on every criterion, as entered. All values must be greater than zero.',
  'methods.merec.steps.normalized-matrix.name': 'Normalized matrix',
  'methods.merec.steps.normalized-matrix.explanation':
    'Every criterion becomes a minimisation criterion, the reverse of the usual linear normalization: for a benefit criterion the smallest value of the column is divided by the value, for a cost criterion the value is divided by the largest value of the column.',
  'methods.merec.steps.absolute-logs.name': 'Absolute logarithms',
  'methods.merec.steps.absolute-logs.explanation':
    'The absolute value of the natural logarithm of every normalized value. These are the terms that are summed in the next two steps.',
  'methods.merec.steps.overall-performance.name': 'Overall performance S_i',
  'methods.merec.steps.overall-performance.explanation':
    'The performance of each alternative with all criteria: ln(1 + the sum of the absolute logarithms divided by the number of criteria).',
  'methods.merec.steps.removal-performance.name': 'Performance with a criterion removed S′_ij',
  'methods.merec.steps.removal-performance.explanation':
    'The same calculation with one criterion left out. The divisor stays the number of criteria, not one less.',
  'methods.merec.steps.removal-effects.name': 'Removal effects E_j',
  'methods.merec.steps.removal-effects.explanation':
    'How much removing a criterion changes the performances: the sum over the alternatives of |S′ − S|. A larger effect means a more important criterion.',
  'methods.merec.steps.weights.name': 'Criterion weights',
  'methods.merec.steps.weights.explanation':
    'Each removal effect divided by their sum, so the weights sum to 1. The effects are not rounded before dividing.',

  // ------------------------------------------------------------ SWARA
  'methods.swara.name': 'SWARA',
  'methods.swara.rows.s': 'Comparative importance s_j',
  'methods.swara.rows.k': 'Coefficient k_j',
  'methods.swara.rows.w': 'Recalculated weight w_j',
  'methods.swara.rows.q': 'Weight q_j',
  'methods.swara.steps.comparative-importance.name': 'Comparative importance s_j',
  'methods.swara.steps.comparative-importance.explanation':
    'How much more important each criterion is than the one ranked just below it, as stated by the experts. The criteria are in descending order of importance; the first has no value.',
  'methods.swara.steps.coefficients.name': 'Coefficients k_j',
  'methods.swara.steps.coefficients.explanation':
    'k = 1 for the first criterion and s + 1 for the others.',
  'methods.swara.steps.recalculated-weights.name': 'Recalculated weights w_j',
  'methods.swara.steps.recalculated-weights.explanation':
    'The first criterion gets 1; every other weight is the previous weight divided by its coefficient.',
  'methods.swara.steps.weights.name': 'Criterion weights q_j',
  'methods.swara.steps.weights.explanation':
    'Each recalculated weight divided by their sum, so the weights sum to 1.',

  // ------------------------------------------------------------ Fuzzy SWARA (IMF SWARA)
  'methods.fuzzySwara.name': 'Fuzzy SWARA (IMF SWARA)',
  'methods.fuzzySwara.rows.s': 'Comparative importance s̃_j',
  'methods.fuzzySwara.rows.k': 'Coefficient k̃_j',
  'methods.fuzzySwara.rows.q': 'Recalculated weight q̃_j',
  'methods.fuzzySwara.rows.w': 'Fuzzy weight w̃_j',
  'methods.fuzzySwara.rows.c': 'Crisp weight',
  'methods.fuzzySwara.rows.weight': 'Weight w_j',
  'methods.fuzzySwara.parameters.defuzzification.label': 'Defuzzification',
  'methods.fuzzySwara.parameters.defuzzification.description':
    'How each fuzzy weight is turned into a crisp number. The reference papers do not name the formula; the graded mean, which the same authors state explicitly in Fuzzy MARCOS, reproduces their printed values.',
  'methods.fuzzySwara.parameters.defuzzification.gradedMean': 'Graded mean (l + 4m + u) / 6',
  'methods.fuzzySwara.parameters.defuzzification.centroid': 'Centroid (l + m + u) / 3',
  'methods.fuzzySwara.steps.assessments.name': 'Comparative importance s̃_j',
  'methods.fuzzySwara.steps.assessments.explanation':
    'The linguistic assessments of the experts, as triangular fuzzy numbers from the comparison scale: how much less significant each criterion is than the one ranked just above it. The first criterion has none.',
  'methods.fuzzySwara.steps.coefficients.name': 'Fuzzy coefficients k̃_j',
  'methods.fuzzySwara.steps.coefficients.explanation':
    'k̃ = (1, 1, 1) for the first criterion and s̃ + 1 for the others. The reference paper’s equation omits the “+ 1”; every worked example, and this method, adds it.',
  'methods.fuzzySwara.steps.recalculated-weights.name': 'Recalculated fuzzy weights q̃_j',
  'methods.fuzzySwara.steps.recalculated-weights.explanation':
    'The first criterion gets (1, 1, 1); every other weight is the previous one divided by its coefficient, using fuzzy division: l is divided by the other’s u, m by m, and u by l.',
  'methods.fuzzySwara.steps.recalculated-weights-sum.name': 'Sum of the recalculated weights',
  'methods.fuzzySwara.steps.recalculated-weights-sum.explanation':
    'The fuzzy sum of all recalculated weights, component by component.',
  'methods.fuzzySwara.steps.fuzzy-weights.name': 'Fuzzy weights w̃_j',
  'methods.fuzzySwara.steps.fuzzy-weights.explanation':
    'Each recalculated weight divided by the sum, with fuzzy division.',
  'methods.fuzzySwara.steps.crisp-weights.name': 'Crisp weights',
  'methods.fuzzySwara.steps.crisp-weights.explanation':
    'Each fuzzy weight defuzzified with the {defuzzification, select, graded-mean {graded mean (l + 4m + u) / 6} centroid {centroid (l + m + u) / 3} other {selected formula}}. Defuzzification is not additive, so these values do not sum to exactly 1.',
  'methods.fuzzySwara.steps.weights.name': 'Normalized crisp weights',
  'methods.fuzzySwara.steps.weights.explanation':
    'Each crisp weight divided by their sum, so the weights sum to 1 and can feed another method.',

  // ------------------------------------------------------------ LOPCOW
  'methods.lopcow.name': 'LOPCOW',
  'methods.lopcow.rows.meanSquare': 'Mean square',
  'methods.lopcow.rows.sigma': 'Standard deviation σ_j',
  'methods.lopcow.rows.percentageValue': 'Percentage value PV_j',
  'methods.lopcow.rows.weight': 'Weight w_j',
  'methods.lopcow.steps.initial-matrix.name': 'Initial decision matrix',
  'methods.lopcow.steps.initial-matrix.explanation':
    'The performance of every alternative on every criterion, as entered.',
  'methods.lopcow.steps.normalized-matrix.name': 'Normalized matrix r_ij',
  'methods.lopcow.steps.normalized-matrix.explanation':
    'Each criterion is rescaled to [0, 1]: the worst value becomes 0 and the best value 1. For a benefit criterion the best value is the largest; for a cost criterion it is the smallest.',
  'methods.lopcow.steps.mean-squares.name': 'Mean squares',
  'methods.lopcow.steps.mean-squares.explanation':
    'The mean of the squared normalized values of each criterion. Its square root is the root mean square of the column.',
  'methods.lopcow.steps.means.name': 'Column means',
  'methods.lopcow.steps.means.explanation':
    'The mean of each normalized column, needed for the deviations.',
  'methods.lopcow.steps.deviations.name': 'Deviations from the mean d_ij',
  'methods.lopcow.steps.deviations.explanation':
    'Each normalized value minus the mean of its column.',
  'methods.lopcow.steps.standard-deviations.name': 'Standard deviations σ_j',
  'methods.lopcow.steps.standard-deviations.explanation':
    'The sample standard deviation of each normalized column (divided by m − 1, the number of alternatives minus one). This is the convention that reproduces the reference example.',
  'methods.lopcow.steps.percentage-values.name': 'Percentage values PV_j',
  'methods.lopcow.steps.percentage-values.explanation':
    'The logarithmic percentage change between the root mean square and the standard deviation of each criterion: |ln(√(mean square) / σ_j) · 100|. It measures how far the spread of a criterion differs from its average level.',
  'methods.lopcow.steps.percentage-value-sum.name': 'Sum of the percentage values',
  'methods.lopcow.steps.percentage-value-sum.explanation':
    'The sum of the percentage values of all criteria.',
  'methods.lopcow.steps.weights.name': 'Criterion weights',
  'methods.lopcow.steps.weights.explanation':
    'Each percentage value divided by their sum, so the weights sum to 1.',

  // ------------------------------------------------------------ FUCOM
  'methods.fucom.name': 'FUCOM',
  'methods.fucom.rows.significance': 'Significance ϖ',
  'methods.fucom.rows.comparativePriority': 'Comparative priority φ_k/(k+1)',
  'methods.fucom.rows.transitivePriority': 'Transitive priority φ_k/(k+2)',
  'methods.fucom.rows.relativeWeight': 'Relative weight v_j',
  'methods.fucom.rows.weight': 'Weight w_j',
  'methods.fucom.rows.adjacentDeviation': '|w_k / w_(k+1) − φ_k/(k+1)|',
  'methods.fucom.rows.transitiveDeviation': '|w_k / w_(k+2) − φ_k/(k+2)|',
  'methods.fucom.reasons.firstPair':
    'No transitive condition: this criterion is only one place below the most important one.',
  'methods.fucom.steps.significance.name': 'Significance of the criteria ϖ',
  'methods.fucom.steps.significance.explanation':
    'The significance the expert gave each criterion, in ranking order. The most important criterion has the smallest value; equal values mean equal importance.',
  'methods.fucom.steps.comparative-priorities.name': 'Comparative priorities φ',
  'methods.fucom.steps.comparative-priorities.explanation':
    'How many times more important each criterion is than the one ranked just below it, shown under the lower-ranked criterion. From significance values it is the next value divided by this one.',
  'methods.fucom.steps.transitive-priorities.name': 'Transitive priorities',
  'methods.fucom.steps.transitive-priorities.explanation':
    'The priority of a criterion over the one two places below it: the product of the two comparative priorities in between. Full consistency requires the weights to respect these too.',
  'methods.fucom.steps.relative-weights.name': 'Relative weights v_j',
  'methods.fucom.steps.relative-weights.explanation':
    'The most important criterion gets 1; every following criterion gets the previous value divided by their comparative priority. These ratios meet every condition of the FUCOM model exactly.',
  'methods.fucom.steps.weights.name': 'Criterion weights',
  'methods.fucom.steps.weights.explanation':
    'Each relative weight divided by their sum, so the weights sum to 1.',
  'methods.fucom.steps.consistency-deviations.name': 'Deviations from full consistency',
  'methods.fucom.steps.consistency-deviations.explanation':
    'Every condition of the FUCOM model checked against the final weights: how far each weight ratio is from its comparative or transitive priority.',
  'methods.fucom.steps.dfc.name': 'Deviation from full consistency χ (DFC)',
  'methods.fucom.steps.dfc.explanation':
    'The FUCOM model looks for the weights with the smallest χ that bounds every deviation. The weights above meet every condition, so χ is 0 (up to rounding in the last digits) and no other weights are optimal.',

  // ------------------------------------------------------------ BWM
  'methods.bwm.name': 'BWM',
  'methods.bwm.parameters.model.label': 'Model',
  'methods.bwm.parameters.model.description':
    'The nonlinear model is the original method; its optimal weights may form a range, so each weight is reported as an interval and its centre. The linear model always has a single solution.',
  'methods.bwm.parameters.model.nonlinear': 'Nonlinear (Rezaei 2015)',
  'methods.bwm.parameters.model.linear': 'Linear (Rezaei 2016)',
  'methods.bwm.parameters.scale.label': 'Preference scale',
  'methods.bwm.parameters.scale.description':
    'The largest value of the scale the comparisons are given on (1 to this value). The consistency threshold depends on it.',
  'methods.bwm.rows.bestToOthers': 'Best to others a_Bj',
  'methods.bwm.rows.othersToWorst': 'Others to worst a_jW',
  'methods.bwm.rows.lowerBound': 'Smallest optimal weight',
  'methods.bwm.rows.upperBound': 'Largest optimal weight',
  'methods.bwm.rows.centre': 'Interval centre c_j',
  'methods.bwm.rows.weight': 'Weight w_j',
  'methods.bwm.rows.inputRatio': 'Input-based ratio CR^I_j',
  'methods.bwm.steps.best-to-others.name': 'Best-to-others vector',
  'methods.bwm.steps.best-to-others.explanation':
    'How strongly the best criterion is preferred to each criterion, on 1–9. The best criterion compared with itself is 1.',
  'methods.bwm.steps.others-to-worst.name': 'Others-to-worst vector',
  'methods.bwm.steps.others-to-worst.explanation':
    'How strongly each criterion is preferred to the worst criterion, on 1–9. The worst criterion compared with itself is 1.',
  'methods.bwm.steps.input-consistency.name': 'Input-based consistency CR^I_j',
  'methods.bwm.steps.input-consistency.explanation':
    'For each criterion, how far the indirect comparison a_Bj · a_jW is from the direct preference of the best over the worst, a_BW, as a share of the largest possible gap. Calculated from the comparisons alone (Liang, Brunelli and Rezaei 2020).',
  'methods.bwm.steps.input-consistency-ratio.name': 'Input-based consistency ratio CR^I',
  'methods.bwm.steps.input-consistency-ratio.explanation':
    'The largest CR^I_j. It is 0 when the comparisons are fully consistent.',
  'methods.bwm.steps.input-threshold.name': 'Consistency threshold',
  'methods.bwm.steps.input-threshold.explanation':
    'The comparisons are acceptably consistent when CR^I does not exceed this threshold, which Liang, Brunelli and Rezaei (2020) derived for {count, number} criteria on a scale of 1 to {scale, number}. Above it, revise the comparisons, starting with the criterion with the largest CR^I_j.',
  'methods.bwm.steps.optimal-xi.name': 'Optimal ξ*',
  'methods.bwm.steps.optimal-xi.explanation':
    'The smallest ξ for which some weights keep every ratio w_B / w_j and w_j / w_W within ξ of the stated preference. For a fixed ξ the conditions are linear, so ξ* is found by bisection with a linear programme at each step, solved with {solver}. ξ* = 0 means the comparisons are fully consistent.',
  'methods.bwm.steps.weight-intervals.name': 'Optimal weight intervals',
  'methods.bwm.steps.weight-intervals.explanation':
    'Several weight vectors can reach ξ*. For each criterion, the smallest and the largest weight among all of them, each found with a linear programme solved with {solver}.',
  'methods.bwm.steps.interval-centres.name': 'Interval centres c_j',
  'methods.bwm.steps.interval-centres.explanation':
    'The midpoint of each interval, the representative weight recommended for the nonlinear model. The centres need not sum to exactly 1.',
  'methods.bwm.steps.consistency-index.name': 'Consistency index CI',
  'methods.bwm.steps.consistency-index.explanation':
    'The largest ξ* possible for the preference of the best over the worst criterion a_BW.',
  'methods.bwm.steps.consistency-ratio.name': 'Consistency ratio CR',
  'methods.bwm.steps.consistency-ratio.explanation':
    'ξ* divided by the consistency index: 0 for fully consistent comparisons, closer to 1 for less consistent ones.',
  'methods.bwm.steps.weights.name': 'Criterion weights',
  'methods.bwm.steps.weights.explanation':
    'Each interval centre divided by their sum, so the weights sum to 1 and can feed another method.',
  'methods.bwm.steps.weights.linearExplanation':
    'The weights of the optimal solution of the linear model, solved with {solver}. The linear model has a single optimal solution.',
  'methods.bwm.steps.linear-xi.name': 'Optimal ξ^L*',
  'methods.bwm.steps.linear-xi.explanation':
    'The smallest ξ for which some weights keep every difference |w_B − a_Bj · w_j| and |w_j − a_jW · w_W| within ξ, found with a linear programme solved with {solver}. ξ^L* itself is the consistency indicator: the closer to 0, the more consistent the comparisons.',

  // ------------------------------------------------------------ validation
  'validation.marcos.reserved-alternative-id':
    'The alternative id "{id}" is reserved for the anti-ideal or ideal solution of MARCOS.',
  'validation.marcos.zero-cost-value':
    'This cell of cost criterion "{id}" is 0. MARCOS divides by the values of cost criteria, so they must be greater than zero.',
  'validation.marcos.zero-ideal-value':
    'Every value of benefit criterion "{id}" is 0, so its ideal value is 0 and MARCOS cannot normalize it.',
  'validation.marcos.zero-anti-ideal-sum':
    'The sum S of the anti-ideal solution is 0, so the utility degrees K⁻ cannot be calculated. Check the benefit criteria whose smallest value is 0.',
  'validation.marcos.zero-sum':
    'The sum S of this alternative is 0, so its utility functions cannot be calculated.',
  'validation.fuzzy-marcos.reserved-alternative-id':
    'The alternative id "{id}" is reserved for the anti-ideal or ideal solution of Fuzzy MARCOS.',
  'validation.fuzzy-marcos.unsupported-weights':
    'The weights use the number type "{numberType}". Fuzzy MARCOS accepts triangular fuzzy or crisp weights.',
  'validation.fuzzy-marcos.zero-cost-value':
    'The lower value l of this cell of cost criterion "{id}" is 0. Fuzzy MARCOS divides by the values of cost criteria, so they must be greater than zero.',
  'validation.fuzzy-marcos.zero-ideal-value':
    'Every upper value u of benefit criterion "{id}" is 0, so Fuzzy MARCOS cannot normalize it.',
  'validation.fuzzy-marcos.zero-anti-ideal-sum':
    'A component of the sum S̃ of the anti-ideal solution is 0, so the utility degrees K̃⁻ cannot be calculated.',
  'validation.fuzzy-marcos.zero-ideal-sum':
    'A component of the sum S̃ of the ideal solution is 0, so the utility degrees K̃⁺ cannot be calculated.',
  'validation.fuzzy-marcos.zero-sum':
    'The sum S̃ of this alternative is (0, 0, 0), so its utility functions cannot be calculated.',
  'validation.fuzzy-marcos.normalize-fuzzy-weights':
    'Fuzzy weights cannot be normalized by this option. Turn it off or enter crisp weights.',
  'validation.critic.zero-information':
    'Every information content C_j is 0 (for example, two criteria that are perfectly correlated), so the weights cannot be calculated.',
  'validation.merec.zero-removal-effects':
    'Every removal effect E_j is 0 (for example, all alternatives are identical), so the weights cannot be calculated.',
  'validation.swara.negative-importance':
    'The comparative importance {value} is negative. List the criteria in descending order of importance, so that each is at least as important as the next.',
  'validation.swara.first-importance-ignored':
    'The first criterion has no comparative importance. The value is ignored.',
  'validation.fuzzy-swara.unknown-term': '"{term}" is not a term of the comparison scale.',
  'validation.fuzzy-swara.negative-scale-value':
    'The scale term "{term}" has a negative component, so its coefficient could fall below 1.',
  'validation.fuzzy-swara.first-assessment-ignored':
    'The first criterion has no assessment. The value is ignored.',
  'validation.lopcow.zero-percentage-values':
    'Every percentage value PV_j is 0, so the weights cannot be calculated.',
  'validation.fucom.ranking-violated':
    'The priority {value, number} contradicts the ranking. List the criteria from most to least important: comparative priorities must be at least 1 and significance values must not decrease.',
  'validation.fucom.unknown-priority-kind':
    'The priorities must be given as significance values or as comparative priorities, not "{kind}".',
  'validation.bwm.unknown-criterion': '"{id}" is not one of the criteria.',
  'validation.bwm.best-is-worst': 'Criterion "{id}" cannot be both the best and the worst.',
  'validation.bwm.out-of-scale':
    'The comparison {value, number} is outside the scale from {min, number} to {max, number}.',
  'validation.bwm.self-comparison':
    'Criterion "{id}" compared with itself must be 1, not {value, number}.',
  'validation.bwm.best-worst-mismatch':
    'The preference of the best over the worst criterion is {bestToWorst, number} in the best-to-others vector but {worstFromBest, number} in the others-to-worst vector. It must be the same value.',
  'validation.bwm.best-not-preferred':
    'The best criterion must be preferred to the worst (a value above 1). If they are equally important, all criteria are.',
  'validation.bwm.ordinal-inconsistency':
    'The vectors disagree on "{first}" and "{second}": the best-to-others vector ranks "{second}" higher, the others-to-worst vector ranks "{first}" higher. The weights can still be calculated, but the consistency will be poor.',
  'validation.bwm.threshold-unavailable':
    'The consistency threshold is only defined for up to {max, number} criteria, and there are {count, number}. The weights are calculated, but the comparisons cannot be judged acceptable or not.',
} as const;

export type MethodsMessageKey = keyof typeof en;

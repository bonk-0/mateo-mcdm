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

  // ------------------------------------------------------------ COPRAS, MOORA, ARAS and their fuzzy variants (P2.5)
  'methods.copras.name': 'COPRAS',
  'methods.copras.rows.columnSum': 'Column sum',
  'methods.copras.columns.sPlus': 'Sum S⁺ (benefit)',
  'methods.copras.columns.sMinus': 'Sum S⁻ (cost)',
  'methods.copras.columns.Q': 'Relative significance Q',
  'methods.copras.columns.N': 'Utility degree N (%)',
  'methods.copras.columns.rank': 'Rank',
  'methods.copras.steps.initial-matrix.name': 'Initial decision matrix',
  'methods.copras.steps.initial-matrix.explanation':
    'The performance of every alternative on every criterion, as entered.',
  'methods.copras.steps.weights.name': 'Criterion weights',
  'methods.copras.steps.weights.explanation':
    'The importance of each criterion, as entered. Multiplying every weight by the same factor changes Q but not the utility degrees or the ranking.',
  'methods.copras.steps.column-sums.name': 'Column sums',
  'methods.copras.steps.column-sums.explanation':
    'The sum of the values of each criterion over all alternatives. COPRAS shares each criterion’s weight among the alternatives in proportion to their values.',
  'methods.copras.steps.weighted-normalized-matrix.name': 'Weighted normalized matrix',
  'methods.copras.steps.weighted-normalized-matrix.explanation':
    'Every value divided by the sum of its column and multiplied by the weight of its criterion. This is the same for benefit and cost criteria; the direction only matters in the next step.',
  'methods.copras.steps.sums.name': 'Sums S⁺ and S⁻',
  'methods.copras.steps.sums.explanation':
    'S⁺ adds the weighted values of the benefit criteria (more is better) and S⁻ those of the cost criteria (less is better).',
  'methods.copras.steps.relative-significance.name': 'Relative significance Q',
  'methods.copras.steps.relative-significance.explanation':
    'S⁺ plus a bonus for a small S⁻: the sum of all S⁻ divided by the alternative’s own S⁻ and the sum of all 1 / S⁻. Without cost criteria Q is just S⁺. A higher value is better.',
  'methods.copras.steps.utility-degree.name': 'Utility degree N',
  'methods.copras.steps.utility-degree.explanation':
    'Q as a percentage of the best alternative’s Q, so the best alternative has N = 100.',
  'methods.copras.steps.ranking.name': 'Ranking',
  'methods.copras.steps.ranking.explanation':
    'Alternatives ordered by utility degree, highest first. Equal values share a rank.',
  'methods.fuzzyCopras.name': 'Fuzzy COPRAS',
  'methods.fuzzyCopras.parameters.defuzzification.label': 'Defuzzification',
  'methods.fuzzyCopras.parameters.defuzzification.description':
    'How every fuzzy rating and weight is turned into a crisp number before crisp COPRAS runs. The reference paper uses the centroid.',
  'methods.fuzzyCopras.parameters.defuzzification.centroid': 'Centroid (l + m + u) / 3',
  'methods.fuzzyCopras.parameters.defuzzification.gradedMean': 'Graded mean (l + 4m + u) / 6',
  'methods.fuzzyCopras.steps.initial-matrix.name': 'Initial fuzzy decision matrix',
  'methods.fuzzyCopras.steps.initial-matrix.explanation':
    'The rating of every alternative on every criterion as a triangular fuzzy number (l, m, u), as entered.',
  'methods.fuzzyCopras.steps.weights.name': 'Criterion weights',
  'methods.fuzzyCopras.steps.weights.explanation':
    'The importance of each criterion, as entered: triangular fuzzy numbers or crisp numbers.',
  'methods.fuzzyCopras.steps.defuzzified-matrix.name': 'Step 1: defuzzified matrix',
  'methods.fuzzyCopras.steps.defuzzified-matrix.explanation':
    'Fuzzy COPRAS first replaces every fuzzy rating by one crisp number. From here on the calculation is ordinary COPRAS.',
  'methods.fuzzyCopras.steps.defuzzified-weights.name': 'Step 1: defuzzified weights',
  'methods.fuzzyCopras.steps.defuzzified-weights.explanation':
    'The fuzzy weights replaced by crisp numbers in the same way. Crisp weights are used as they are.',
  'methods.moora.name': 'MOORA',
  'methods.moora.rows.norm': 'Column norm',
  'methods.moora.rows.referencePoint': 'Reference point (r)',
  'methods.moora.columns.yPlus': 'Sum of maximised objectives y⁺',
  'methods.moora.columns.yMinus': 'Sum of minimised objectives y⁻',
  'methods.moora.columns.y': 'Ratio system y',
  'methods.moora.columns.maxDeviation': 'Maximal deviation',
  'methods.moora.columns.rank': 'Rank',
  'methods.moora.parameters.rankBy.label': 'Ranking reported',
  'methods.moora.parameters.rankBy.description':
    'MOORA has two approaches. Both are calculated and shown in the steps; this selects the one that is the result. The ratio system ranks by the highest y, the reference point by the smallest maximal deviation.',
  'methods.moora.parameters.rankBy.ratioSystem': 'Ratio system (highest y)',
  'methods.moora.parameters.rankBy.referencePoint': 'Reference point (smallest maximal deviation)',
  'methods.moora.steps.initial-matrix.name': 'Initial decision matrix',
  'methods.moora.steps.initial-matrix.explanation':
    'The performance of every alternative on every objective, as entered.',
  'methods.moora.steps.weights.name': 'Objective weights',
  'methods.moora.steps.weights.explanation':
    'The importance of each objective, as entered. The original method has no weights; without them every objective counts equally.',
  'methods.moora.steps.norms.name': 'Column norms',
  'methods.moora.steps.norms.explanation':
    'The square root of the sum of the squared values of each objective. It puts objectives with different units on a common scale.',
  'methods.moora.steps.normalized-matrix.name': 'Normalized matrix',
  'methods.moora.steps.normalized-matrix.explanation':
    'Every value divided by the norm of its column (vector normalization).',
  'methods.moora.steps.weighted-matrix.name': 'Weighted normalized matrix',
  'methods.moora.steps.weighted-matrix.explanation':
    'Every normalized value multiplied by the weight of its objective.',
  'methods.moora.steps.ratio-sums.name': 'Sums of the maximised and minimised objectives',
  'methods.moora.steps.ratio-sums.explanation':
    'For each alternative, the sum of its (weighted) normalized values on the objectives to be maximised, and on those to be minimised.',
  'methods.moora.steps.ratio-system.name': 'Ratio system y',
  'methods.moora.steps.ratio-system.explanation':
    'The sum over the maximised objectives minus the sum over the minimised objectives. A higher value is better.',
  'methods.moora.steps.ratio-system-ranking.name': 'Ranking by the ratio system',
  'methods.moora.steps.ratio-system-ranking.explanation':
    'Alternatives ordered by y, highest first. Equal values share a rank.',
  'methods.moora.steps.reference-point.name': 'Reference point',
  'methods.moora.steps.reference-point.explanation':
    'The best value of every objective, whichever alternative has it: the largest for maximised objectives, the smallest for minimised ones.',
  'methods.moora.steps.deviations.name': 'Deviations from the reference point',
  'methods.moora.steps.deviations.explanation':
    'The distance of every value from the reference point of its objective. A deviation of 0 means the alternative is the best on that objective.',
  'methods.moora.steps.max-deviation.name': 'Maximal deviation',
  'methods.moora.steps.max-deviation.explanation':
    'The largest deviation of each alternative over all objectives (the Tchebycheff metric). A smaller value is better.',
  'methods.moora.steps.reference-point-ranking.name': 'Ranking by the reference point',
  'methods.moora.steps.reference-point-ranking.explanation':
    'Alternatives ordered by maximal deviation, smallest first. Equal values share a rank.',
  'methods.fuzzyMoora.name': 'Fuzzy MOORA',
  'methods.fuzzyMoora.columns.yPlus': 'Sum of maximised objectives ỹ⁺',
  'methods.fuzzyMoora.columns.yMinus': 'Sum of minimised objectives ỹ⁻',
  'methods.fuzzyMoora.columns.yFuzzy': 'Fuzzy ratio system ỹ',
  'methods.fuzzyMoora.parameters.defuzzification.label': 'Defuzzification',
  'methods.fuzzyMoora.parameters.defuzzification.description':
    'How the fuzzy ratio system ỹ is turned into a crisp number for ranking. The reference paper uses the centroid (the best non-fuzzy performance, BNP).',
  'methods.fuzzyMoora.parameters.defuzzification.centroid': 'Centroid (l + m + u) / 3',
  'methods.fuzzyMoora.parameters.defuzzification.gradedMean': 'Graded mean (l + 4m + u) / 6',
  'methods.fuzzyMoora.steps.initial-matrix.name': 'Initial fuzzy decision matrix',
  'methods.fuzzyMoora.steps.initial-matrix.explanation':
    'The performance of every alternative on every objective as a triangular fuzzy number (l, m, u), as entered.',
  'methods.fuzzyMoora.steps.weights.name': 'Objective weights',
  'methods.fuzzyMoora.steps.weights.explanation':
    'The importance of each objective, as entered: triangular fuzzy numbers or crisp numbers. Without weights every objective counts equally.',
  'methods.fuzzyMoora.steps.norms.name': 'Fuzzy column norms',
  'methods.fuzzyMoora.steps.norms.explanation':
    'The norm of each of the three components (l, m, u) of an objective: the square root of the sum of its squares, taken over all alternatives.',
  'methods.fuzzyMoora.steps.normalized-matrix.name': 'Normalized fuzzy matrix',
  'methods.fuzzyMoora.steps.normalized-matrix.explanation':
    'Every fuzzy value divided by the fuzzy norm of its column. Dividing by a fuzzy number divides l by the norm’s upper bound and u by its lower bound, so the result is again a valid triangular number.',
  'methods.fuzzyMoora.steps.weighted-matrix.name': 'Weighted normalized fuzzy matrix',
  'methods.fuzzyMoora.steps.weighted-matrix.explanation':
    'Every normalized fuzzy value multiplied by the weight of its objective.',
  'methods.fuzzyMoora.steps.ratio-sums.name':
    'Fuzzy sums of the maximised and minimised objectives',
  'methods.fuzzyMoora.steps.ratio-sums.explanation':
    'For each alternative, the fuzzy sum of its normalized values on the objectives to be maximised, and on those to be minimised.',
  'methods.fuzzyMoora.steps.fuzzy-ratio-system.name': 'Fuzzy ratio system ỹ',
  'methods.fuzzyMoora.steps.fuzzy-ratio-system.explanation':
    'The fuzzy sum over the maximised objectives minus the fuzzy sum over the minimised objectives. Subtracting a fuzzy number subtracts its upper bound from l and its lower bound from u.',
  'methods.fuzzyMoora.steps.ratio-system.name': 'Ratio system y (defuzzified)',
  'methods.fuzzyMoora.steps.ratio-system.explanation':
    'The fuzzy ratio system turned into a crisp number so that alternatives can be ranked. A higher value is better.',
  'methods.fuzzyMoora.steps.reference-point.name': 'Fuzzy reference point',
  'methods.fuzzyMoora.steps.reference-point.explanation':
    'The best fuzzy value of every objective: the largest l, m and u for maximised objectives, the smallest for minimised ones, each taken separately.',
  'methods.fuzzyMoora.steps.deviations.name': 'Distances from the reference point',
  'methods.fuzzyMoora.steps.deviations.explanation':
    'The vertex distance between every fuzzy value and the reference point of its objective: the root mean square of the differences of l, m and u. It is a crisp number.',
  'methods.aras.name': 'ARAS',
  'methods.aras.rows.optimal': 'Optimal alternative (A0)',
  'methods.aras.rows.columnSum': 'Column sum',
  'methods.aras.columns.S': 'Optimality function S_i',
  'methods.aras.columns.K': 'Utility degree K_i',
  'methods.aras.columns.rank': 'Rank',
  'methods.aras.steps.initial-matrix.name': 'Initial decision matrix',
  'methods.aras.steps.initial-matrix.explanation':
    'The performance of every alternative on every criterion, as entered.',
  'methods.aras.steps.weights.name': 'Criterion weights',
  'methods.aras.steps.weights.explanation':
    'The importance of each criterion, as entered. Multiplying every weight by the same factor changes S but not the utility degrees or the ranking.',
  'methods.aras.steps.optimal-alternative.name': 'Optimal alternative',
  'methods.aras.steps.optimal-alternative.explanation':
    'The imaginary best alternative every real one is measured against. The decision maker can enter it; otherwise it takes the best value of each criterion: the largest for benefit criteria and the smallest for cost criteria.',
  'methods.aras.steps.extended-matrix.name': 'Extended matrix',
  'methods.aras.steps.extended-matrix.explanation':
    'The optimal alternative added to the decision matrix as the first row (row 0).',
  'methods.aras.steps.column-sums.name': 'Column sums',
  'methods.aras.steps.column-sums.explanation':
    'The sum of each column over the optimal alternative and all alternatives. For cost criteria it is the sum of the inverted values 1 / x, because a smaller cost is better.',
  'methods.aras.steps.normalized-matrix.name': 'Normalized matrix',
  'methods.aras.steps.normalized-matrix.explanation':
    'Benefit values divided by their column sum. Cost values are first inverted (1 / x) and then divided by the column sum of the inverted values.',
  'methods.aras.steps.weighted-matrix.name': 'Weighted normalized matrix',
  'methods.aras.steps.weighted-matrix.explanation':
    'Every normalized value multiplied by the weight of its criterion.',
  'methods.aras.steps.sums.name': 'Optimality function S_i',
  'methods.aras.steps.sums.explanation':
    'The sum of each row of the weighted matrix, including the optimal alternative. A larger S means a better alternative.',
  'methods.aras.steps.utility-degree.name': 'Utility degree K_i',
  'methods.aras.steps.utility-degree.explanation':
    'Each S divided by the S of the optimal alternative: how close the alternative is to the optimum. The optimal alternative itself has K = 1; an alternative above 1 beats an entered optimum.',
  'methods.aras.steps.ranking.name': 'Ranking',
  'methods.aras.steps.ranking.explanation':
    'Alternatives ordered by utility degree, highest first. Equal values share a rank.',
  'methods.fuzzyAras.name': 'ARAS-F (fuzzy ARAS)',
  'methods.fuzzyAras.rows.optimal': 'Optimal alternative (A0)',
  'methods.fuzzyAras.rows.columnSum': 'Column sum',
  'methods.fuzzyAras.columns.SFuzzy': 'Fuzzy sum S̃_i',
  'methods.fuzzyAras.columns.S': 'Optimality function S_i',
  'methods.fuzzyAras.columns.K': 'Utility degree K_i',
  'methods.fuzzyAras.columns.rank': 'Rank',
  'methods.fuzzyAras.parameters.defuzzification.label': 'Defuzzification',
  'methods.fuzzyAras.parameters.defuzzification.description':
    'How the fuzzy sums S̃_i are turned into crisp numbers before the utility degrees are calculated.',
  'methods.fuzzyAras.parameters.defuzzification.centroid': 'Centroid (l + m + u) / 3',
  'methods.fuzzyAras.parameters.defuzzification.gradedMean': 'Graded mean (l + 4m + u) / 6',
  'methods.fuzzyAras.steps.initial-matrix.name': 'Initial fuzzy decision matrix',
  'methods.fuzzyAras.steps.initial-matrix.explanation':
    'The performance of every alternative on every criterion as a triangular fuzzy number (l, m, u), as entered.',
  'methods.fuzzyAras.steps.weights.name': 'Criterion weights',
  'methods.fuzzyAras.steps.weights.explanation':
    'The importance of each criterion, as entered: triangular fuzzy numbers or crisp numbers.',
  'methods.fuzzyAras.steps.optimal-alternative.name': 'Optimal alternative',
  'methods.fuzzyAras.steps.optimal-alternative.explanation':
    'The imaginary best alternative every real one is measured against. The decision maker can enter it; otherwise it takes the best fuzzy value of each criterion: the largest l, m and u for benefit criteria and the smallest for cost criteria, each taken separately.',
  'methods.fuzzyAras.steps.extended-matrix.name': 'Extended fuzzy matrix',
  'methods.fuzzyAras.steps.extended-matrix.explanation':
    'The optimal alternative added to the decision matrix as the first row (row 0).',
  'methods.fuzzyAras.steps.inverted-matrix.name': 'Matrix with inverted cost criteria',
  'methods.fuzzyAras.steps.inverted-matrix.explanation':
    'Cost criteria are inverted, 1 divided by the fuzzy value, so that a smaller cost becomes a larger number. Benefit criteria stay as they are.',
  'methods.fuzzyAras.steps.column-sums.name': 'Fuzzy column sums',
  'methods.fuzzyAras.steps.column-sums.explanation':
    'The fuzzy sum of each column over the optimal alternative and all alternatives.',
  'methods.fuzzyAras.steps.normalized-matrix.name': 'Normalized fuzzy matrix',
  'methods.fuzzyAras.steps.normalized-matrix.explanation':
    'Every fuzzy value divided by the fuzzy sum of its column. Dividing by a fuzzy number divides l by the sum’s upper bound and u by its lower bound.',
  'methods.fuzzyAras.steps.weighted-matrix.name': 'Weighted normalized fuzzy matrix',
  'methods.fuzzyAras.steps.weighted-matrix.explanation':
    'Every normalized fuzzy value multiplied by the weight of its criterion.',
  'methods.fuzzyAras.steps.fuzzy-sums.name': 'Fuzzy optimality function S̃_i',
  'methods.fuzzyAras.steps.fuzzy-sums.explanation':
    'The fuzzy sum of each row of the weighted matrix, including the optimal alternative.',
  'methods.fuzzyAras.steps.sums.name': 'Optimality function S_i (defuzzified)',
  'methods.fuzzyAras.steps.sums.explanation':
    'The fuzzy sums turned into crisp numbers so that the utility degrees can be calculated.',
  'methods.fuzzyAras.steps.utility-degree.name': 'Utility degree K_i',
  'methods.fuzzyAras.steps.utility-degree.explanation':
    'Each S divided by the S of the optimal alternative: how close the alternative is to the optimum. The optimal alternative itself has K = 1; an alternative above 1 beats an entered optimum.',
  'methods.fuzzyAras.steps.ranking.name': 'Ranking',
  'methods.fuzzyAras.steps.ranking.explanation':
    'Alternatives ordered by utility degree, highest first. Equal values share a rank.',
  // ------------------------------------------------------------ DEMATEL
  'methods.dematel.name': 'DEMATEL',
  'methods.dematel.columns.rowSum': 'Row sum',
  'methods.dematel.columns.dispatch': 'Dispatched influence D',
  'methods.dematel.columns.receive': 'Received influence R',
  'methods.dematel.columns.prominence': 'Prominence D + R',
  'methods.dematel.columns.relation': 'Relation D − R',
  'methods.dematel.rows.columnSum': 'Column sum',
  'methods.dematel.rows.weightBasis': 'Weight basis a_i',
  'methods.dematel.rows.weight': 'Weight w_i',
  'methods.dematel.parameters.normalization.label': 'Normalization constant',
  'methods.dematel.parameters.normalization.description':
    'The constant s that divides the direct-relation matrix. The larger of the biggest row sum and the biggest column sum is the classical form and guarantees that the series of indirect influences converges.',
  'methods.dematel.parameters.normalization.maxRowOrColumnSum': 'Largest row or column sum',
  'methods.dematel.parameters.normalization.maxRowSum': 'Largest row sum only',
  'methods.dematel.parameters.threshold.label': 'Threshold of the cause-effect map',
  'methods.dematel.parameters.threshold.description':
    'Which relations of the total-relation matrix the map shows. It only affects the map, not T, D + R, D − R or the weights.',
  'methods.dematel.parameters.threshold.mean': 'Mean of the total-relation matrix',
  'methods.dematel.parameters.threshold.custom': 'Value I enter',
  'methods.dematel.parameters.customThreshold.label': 'Threshold value',
  'methods.dematel.parameters.customThreshold.description':
    'Used when the threshold is entered by hand. Relations of at least this value are shown. 0 shows every relation.',
  'methods.dematel.parameters.weightBasis.label': 'Weights from',
  'methods.dematel.parameters.weightBasis.description':
    'Prominence D + R gives each factor the share of its involvement. The distance √((D + R)² + (D − R)²) also credits strong causes and strong effects.',
  'methods.dematel.parameters.weightBasis.prominence': 'Prominence D + R',
  'methods.dematel.parameters.weightBasis.distance': 'Distance √((D + R)² + (D − R)²)',
  'methods.dematel.steps.expert-matrices.name': 'Expert matrices',
  'methods.dematel.steps.expert-matrices.explanation':
    'The direct-relation matrix of every expert, one below the other: the influence each factor has on each other factor.',
  'methods.dematel.steps.direct-relation.name': 'Direct-relation matrix Z',
  'methods.dematel.steps.direct-relation.explanation':
    '{experts, plural, one {The influence each factor has directly on each other factor, as entered.} other {The mean of the {experts, number} expert matrices, cell by cell.}}',
  'methods.dematel.steps.row-sums.name': 'Row sums',
  'methods.dematel.steps.row-sums.explanation':
    'The total direct influence each factor dispatches: the sum of its row of Z.',
  'methods.dematel.steps.column-sums.name': 'Column sums',
  'methods.dematel.steps.column-sums.explanation':
    'The total direct influence each factor receives: the sum of its column of Z.',
  'methods.dematel.steps.normalization-constant.name': 'Normalization constant s',
  'methods.dematel.steps.normalization-constant.explanation':
    '{normalization, select, max-row-sum {The largest row sum.} other {The larger of the largest row sum and the largest column sum.}} Dividing by it makes every indirect influence smaller than the one before.',
  'methods.dematel.steps.normalized-matrix.name': 'Normalized matrix X',
  'methods.dematel.steps.normalized-matrix.explanation': 'Every cell of Z divided by s.',
  'methods.dematel.steps.inverse.name': 'Inverse (I − X)⁻¹',
  'methods.dematel.steps.inverse.explanation':
    'The inverse of the identity matrix minus X. It equals I + X + X² + …, the sum of the direct influence and of all indirect influences along chains of any length.',
  'methods.dematel.steps.total-relation.name': 'Total-relation matrix T',
  'methods.dematel.steps.total-relation.explanation':
    'T = X (I − X)⁻¹ = X + X² + X³ + …: the direct influence plus every indirect influence of each factor on each other factor.',
  'methods.dematel.steps.influence.name': 'Dispatched and received influence',
  'methods.dematel.steps.influence.explanation':
    'D is the sum of the row of T (what a factor dispatches to all factors), R the sum of its column (what it receives from all factors).',
  'methods.dematel.steps.prominence-relation.name': 'Prominence and relation',
  'methods.dematel.steps.prominence-relation.explanation':
    'D + R shows how involved a factor is in the system. D − R is positive for a cause (it influences more than it is influenced) and negative for an effect.',
  'methods.dematel.steps.weight-basis.name': 'Weight basis a_i',
  'methods.dematel.steps.weight-basis.explanation':
    'The distance of each factor from the origin of the prominence-relation plane: √((D + R)² + (D − R)²).',
  'methods.dematel.steps.weight-basis-sum.name': 'Sum of the weight basis',
  'methods.dematel.steps.weight-basis-sum.explanation':
    'The sum over all factors of the value the weights are derived from.',
  'methods.dematel.steps.weights.name': 'Factor weights',
  'methods.dematel.steps.weights.explanation':
    'Each factor’s value divided by the sum, so the weights sum to 1 and can feed a ranking method.',
  'methods.dematel.steps.threshold.name': 'Threshold of the cause-effect map',
  'methods.dematel.steps.threshold.explanation':
    '{threshold, select, mean {The mean of all entries of the total-relation matrix.} other {The value entered as a parameter.}} The map shows the relations of at least this value between different factors.',

  // ------------------------------------------------------------ Fuzzy DEMATEL
  'methods.fuzzyDematel.name': 'Fuzzy DEMATEL (TFN)',
  'methods.fuzzyDematel.parameters.defuzzification.label': 'Defuzzification',
  'methods.fuzzyDematel.parameters.defuzzification.description':
    'How D̃ + R̃, D̃ − R̃ and the total-relation matrix are turned into crisp numbers. Centroid and graded mean work on each number alone; CFCS normalizes with all the numbers of a table.',
  'methods.fuzzyDematel.parameters.defuzzification.centroid': 'Centroid (l + m + u) / 3',
  'methods.fuzzyDematel.parameters.defuzzification.gradedMean': 'Graded mean (l + 4m + u) / 6',
  'methods.fuzzyDematel.parameters.defuzzification.cfcs':
    'CFCS (converting fuzzy data into crisp scores)',
  'methods.fuzzyDematel.steps.expert-matrices.name': 'Expert matrices (TFN)',
  'methods.fuzzyDematel.steps.expert-matrices.explanation':
    'The direct-relation matrix of every expert as triangular fuzzy numbers, one below the other.',
  'methods.fuzzyDematel.steps.direct-relation.name': 'Fuzzy direct-relation matrix Z̃',
  'methods.fuzzyDematel.steps.direct-relation.explanation':
    '{experts, plural, one {The fuzzy influence each factor has directly on each other factor, as entered.} other {The mean of the {experts, number} expert matrices, component by component.}}',
  'methods.fuzzyDematel.steps.row-sums.name': 'Fuzzy row sums',
  'methods.fuzzyDematel.steps.row-sums.explanation':
    'The sum of each row of Z̃, component by component.',
  'methods.fuzzyDematel.steps.column-sums.name': 'Fuzzy column sums',
  'methods.fuzzyDematel.steps.column-sums.explanation':
    'The sum of each column of Z̃, component by component.',
  'methods.fuzzyDematel.steps.normalization-constant.name': 'Normalization constant s',
  'methods.fuzzyDematel.steps.normalization-constant.explanation':
    '{normalization, select, max-row-sum {The largest upper component of the row sums.} other {The larger of the largest upper component of the row sums and of the column sums.}} The upper components are the largest, so dividing by s keeps all three matrices convergent.',
  'methods.fuzzyDematel.steps.normalized-matrix.name': 'Fuzzy normalized matrix X̃',
  'methods.fuzzyDematel.steps.normalized-matrix.explanation':
    'Every component of Z̃ divided by s. The l, m and u matrices are handled separately from here on.',
  'methods.fuzzyDematel.steps.inverse.name': 'Inverse (I − X)⁻¹ per component',
  'methods.fuzzyDematel.steps.inverse.explanation':
    'The inverse of the identity matrix minus X, computed for the l matrix, the m matrix and the u matrix separately and put back together as fuzzy numbers.',
  'methods.fuzzyDematel.steps.total-relation.name': 'Fuzzy total-relation matrix T̃',
  'methods.fuzzyDematel.steps.total-relation.explanation':
    'T = X (I − X)⁻¹ for the l, m and u matrices separately: T_l = X_l (I − X_l)⁻¹, and the same for m and u.',
  'methods.fuzzyDematel.steps.influence.name': 'Fuzzy dispatched and received influence',
  'methods.fuzzyDematel.steps.influence.explanation':
    'D̃ is the sum of each row of T̃, R̃ the sum of each column, component by component.',
  'methods.fuzzyDematel.steps.fuzzy-prominence-relation.name': 'Fuzzy prominence and relation',
  'methods.fuzzyDematel.steps.fuzzy-prominence-relation.explanation':
    'D̃ + R̃ and D̃ − R̃ with fuzzy addition and subtraction.',
  'methods.fuzzyDematel.steps.defuzzified-total-relation.name': 'Crisp total-relation matrix',
  'methods.fuzzyDematel.steps.defuzzified-total-relation.explanation':
    'Each fuzzy entry of T̃ defuzzified with the {defuzzification, select, centroid {centroid (l + m + u) / 3} graded-mean {graded mean (l + 4m + u) / 6} cfcs {CFCS method} other {selected formula}}. It sets the threshold of the cause-effect map.',
  'methods.fuzzyDematel.steps.prominence-relation.name': 'Crisp prominence and relation',
  'methods.fuzzyDematel.steps.prominence-relation.explanation':
    'D̃ + R̃ and D̃ − R̃ defuzzified with the {defuzzification, select, centroid {centroid (l + m + u) / 3} graded-mean {graded mean (l + 4m + u) / 6} cfcs {CFCS method, each column on its own} other {selected formula}}. The weights and the groups of causes and effects come from these values.',

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
  'validation.copras.zero-column-sum':
    'Every value of criterion "{id}" is 0. COPRAS divides each value by the sum of its column, so a criterion cannot be 0 everywhere. Remove the criterion or enter its values.',
  'validation.copras.zero-cost-sum':
    'The weighted cost values of this alternative add up to 0 (every cost value is 0, or the cost criteria have weight 0). COPRAS divides by this sum, so the alternative cannot be assessed.',
  'validation.fuzzy-copras.unsupported-weights':
    'The weights use the number type "{numberType}". Fuzzy COPRAS accepts triangular fuzzy or crisp weights.',
  'validation.moora.zero-column-norm':
    'Every value of objective "{id}" is 0, so its norm is 0 and MOORA cannot normalize it. Remove the objective or enter its values.',
  'validation.fuzzy-moora.unsupported-weights':
    'The weights use the number type "{numberType}". Fuzzy MOORA accepts triangular fuzzy or crisp weights.',
  'validation.fuzzy-moora.zero-column-norm':
    'The lower value l of objective "{id}" is 0 for every alternative. Fuzzy normalization divides the upper values by the norm of the lower values, which is 0 here. Give at least one alternative a lower value above 0.',
  'validation.aras.reserved-alternative-id':
    'The alternative id "{id}" is reserved for the optimal alternative of ARAS.',
  'validation.aras.optimal-mismatch':
    'The optimal alternative must have exactly one value for every criterion. Check criterion "{id}": it is missing, repeated or unknown.',
  'validation.aras.invalid-optimal-value':
    'The optimal value of criterion "{id}" must be a finite number that is not negative.',
  'validation.aras.zero-cost-value':
    'A value of cost criterion "{id}" is 0. ARAS inverts the values of cost criteria (1 / x), so they must be greater than zero.',
  'validation.aras.zero-benefit-sum':
    'Every value of benefit criterion "{id}", the optimal one included, is 0. ARAS divides by the column sum, so the criterion cannot be 0 everywhere.',
  'validation.aras.zero-optimal-sum':
    'The optimality function S of the optimal alternative is 0, so the utility degrees K = S / S₀ cannot be calculated. Give the optimal alternative a value above 0 on a criterion that has weight.',
  'validation.aras.optimal-worse-than-alternative':
    'The optimal value of criterion "{id}" is worse than the best alternative. The calculation continues, and an alternative can get a utility degree above 1.',
  'validation.fuzzy-aras.unsupported-weights':
    'The weights use the number type "{numberType}". ARAS-F accepts triangular fuzzy or crisp weights.',
  'validation.fuzzy-aras.zero-cost-value':
    'A value of cost criterion "{id}" has lower value l = 0. ARAS-F inverts cost values (1 / x̃), so l must be greater than zero.',
  'validation.fuzzy-aras.zero-benefit-lower-sum':
    'The lower value l of benefit criterion "{id}", the optimal one included, is 0 for every alternative. Fuzzy normalization divides the upper values by the sum of the lower values, which is 0 here. Give at least one alternative a lower value above 0.',
  'validation.fuzzy-aras.zero-optimal-sum':
    'The fuzzy optimality function S̃ of the optimal alternative is 0, so the utility degrees K = S / S₀ cannot be calculated. Give the optimal alternative a value above 0 on a criterion that has weight.',
  'validation.dematel.relation-shape':
    'The matrix of expert {expert, number} must have {order, number} rows and {order, number} columns, one for each factor.',
  'validation.dematel.non-zero-diagonal':
    'Factor "{id}" is rated as influencing itself (expert {expert, number}). The value is kept, because the formula allows it. Set it to 0 if self-influence is not meant.',
  'validation.dematel.zero-matrix':
    'Every influence is 0, so the matrix cannot be normalized. Rate at least one relation above 0.',
  'validation.dematel.near-singular':
    'The total influence cannot be calculated: the indirect influences do not fade away (for example, every factor dispatches exactly as much influence as the largest one), so the matrix I − X cannot be inverted (condition number {condition, number}). Lower some ratings or use the larger of the row and column sums as the normalization constant.',
} as const;

export type MethodsMessageKey = keyof typeof en;

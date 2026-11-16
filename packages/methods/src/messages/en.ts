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
} as const;

export type MethodsMessageKey = keyof typeof en;

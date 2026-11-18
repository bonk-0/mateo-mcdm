/**
 * The steps of the fuzzy-number lesson, in order (texts: `explain:fuzzyLesson.steps.<id>`).
 * Kept apart from the lesson so that Learn's home page can count them without loading it.
 */
export const FUZZY_LESSON_STEPS = ['why', 'triangle', 'scale', 'arithmetic', 'try'] as const;
export type FuzzyLessonStepId = (typeof FUZZY_LESSON_STEPS)[number];

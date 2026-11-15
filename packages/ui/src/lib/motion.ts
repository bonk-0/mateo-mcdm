/**
 * Motion timing shared by UI transitions and Explain mode (docs/plan.md §14).
 * The same values exist as CSS custom properties in `styles.css`.
 */
export const DURATION = {
  /** Hover and focus feedback. */
  fast: 0.12,
  /** Most transitions: panels, menus, page content. */
  base: 0.2,
  /** Larger movements and emphasis. */
  slow: 0.32,
  /** Explain-mode steps and decorative sequences. */
  explain: 0.6,
} as const;

/** Standard easing as a cubic Bézier, matching `--ease-standard`. */
export const EASE_STANDARD = [0.2, 0, 0, 1] as const;
/** Easing for elements entering the screen, matching `--ease-emphasized`. */
export const EASE_EMPHASIZED = [0.05, 0.7, 0.1, 1] as const;

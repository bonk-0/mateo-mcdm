import { isLanguage, isNumberFormatId, type Language, type NumberFormatId } from '@mateo/i18n';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type LanguagePreference = 'system' | Language;
export type ThemePreference = 'system' | 'light' | 'dark';
export type MotionPreference = 'system' | 'reduce' | 'full';

export const DISPLAY_PRECISIONS = [2, 3, 4, 5, 6, 8] as const;
export type DisplayPrecision = (typeof DISPLAY_PRECISIONS)[number];

/**
 * User preferences of the app shell. The UI language, display number format and import
 * number format are independent and each default to the operating system
 * (docs/plan.md §11).
 */
export interface Settings {
  readonly language: LanguagePreference;
  readonly displayNumberFormat: NumberFormatId;
  readonly importNumberFormat: NumberFormatId;
  /** Fraction digits shown for computed values. Never changes stored values. */
  readonly displayPrecision: DisplayPrecision;
  readonly theme: ThemePreference;
  readonly motion: MotionPreference;
  readonly sidebarCollapsed: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  language: 'system',
  displayNumberFormat: 'system',
  importNumberFormat: 'system',
  displayPrecision: 4,
  theme: 'system',
  motion: 'system',
  sidebarCollapsed: false,
};

interface SettingsActions {
  update: (patch: Partial<Settings>) => void;
  reset: () => void;
}

export type SettingsState = Settings & SettingsActions;

export const SETTINGS_STORAGE_KEY = 'mateo.settings';

const oneOf =
  <T extends string | number>(values: readonly T[]) =>
  (value: unknown): value is T =>
    (values as readonly unknown[]).includes(value);

const validators: { [K in keyof Settings]: (value: unknown) => value is Settings[K] } = {
  language: (v): v is LanguagePreference => v === 'system' || isLanguage(v),
  displayNumberFormat: isNumberFormatId,
  importNumberFormat: isNumberFormatId,
  displayPrecision: oneOf(DISPLAY_PRECISIONS),
  theme: oneOf(['system', 'light', 'dark'] as const),
  motion: oneOf(['system', 'reduce', 'full'] as const),
  sidebarCollapsed: (v): v is boolean => typeof v === 'boolean',
};

/** Keeps only valid stored values so a damaged or outdated entry never breaks the app. */
export function sanitizeSettings(stored: unknown): Settings {
  const result: Record<string, unknown> = { ...DEFAULT_SETTINGS };
  if (stored && typeof stored === 'object') {
    for (const key of Object.keys(validators) as (keyof Settings)[]) {
      const value = (stored as Record<string, unknown>)[key];
      if (validators[key](value)) result[key] = value;
    }
  }
  return result as unknown as Settings;
}

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      ...DEFAULT_SETTINGS,
      update: (patch) => set(patch),
      reset: () => set(DEFAULT_SETTINGS),
    }),
    {
      name: SETTINGS_STORAGE_KEY,
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: ({ update: _update, reset: _reset, ...settings }) => settings,
      merge: (persisted, current) => ({ ...current, ...sanitizeSettings(persisted) }),
    },
  ),
);

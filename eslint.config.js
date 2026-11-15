// @ts-check
import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import globals from 'globals';
import tseslint from 'typescript-eslint';

/**
 * Packages that must stay free of UI code (docs/plan.md §4, docs/phases/README.md rule 6).
 * They may run in Web Workers, Node and tests, so they never import React, Tauri,
 * DOM-bound packages or the UI layer of the monorepo.
 */
export const PURE_PACKAGES = ['engine', 'fuzzy', 'methods', 'io', 'project'];

/** Import specifiers that count as "UI" for the purity rule. */
export const UI_IMPORT_PATTERNS = [
  '@mateo/ui',
  '@mateo/ui/*',
  '@mateo/web',
  '@mateo/web/*',
  '@mateo/desktop',
  '@mateo/desktop/*',
  '@mateo/explain',
  '@mateo/explain/*',
  'react',
  'react/*',
  'react-dom',
  'react-dom/*',
  '@tauri-apps/*',
];

/** Relative paths that climb out of a package into a UI workspace (e.g. `../../ui/src`). */
export const UI_RELATIVE_IMPORT_REGEX = String.raw`^(\.\./)+(packages/)?(ui|explain|apps|web|desktop)(/|$)`;

const PURITY_MESSAGE =
  'Pure packages (engine, fuzzy, methods, io, project) must not import UI or presentation code. See docs/plan.md §4.';

export default tseslint.config(
  {
    ignores: ['**/node_modules/**', '**/dist/**', '**/coverage/**', '**/src-tauri/target/**'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    linterOptions: {
      reportUnusedDisableDirectives: 'error',
    },
    rules: {
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      eqeqeq: ['error', 'always'],
      'no-console': ['error', { allow: ['warn', 'error'] }],
    },
  },
  {
    files: ['*.js', '*.ts', 'tooling/**'],
    languageOptions: { globals: globals.node },
  },
  {
    // Engine purity: no UI imports, no randomness or clock in calculation code.
    files: PURE_PACKAGES.map((name) => `packages/${name}/**/*.ts`),
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: UI_IMPORT_PATTERNS,
              message: PURITY_MESSAGE,
            },
            {
              regex: UI_RELATIVE_IMPORT_REGEX,
              message: PURITY_MESSAGE,
            },
          ],
        },
      ],
    },
  },
  prettier,
);

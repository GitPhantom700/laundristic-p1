import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';

export default tseslint.config(
  // Build output and generated artifacts (replaces the old .eslintignore).
  { ignores: ['dist', 'coverage', 'node_modules'] },

  // App and test sources: browser environment, TypeScript, React.
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      ...tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      // The vite preset is the react-refresh rule with allowConstantExport.
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    rules: {
      // typescript-eslint v8 flipped this default to 'all'; v7 ignored unused
      // catch bindings. Keeping the previous behaviour so this upgrade does not
      // also become a source-cleanup pass.
      '@typescript-eslint/no-unused-vars': ['error', { caughtErrors: 'none' }],
      // New in eslint-plugin-react-hooks v7 and not part of the rule set this
      // project was written against. It flags 11 existing, working call sites
      // (setState inside useEffect); adopting it is a React refactor in its own
      // right rather than part of a toolchain migration.
      'react-hooks/set-state-in-effect': 'off',
    },
  },

  // Vitest runs with `globals: true`, so describe/it/expect are ambient.
  {
    files: ['tests/**/*.{ts,tsx}'],
    languageOptions: { globals: globals.vitest },
  },

  // Media/screenshot scripts run under Node, but their page.evaluate()
  // callbacks are serialised into the browser, so both sets of globals apply.
  {
    files: ['scripts/**/*.mjs'],
    extends: [js.configs.recommended],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { ...globals.node, ...globals.browser },
    },
    rules: {
      // These files were not subject to unused-binding checks under the old
      // eslintrc setup; keep that parity rather than editing the scripts here.
      'no-unused-vars': ['error', { args: 'none', caughtErrors: 'none' }],
    },
  },
);

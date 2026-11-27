// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    // CuratedPlans.js uses `import ... with { type: "json" }`, which the parser cannot read.
    ignores: ['dist/*', 'Components/utils/CuratedPlans.js', 'components/utils/CuratedPlans.js'],
  },
  {
    // Jest globals for test files.
    files: ['**/__screen_tests__/**', '**/*.test.{js,jsx,ts,tsx}', '**/__tests__/**'],
    languageOptions: {
      globals: {
        describe: 'readonly',
        it: 'readonly',
        test: 'readonly',
        expect: 'readonly',
        jest: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
      },
    },
  },
  {
    // The linter's parser cannot read `import ... with { type: "json" }` (CuratedPlans.js),
    // which Metro and Node both support, so skip cross-module namespace parsing.
    rules: {
      'import/namespace': 'off',
      // Windows reports the cwd with different casing than git tracks (`Components/`), so the
      // resolver flags every import as a casing error. Metro/export resolve them fine.
      'import/no-unresolved': ['error', { caseSensitive: false }],
    },
  },
]);

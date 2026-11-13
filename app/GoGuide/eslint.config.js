// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*'],
  },
  {
    // The linter's parser cannot read `import ... with { type: "json" }` (CuratedPlans.js),
    // which Metro and Node both support, so skip cross-module namespace parsing.
    rules: { 'import/namespace': 'off' },
  },
]);

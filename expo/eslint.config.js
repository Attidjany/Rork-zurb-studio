const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

const expoConfigWithIgnores = Array.isArray(expoConfig)
  ? expoConfig.map((c) => ({
      ...c,
      ignores: [...(c.ignores ?? []), 'dist/*', '.expo/**', '.expo/types/router.d.ts'],
    }))
  : expoConfig;

module.exports = defineConfig([
  {
    ignores: ['dist/*', '.expo/**', '.expo/types/router.d.ts'],
  },
  ...(Array.isArray(expoConfigWithIgnores) ? expoConfigWithIgnores : [expoConfigWithIgnores]),
  {
    files: ['**/*'],
    linterOptions: {
      reportUnusedDisableDirectives: 'off',
    },
  },
  {
    files: ['.expo/types/router.d.ts'],
    linterOptions: {
      reportUnusedDisableDirectives: 'off',
    },
  },
]);

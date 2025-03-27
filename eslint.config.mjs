import { defineConfig } from 'eslint/config';
import baseConfig from '@driftingsands/self-service-lint/eslint.config.mjs';

export default defineConfig([
  baseConfig.globalNode,
  baseConfig.globalBrowser,
  baseConfig.prettierRules,
  baseConfig.jsRules,
  baseConfig.blockQuerySelectorRules,
  { files: ['**/*.{js,mjs,cjs}'], languageOptions: { globals: { Clusterize: 'readonly' } } },
  {
    ignores: ['helix-importer-ui', 'libs', 'scripts/countries.js', 'scripts/aem.js'],
  },
]);

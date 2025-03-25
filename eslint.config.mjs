import { defineConfig } from 'eslint/config';
import globals from 'globals';
import js from '@eslint/js';
import prettier from 'eslint-config-prettier';

export default defineConfig([
  { files: ['**/*.{js,mjs,cjs}'] },
  { files: ['**/*.{js,mjs,cjs}'], languageOptions: { globals: { ...globals.browser, Clusterize: 'readonly' } } },
  {
    files: ['**/*.{js,mjs,cjs}'],
    plugins: { js, prettier },
    extends: ['js/recommended', prettier],
  },
  {
    files: ['**/*.{js,mjs,cjs}'],
    rules: {
      'max-len': ['error', { code: 180, ignoreStrings: true, ignoreComments: true }],
      quotes: ['error', 'single', { avoidEscape: true, allowTemplateLiterals: true }],
      'no-console': 'error', // no console logs by default
      indent: ['error', 2],
      'import/prefer-default-export': 'off',
      'no-alert': 'error', // no alert() by default
      'func-names': 'error', // no anonymous functions using function keywords. Anon Arrow functions are okay
      'no-param-reassign': 'error', // no reassigning function parameters
      'no-new': 'error', // no unassigned "new" by default
      'no-empty': 'error', // no empty blocks by default
      'no-undef': 'error',
      'no-unexpected-multiline': 'error',
      semi: ['error', 'always'],
      'no-await-in-loop': 'error',
    },
  },
  {
    ignores: ['helix-importer-ui', 'libs', 'scripts/countries.js', 'scripts/aem.js'],
  },
  {
    // disallowing document.querySelector and document.querySelectorAll by default in blocks code.
    // There is almost never a situation where this should be used instead of block.querySelect...
    // Using selectors on document has caused many issues in many blocks, usually only allowing one block to render properly, and often breaking previous blocks.
    files: ['blocks/**/*.{js,jsx,ts,tsx}'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: "MemberExpression[object.name='document'][property.name='querySelector']",
          message: 'querySelectors should be used on the block. using it on document will result in the block breaking if multiple are used on the page.',
        },
        {
          selector: "MemberExpression[object.name='document'][property.name='querySelectorAll']",
          message: 'querySelectors should be used on the block. using it on document will result in the block breaking if multiple are used on the page.',
        },
      ],
    },
  },
]);

import { defineConfig } from "eslint/config";
import globals from "globals";
import js from "@eslint/js";
import prettier from "eslint-config-prettier";

export default defineConfig([
  { files: ["**/*.{js,mjs,cjs}"] },
  { files: ["**/*.{js,mjs,cjs}"], languageOptions: { globals: { ...globals.browser, Clusterize: "readonly" } } },
  {
    files: ["**/*.{js,mjs,cjs}"],
    plugins: { js, prettier },
    extends: ["js/recommended", prettier],
  },
  {
    files: ["**/*.{js,mjs,cjs}"],
    rules: {
      "max-len": ["error", { code: 180, ignoreStrings: true, ignoreComments: true }],
      quotes: ["error", "double", { avoidEscape: true, allowTemplateLiterals: true }],
      "no-console": "error",
      // indent: ["error", 2],
      "import/prefer-default-export": "off",
      "no-alert": "error",
      "func-names": "error",
      "no-param-reassign": "error",
      "no-new": "error",
      "consistent-return": "error",
      "no-empty": "error",
      "no-undef": "error",
      "no-unexpected-multiline": "error",
    },
  },
  {
    ignores: ["helix-importer-ui", "libs", "scripts/countries.js", "scripts/aem.js"],
  },
  {
    files: ["blocks/**/*.{js,jsx,ts,tsx}"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          "selector": "MemberExpression[object.name='document'][property.name='querySelector']",
          message: "querySelectors should be used on the block. using it on document will result in the block breaking if multiple are used on the page. use eslint-disable-next-line no-restricted-syntax if you need to use document.querySelect"
        },
        {
          "selector": "MemberExpression[object.name='document'][property.name='querySelectorAll']",
          message: "querySelectors should be used on the block. using it on document will result in the block breaking if multiple are used on the page. use eslint-disable-next-line no-restricted-syntax if you need to use document.querySelectAll"
        }
      ],
    },
  },
]);

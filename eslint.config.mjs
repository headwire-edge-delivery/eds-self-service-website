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
    rules: {
      "max-len": ["error", { code: 180, ignoreStrings: true, ignoreComments: true }],
      quotes: ["error", "double"],
      "no-console": "error",
      indent: ["error", 2],
      "import/prefer-default-export": "off",
    },
  },
  {
    ignores: ["helix-importer-ui", "libs"],
  },
]);

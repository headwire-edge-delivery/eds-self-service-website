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
    },
  },
  {
    ignores: ["helix-importer-ui", "libs", "scripts/countries.js", "scripts/aem.js"],
  },
  {
    files: ["blocks/**/*.{js,jsx,ts,tsx}"],
    rules: {
      // TODO: not working
      "no-restricted-globals": [
        "error",
        {
          name: "document.querySelector",
          message: "use block.querySelector instead!",
        },
        {
          name: "document.querySelectorAll",
          message: "use block.querySelector instead!",
        },
      ],
    },
  },

  // Custom rule definition
  // {
  //   rules: {
  //     "no-dom-queries-in-blocks": ["error", {
  //       create(context) {
  //         const forbiddenMethods = [
  //           "querySelector",
  //           "querySelectorAll"
  //         ];

  //         return {
  //           CallExpression(node) {
  //             const callee = node.callee;

  //             if (
  //               callee.object?.name === "document" &&
  //               forbiddenMethods.includes(callee.property.name)
  //             ) {
  //               context.report({
  //                 node: node,
  //                 message: `DOM queries (${callee.property.name}) are not allowed in blocks/ directory. Consider using alternative methods.`
  //               });
  //             }
  //           }
  //         };
  //       },
  //       meta: {
  //         type: "problem",
  //         docs: {
  //           description: "Disallow DOM queries in blocks/ directory",
  //           category: "Best Practices",
  //           recommended: "error"
  //         },
  //         messages: {
  //           noDomQueries: "DOM queries are not allowed in blocks/ directory."
  //         },
  //         schema: [] // No options
  //       },
  //       default: "error"
  //     }]
  //   }
  // }
]);

const { globSync } = require("glob");

let packages = globSync("packages/*", { absolute: true });

const vitestFiles = [
  "packages/**/__tests__/**/*",
  "packages/**/*.{spec,test}.*",
];

/** @type {import('eslint').Linter.Config} */
module.exports = {
  extends: [
    "@remix-run/eslint-config",
    "@remix-run/eslint-config/node",
    "@remix-run/eslint-config/internal",
  ],
  rules: {
    "import/no-extraneous-dependencies": [
      "error",
      { packageDir: [...packages, "example", "."] },
    ],
  },
  overrides: [
    {
      extends: ["@remix-run/eslint-config/jest-testing-library"],
      files: vitestFiles,
      rules: {
        "testing-library/no-await-sync-events": "off",
        "jest-dom/prefer-in-document": "off",
      },
      // we're using vitest which has a very similar API to jest
      // (so the linting plugins work nicely), but it means we have to explicitly
      // set the jest version.
      settings: {
        jest: {
          version: 28,
        },
      },
    },
  ],
};

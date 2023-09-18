const { globSync } = require("glob");

let packages = globSync("packages/*/", {});

// get files in packages
const noExtraneousOverrides = packages.map((entry) => {
  return {
    files: `${entry}**/*`,
    rules: {
      "import/no-extraneous-dependencies": [
        "error",
        {
          packageDir: [__dirname, entry],
        },
      ],
    },
  };
});

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
  overrides: [
    ...noExtraneousOverrides,
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

  // Report unused `eslint-disable` comments.
  reportUnusedDisableDirectives: true,
  // Tell ESLint not to ignore dot-files, which are ignored by default.
  ignorePatterns: ["!.*.js", "!.*.mjs", "!.*.cjs"],
};

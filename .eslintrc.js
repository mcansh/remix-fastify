const { glob } = require("glob");

let packages = glob.sync("packages/*", {
  absolute: true,
  cwd: process.cwd(),
});

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
};

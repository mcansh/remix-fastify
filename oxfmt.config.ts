import { defineConfig } from "oxfmt"

export default defineConfig({
  ignorePatterns: [],
  sortImports: true,
  sortPackageJson: true,
  sortTailwindcss: true,
  jsdoc: true,
  semi: false,
  printWidth: 80,
})

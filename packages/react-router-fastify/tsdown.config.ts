import { defineConfig } from "tsdown"

export default defineConfig({
  entry: {
    index: "./src/index.ts",
    vite: "./src/vite.ts",
  },
  exports: true,
  sourcemap: true,
  tsconfig: "./tsconfig.json",
  dts: true,
  attw: { profile: "esm-only" },
  publint: true,
  treeshake: true,
})

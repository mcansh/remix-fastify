import { defineConfig } from "tsdown"

export default defineConfig({
  entry: {
    index: "./src/index.ts",
    vite: "./src/vite.ts",
  },
  deps: {
    neverBundle: [
      "@mcansh/react-router-fastify",
      "@mcansh/react-router-fastify/vite",
    ],
  },
  exports: true,
  tsconfig: "./tsconfig.json",
  dts: true,
  attw: { profile: "esm-only" },
  publint: true,
  treeshake: true,
})

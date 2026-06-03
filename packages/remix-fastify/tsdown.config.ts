import { defineConfig } from "tsdown";
import pkg from "./package.json" with { type: "json" };

const PACKAGE_NAME = pkg.name;
const FASTIFY_VERSION = pkg.peerDependencies.fastify;

export default defineConfig({
  entry: {
    "index": "./src/index.ts",
    "vite": "./src/vite.ts",
  },
  exports: true,
  sourcemap: true,
  tsconfig: "./tsconfig.json",
  dts: true,
  clean: true,
  format: "esm",
  bundle: true,
  attw: {
    profile: "esm-only",
  },
  publint: true,
  platform: "node",
  skipNodeModulesBundle: true,
  treeshake: true,
  define: {
    "process.env.__PACKAGE_NAME__": JSON.stringify(PACKAGE_NAME),
    "process.env.__FASTIFY_VERSION__": JSON.stringify(FASTIFY_VERSION),
  },
});

import { defineConfig } from "tsdown";
import pkg from "./package.json" with { type: "json" };

export default defineConfig(() => {
  return {
    entry: {
      index: "./src/index.ts",
      vite: "./src/vite.ts",
    },
    exports: true,
    sourcemap: true,
    tsconfig: "./tsconfig.json",
    dts: true,
    clean: true,
    format: ["esm"],
    splitting: false,
    bundle: true,
    platform: "node",
    skipNodeModulesBundle: true,
    attw: {
      profile: "esm-only"
    },
    publint: true,
    treeshake: true,
    define: {
      "process.env.__PACKAGE_NAME__": JSON.stringify(pkg.name),
      "process.env.__FASTIFY_VERSION__": JSON.stringify(
        pkg.peerDependencies.fastify,
      ),
    },
  };
});

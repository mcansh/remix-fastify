import { defineConfig } from "tsup";

import pkg from "./package.json";

export default defineConfig(() => {
  return {
    entry: ["src/index.ts"],
    sourcemap: true,
    tsconfig: "./tsconfig.json",
    dts: true,
    format: ["cjs", "esm"],
    cjsInterop: true,
    splitting: true,
    platform: "node",
    skipNodeModulesBundle: true,
    treeshake: true,
    define: {
      "process.env.__PACKAGE_NAME__": JSON.stringify(pkg.name),
      "process.env.__FASTIFY_VERSION__": JSON.stringify(
        pkg.peerDependencies.fastify,
      ),
    },
  };
});

import { defineConfig } from "tsdown";
import pkg from "./package.json" with { type: "json" };

export default defineConfig({
  entry: {
    index: "./src/remix/index.ts",
    "react-router": "./src/react-router/index.ts",
  },
  exports: true,
  sourcemap: true,
  tsconfig: "./tsconfig.json",
  dts: true,
  clean: true,
  format: ["cjs", "esm"],
  platform: "node",
  skipNodeModulesBundle: true,
  treeshake: true,
  define: {
    "process.env.__PACKAGE_NAME__": JSON.stringify(pkg.name),
    "process.env.__FASTIFY_VERSION__": JSON.stringify(
      pkg.peerDependencies.fastify,
    ),
  },
});

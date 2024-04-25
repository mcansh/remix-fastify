import { defineConfig } from "tsup";

import pkg from "./package.json";

export default defineConfig(() => {
  return {
    entry: ["src/index.ts", "src/plugin.ts"],
    sourcemap: true,
    tsconfig: "./tsconfig.json",
    dts: true,
    format: ["cjs", "esm"],
    clean: true,
    cjsInterop: true,
    splitting: false,
    platform: "node",
    skipNodeModulesBundle: true,
    treeshake: true,
    define: {
      "process.env.__PACKAGE_NAME__": JSON.stringify(pkg.name),
    },
  };
});

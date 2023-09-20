import { defineConfig } from "tsup";

export default defineConfig(() => {
  return {
    entry: ["src/index.ts"],
    sourcemap: true,
    tsconfig: "./tsconfig.json",
    dts: true,
    format: ["cjs", "esm"],
    clean: true,
    cjsInterop: true,
    splitting: true,
    platform: "node",
    skipNodeModulesBundle: true,
    treeshake: true,
  };
});

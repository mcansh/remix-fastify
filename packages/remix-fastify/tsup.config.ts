import { defineConfig } from "tsup";
import type { Options } from "tsup";

import pkgJSON from "./package.json";
let external = Object.keys(pkgJSON.dependencies || {});

export default defineConfig(() => {
  let shared_options: Options = {
    entry: ["src/index.ts"],
    sourcemap: true,
    external,
    tsconfig: "./tsconfig.json",
  };

  return [
    {
      ...shared_options,
      format: "cjs",
    },

    {
      ...shared_options,
      format: "esm",
      dts: true,
    },
  ];
});

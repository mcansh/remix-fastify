import Fsp from "node:fs/promises";
import { defineConfig } from "tsdown";
import pkg from "./package.json" with { type: "json" };

export default defineConfig(() => {
  return {
    entry: {
      "index": "./src/remix.ts",
      "react-router": "./src/react-router.ts",
      "middleware": "./src/middleware.ts",
    },
    exports: true,
    sourcemap: true,
    tsconfig: "./tsconfig.json",
    dts: true,
    clean: true,
    format: ["cjs", "esm"],
    cjsInterop: true,
    splitting: false,
    bundle: true,
    platform: "node",
    skipNodeModulesBundle: true,
    treeshake: true,
    define: {
      "process.env.__PACKAGE_NAME__": JSON.stringify(pkg.name),
      "process.env.__FASTIFY_VERSION__": JSON.stringify(
        pkg.peerDependencies.fastify,
      ),
    },
    async onSuccess() {
      let subPaths = ["react-router", "middleware"];

      // generate root re-exports for each sub-path
      for (let subPath of subPaths) {
        let cjs = js`module.exports = require("./dist/${subPath}");`;
        let esm = js`export * from "./dist/${subPath}";`;

        await Promise.all([
          Fsp.writeFile(`${subPath}.cjs`, cjs),
          Fsp.writeFile(`${subPath}.js`, esm),
          Fsp.writeFile(`${subPath}.d.ts`, esm),
          Fsp.writeFile(`${subPath}.d.cts`, esm),
        ]);
      }
    },
  };
});

let js = String.raw;

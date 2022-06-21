#!/usr/bin/env node

let { build, ts, tsconfig, dirname, glob, log } = require("estrella");
let pkg = require("./package.json");

build({
  entry: glob("src/**/*.ts"),
  outdir: dirname(pkg.main),
  minify: false,
  target: "node14",
  format: "cjs",
  platform: "node",
  sourcemap: true,
  onEnd(config) {
    generateTypeDefs(tsconfig(config), config.entry, config.outdir);
  },
});

function generateTypeDefs(tsconfig, entryfiles, outDir) {
  let entries = Array.isArray(entryfiles) ? entryfiles : [entryfiles];
  let allEntries = [...entries, ...tsconfig.include];
  let uniqueEntries = [...new Set(allEntries)];
  let filenames = uniqueEntries.filter((v) => v);

  log.info("Generating type declaration files for", filenames.join(", "));
  let compilerOptions = {
    ...tsconfig.compilerOptions,
    moduleResolution: undefined,
    declaration: true,
    noEmit: undefined,
    outDir,
  };
  let program = ts.ts.createProgram(filenames, compilerOptions);
  let targetSourceFile = undefined;
  let writeFile = undefined;
  let cancellationToken = undefined;
  let emitOnlyDtsFiles = true;
  program.emit(
    targetSourceFile,
    writeFile,
    cancellationToken,
    emitOnlyDtsFiles
  );
  log.info("Wrote", glob(outDir + "/*.d.ts").join(", "));
}

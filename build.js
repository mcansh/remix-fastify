#!/usr/bin/env node

let path = require("node:path");
let { build, ts, tsconfig, log } = require("estrella");
let glob = require("glob");

let packages = glob.sync("packages/*/package.json", { absolute: true });

for (let package of packages) {
  let pkg = require(package);
  let packageDir = path.dirname(package);

  build({
    entry: glob.sync(path.join(packageDir, "src", "**", "*.ts")),
    outdir: path.join(packageDir, path.dirname(pkg.main)),
    minify: false,
    target: "node14",
    format: "cjs",
    platform: "node",
    sourcemap: true,
    onEnd(config) {
      generateTypeDefs(tsconfig(config), config.entry, config.outdir);
    },
  });
}

function generateTypeDefs(tsconfig, entryfiles, outDir) {
  let entries = Array.isArray(entryfiles) ? entryfiles : [entryfiles];
  let allEntries = [...entries, ...tsconfig.include];
  let uniqueEntries = [...new Set(allEntries)];
  let rootDir = path.dirname(outDir);
  let filenames = uniqueEntries
    .filter((v) => v)
    .map((v) => path.relative(rootDir, v));

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
  log.info("Wrote", glob.sync(outDir + "/*.d.ts").join(", "));
}

import fsp from "node:fs/promises";
import path from "node:path";
import url from "node:url";
import { glob } from "glob";
import PackageJson from "@npmcli/package-json";

let __dirname = path.dirname(url.fileURLToPath(import.meta.url));
let rootDir = path.resolve(__dirname, "..");

// 1. remove CHANGELOG.md from './examples/*'
let changelogs = await glob("./examples/*/CHANGELOG.md", {
  absolute: true,
  cwd: rootDir,
});

for (let file of changelogs) {
  await fsp.rm(file);
  let dir = path.dirname(file);
  console.log(`🚫 Removed changelog from ${dir}`);
}

// 2. remove `version: null` from './examples/*/package.json'
let packageJsons = await glob("./examples/*/package.json", {
  absolute: true,
  cwd: rootDir,
});

for (let file of packageJsons) {
  let pkg = await PackageJson.load(path.dirname(file));
  if (pkg.content.version === null) {
    delete pkg.content.version;
    await pkg.fix({ changes: true });
    await pkg.save();
  }
}

import fs from "node:fs";
import path from "node:path";
import url from "node:url";
import { glob } from "glob";
import PackageJson from "@npmcli/package-json";

let __dirname = path.dirname(url.fileURLToPath(import.meta.url));
let rootDir = path.resolve(__dirname, "..");

// 1. remove CHANGELOG.md from './examples/*'
let changelogs = glob.sync("./examples/*/CHANGELOG.md", { cwd: rootDir });

for (let file of changelogs) {
  fs.rmSync(path.resolve(rootDir, file));
}

// 2. remove `version: null` from './examples/*/package.json'
let packageJsons = glob.sync("./examples/*/package.json", { cwd: rootDir });

for (let file of packageJsons) {
  let pkg = await PackageJson.load(path.dirname(file));
  if (pkg.content.version === null) {
    delete pkg.content.version;
    await pkg.fix({ changes: true });
    await pkg.save();
  }
}

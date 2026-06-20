import fs from "node:fs"
import fsp from "node:fs/promises"
import path from "node:path"

import PackageJson from "@npmcli/package-json"

const rootDir = import.meta.resolve(import.meta.dirname, "..")

// 1. remove CHANGELOG.md from './examples/*'
const changelogsIterator = fsp.glob("./examples/*/CHANGELOG.md", {
  cwd: rootDir,
})
const changelogs: Array<string> = []

for await (let file of changelogsIterator) {
  changelogs.push(file)
}

for (let file of changelogs) {
  fs.rmSync(path.resolve(rootDir, file))
  console.log(`✅ Removed ${file}`)
}

// 2. remove `version: null` from './examples/*/package.json'
const examplePackageJsonsIterator = fsp.glob("./examples/*/package.json", {
  cwd: rootDir,
})
const examplePackageJsons: Array<string> = []

for await (let file of examplePackageJsonsIterator) {
  examplePackageJsons.push(file)
}

for (let file of examplePackageJsons) {
  let pkg = await PackageJson.load(path.dirname(file))
  delete pkg.content.version
  await pkg.save()
  console.log(`✅ Removed version from ${file}`)
}

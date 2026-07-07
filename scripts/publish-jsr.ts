import { spawnSync } from "node:child_process"
import fsp from "node:fs/promises"
import path from "node:path"

const rootDir = path.resolve(import.meta.dirname, "..")
const args = process.argv.slice(2)
const packageDirs: Array<string> = []

const jsrConfigFilesIterator = fsp.glob("./packages/*/jsr.json", {
  cwd: rootDir,
})

for await (let file of jsrConfigFilesIterator) {
  packageDirs.push(path.dirname(file))
}

packageDirs.sort()

for (let packageDir of packageDirs) {
  console.log(`Publishing ${packageDir} to JSR`)

  let result = spawnSync("npx", ["--yes", "jsr", "publish", ...args], {
    cwd: path.resolve(rootDir, packageDir),
    stdio: "inherit",
  })

  if (result.status !== 0) {
    process.exit(result.status ?? 1)
  }
}

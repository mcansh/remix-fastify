import fsp from "node:fs/promises"
import path from "node:path"

const rootDir = path.resolve(import.meta.dirname, "..")

type PackageJson = {
  version?: string
}

type JsrJson = {
  version?: string
}

const jsrConfigFilesIterator = fsp.glob("./packages/*/jsr.json", {
  cwd: rootDir,
})

for await (let file of jsrConfigFilesIterator) {
  let packageDir = path.dirname(file)
  let packageJsonPath = path.resolve(rootDir, packageDir, "package.json")
  let jsrJsonPath = path.resolve(rootDir, file)

  let packageJson = JSON.parse(
    await fsp.readFile(packageJsonPath, "utf8"),
  ) as PackageJson
  let jsrJson = JSON.parse(await fsp.readFile(jsrJsonPath, "utf8")) as JsrJson

  if (!packageJson.version) {
    throw new Error(`Missing version in ${packageJsonPath}`)
  }

  if (jsrJson.version === packageJson.version) {
    continue
  }

  jsrJson.version = packageJson.version

  await fsp.writeFile(jsrJsonPath, `${JSON.stringify(jsrJson, null, 2)}\n`)
  console.log(`Updated ${file} to ${packageJson.version}`)
}

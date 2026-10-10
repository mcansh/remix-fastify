import { spawnSync } from "node:child_process"
import { mkdtempSync, readFileSync, rmSync } from "node:fs"
import { createRequire } from "node:module"
import { tmpdir } from "node:os"
import path from "node:path"
import { pathToFileURL } from "node:url"

const require = createRequire(import.meta.url)

function publish(reportPath: string): number {
  let result = spawnSync(
    process.execPath,
    [require.resolve("@changesets/cli/bin.js"), "publish"],
    {
      stdio: "inherit",
      env: { ...process.env, CHANGESETS_OUTPUT: reportPath },
    },
  )
  if (result.error) throw result.error
  return result.status ?? 1
}

export function runPublish(
  run: (reportPath: string) => number = publish,
  log: (message: string) => void = console.log,
): number {
  let directory = mkdtempSync(path.join(tmpdir(), "changesets-publish-"))
  let reportPath = path.join(directory, "events.jsonl")
  try {
    let status = run(reportPath)
    if (status !== 0) return status

    // Changesets v3 reports tags as JSONL. The v1 GitHub action still
    // detects releases from the v2 CLI's "New tag:" stdout messages.
    for (let line of readFileSync(reportPath, "utf8").split("\n")) {
      if (!line.trim()) continue
      let event: { type: string; tag?: string } = JSON.parse(line)
      if (event.type === "git-tag" && event.tag) {
        log(`New tag: ${event.tag}`)
      }
    }
    return 0
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  process.exitCode = runPublish()
}

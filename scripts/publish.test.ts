import assert from "node:assert/strict"
import { execFileSync, spawnSync } from "node:child_process"
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs"
import { createRequire } from "node:module"
import { tmpdir } from "node:os"
import path from "node:path"
import test from "node:test"

const cli = createRequire(import.meta.url).resolve("@changesets/cli/bin.js")
const packageName = "@mcansh/react-router-fastify"
const version = "6.0.0"

test("changeset:release builds packages and then runs changeset publish", () => {
  let pkg = JSON.parse(
    readFileSync(new URL("../package.json", import.meta.url), "utf8"),
  )
  assert.equal(
    pkg.scripts["changeset:release"],
    "pnpm run build:packages && changeset publish",
  )
})

test("installed CLI git-tag writes the action report and leaves the file", () => {
  let directory = mkdtempSync(path.join(tmpdir(), "changesets-report-test-"))
  try {
    writeReleaseFixture(directory)
    let reportPath = path.join(directory, "events.ndjson")
    let result = runGitTag(directory, reportPath)
    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`)
    assert.equal(existsSync(reportPath), true)
    assert.deepEqual(gitTagEvents(reportPath), [
      {
        type: "git-tag",
        tag: "@mcansh/react-router-fastify@6.0.0",
        packageName: "@mcansh/react-router-fastify",
      },
    ])
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
})

test("an empty git-tag report has no events and does not print New tag", () => {
  let directory = mkdtempSync(path.join(tmpdir(), "changesets-report-test-"))
  try {
    writeReleaseFixture(directory)
    execFileSync("git", ["tag", `${packageName}@${version}`], {
      cwd: directory,
    })
    let reportPath = path.join(directory, "events.ndjson")
    let result = runGitTag(directory, reportPath)
    let output = `${result.stdout ?? ""}${result.stderr ?? ""}`
    assert.equal(result.status, 0, output)
    assert.equal(readFileSync(reportPath, "utf8"), "")
    assert.deepEqual(gitTagEvents(reportPath), [])
    assert.doesNotMatch(output, /New tag:/)
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
})

function writeReleaseFixture(directory: string) {
  mkdirSync(path.join(directory, ".changeset"))
  mkdirSync(path.join(directory, "packages/adapter"), { recursive: true })
  writeFileSync(
    path.join(directory, "package.json"),
    JSON.stringify({
      name: "release-test",
      private: true,
    }),
  )
  writeFileSync(
    path.join(directory, "pnpm-workspace.yaml"),
    "packages:\n  - packages/*\n",
  )
  writeFileSync(path.join(directory, ".changeset/config.json"), "{}")
  writeFileSync(
    path.join(directory, "packages/adapter/package.json"),
    JSON.stringify({
      name: packageName,
      version,
    }),
  )
  execFileSync("git", ["init", "--quiet"], { cwd: directory })
  execFileSync("git", ["config", "user.name", "Release Test"], {
    cwd: directory,
  })
  execFileSync("git", ["config", "user.email", "release@example.com"], {
    cwd: directory,
  })
  execFileSync("git", ["config", "commit.gpgsign", "false"], {
    cwd: directory,
  })
  execFileSync("git", ["config", "tag.gpgsign", "false"], { cwd: directory })
  execFileSync("git", ["commit", "--quiet", "--allow-empty", "-m", "fixture"], {
    cwd: directory,
  })
}

function runGitTag(directory: string, reportPath: string) {
  return spawnSync(process.execPath, [cli, "git-tag"], {
    cwd: directory,
    env: { ...process.env, CHANGESETS_OUTPUT: reportPath },
    encoding: "utf8",
  })
}

function gitTagEvents(reportPath: string) {
  let events: Array<{ type: string; tag: string; packageName: string }> = []
  for (let line of readFileSync(reportPath, "utf8").split("\n")) {
    if (!line.trim()) continue
    let event = JSON.parse(line)
    if (
      event.type === "git-tag" &&
      typeof event.tag === "string" &&
      typeof event.packageName === "string"
    ) {
      events.push({
        type: event.type,
        tag: event.tag,
        packageName: event.packageName,
      })
    }
  }
  return events
}

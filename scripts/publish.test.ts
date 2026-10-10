import assert from "node:assert/strict"
import { execFileSync } from "node:child_process"
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs"
import { createRequire } from "node:module"
import { tmpdir } from "node:os"
import path from "node:path"
import test from "node:test"

import { runPublish } from "./publish.ts"

test("accepts the installed Changesets CLI's actual tag report", () => {
  let directory = mkdtempSync(path.join(tmpdir(), "changesets-report-test-"))
  try {
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
        name: "@mcansh/react-router-fastify",
        version: "6.0.0",
      }),
    )
    execFileSync("git", ["init", "--quiet"], { cwd: directory })
    execFileSync("git", ["config", "commit.gpgsign", "false"], {
      cwd: directory,
    })
    execFileSync("git", ["config", "tag.gpgsign", "false"], { cwd: directory })
    execFileSync(
      "git",
      [
        "-c",
        "user.name=Release Test",
        "-c",
        "user.email=release@example.com",
        "commit",
        "--quiet",
        "--allow-empty",
        "-m",
        "fixture",
      ],
      { cwd: directory },
    )
    let messages: string[] = []
    let status = runPublish(
      (reportPath) => {
        execFileSync(
          process.execPath,
          [
            createRequire(import.meta.url).resolve("@changesets/cli/bin.js"),
            "git-tag",
          ],
          {
            cwd: directory,
            env: { ...process.env, CHANGESETS_OUTPUT: reportPath },
          },
        )
        return 0
      },
      (message) => messages.push(message),
    )
    assert.equal(status, 0)
    assert.deepEqual(messages, ["New tag: @mcansh/react-router-fastify@6.0.0"])
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
})

test("reports v3 git tags in the format consumed by changesets/action v1", () => {
  let messages: string[] = []
  let report = ""
  let status = runPublish(
    (reportPath) => {
      report = reportPath
      writeFileSync(
        reportPath,
        `${JSON.stringify({
          type: "git-tag",
          tag: "@mcansh/react-router-fastify@6.0.0",
          packageName: "@mcansh/react-router-fastify",
        })}\n`,
      )
      return 0
    },
    (message) => messages.push(message),
  )

  assert.equal(status, 0)
  // This is the detection regex from the action used by release.yml.
  let match = messages
    .join("\n")
    .match(/New tag:\s+(@[^/]+\/[^@]+|[^/]+)@([^\s]+)/)
  assert.equal(match?.[1], "@mcansh/react-router-fastify")
  assert.equal(match?.[2], "6.0.0")
  assert.equal(existsSync(report), false)
})

test("does not announce a release when all versions are already published", () => {
  let messages: string[] = []
  let status = runPublish(
    (reportPath) => {
      writeFileSync(reportPath, "")
      return 0
    },
    (message) => messages.push(message),
  )
  assert.equal(status, 0)
  assert.deepEqual(messages, [])
})

test("preserves publish failures and does not announce success", () => {
  let messages: string[] = []
  let report = ""
  let status = runPublish(
    (reportPath) => {
      report = reportPath
      return 7
    },
    (message) => messages.push(message),
  )
  assert.equal(status, 7)
  assert.deepEqual(messages, [])
  assert.equal(existsSync(report), false)
})

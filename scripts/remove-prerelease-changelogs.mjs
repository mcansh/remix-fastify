import * as fs from "node:fs";
import path from "node:path";
import * as url from "node:url";
import { getPackagesSync } from "@manypkg/get-packages";

const __dirname = url.fileURLToPath(new URL(".", import.meta.url));
const rootDir = path.join(__dirname, "..");

const DRY_RUN = false;
// pre-release headings look like: "1.15.0-pre.2"
const PRE_RELEASE_HEADING_REGEXP = /^\d+\.\d+\.\d+-pre\.\d+$/i;
// stable headings look like: "1.15.0"
const STABLE_HEADING_REGEXP = /^\d+\.\d+\.\d+$/i;

main();

async function main() {
  if (isPrereleaseMode()) {
    console.log("🚫 Skipping changelog removal in prerelease mode");
    return;
  }
  await removePreReleaseChangelogs();
  console.log("✅ Removed pre-release changelogs");
}

async function removePreReleaseChangelogs() {
  let allPackages = getPackagesSync(rootDir).packages;

  /** @type {Promise<any>[]} */
  let processes = [];
  for (let pkg of allPackages) {
    let changelogPath = path.join(pkg.dir, "CHANGELOG.md");
    if (!fs.existsSync(changelogPath)) {
      continue;
    }
    let changelogFileContents = fs.readFileSync(changelogPath, "utf-8");
    processes.push(
      (async () => {
        let preReleaseHeadingIndex = findHeadingLineIndex(
          changelogFileContents,
          {
            level: 2,
            startAtIndex: 0,
            matcher: PRE_RELEASE_HEADING_REGEXP,
          }
        );

        while (preReleaseHeadingIndex !== -1) {
          let nextStableHeadingIndex = findHeadingLineIndex(
            changelogFileContents,
            {
              level: 2,
              startAtIndex: preReleaseHeadingIndex + 1,
              matcher: STABLE_HEADING_REGEXP,
            }
          );

          // remove all lines between the pre-release heading and the next stable
          // heading
          changelogFileContents = removeLines(changelogFileContents, {
            start: preReleaseHeadingIndex,
            end: nextStableHeadingIndex === -1 ? "max" : nextStableHeadingIndex,
          });

          // find the next pre-release heading
          preReleaseHeadingIndex = findHeadingLineIndex(changelogFileContents, {
            level: 2,
            startAtIndex: 0,
            matcher: PRE_RELEASE_HEADING_REGEXP,
          });
        }

        if (DRY_RUN) {
          console.log("FILE CONTENTS:\n\n" + changelogFileContents);
        } else {
          await fs.promises.writeFile(
            changelogPath,
            changelogFileContents,
            "utf-8"
          );
        }
      })()
    );
  }
  return Promise.all(processes);
}

function isPrereleaseMode() {
  try {
    let prereleaseFilePath = path.join(rootDir, ".changeset", "pre.json");
    return fs.existsSync(prereleaseFilePath);
  } catch (err) {
    return false;
  }
}

/**
 * @param {string} markdownContents
 * @param {{ level: number; startAtIndex: number; matcher: RegExp }} opts
 */
function findHeadingLineIndex(
  markdownContents,
  { level, startAtIndex, matcher }
) {
  let index = markdownContents.split("\n").findIndex((line, i) => {
    if (i < startAtIndex || !line.startsWith(`${"#".repeat(level)} `))
      return false;
    let headingContents = line.slice(level + 1).trim();
    return matcher.test(headingContents);
  });
  return index;
}

/**
 * @param {string} markdownContents
 * @param {{ start: number; end: number | 'max' }} param1
 */
function removeLines(markdownContents, { start, end }) {
  let lines = markdownContents.split("\n");
  lines.splice(start, end === "max" ? lines.length - start : end - start);
  return lines.join("\n");
}

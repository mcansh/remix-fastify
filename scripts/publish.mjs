#!/usr/bin/env node

import { execSync } from "node:child_process";
import semver from "semver";
import { globSync } from "glob";

let packages = globSync("packages/*", { absolute: true });

function getTaggedVersion() {
  let output = execSync("git tag --list --points-at HEAD").toString().trim();
  return output.replace(/^v/g, "");
}

/**
 * @param {string} dir
 * @param {string} tag
 */
function publish(dir, tag) {
  execSync(`npm publish --access public --tag ${tag} ${dir}`, {
    stdio: "inherit",
  });
}

async function run() {
  // Make sure there's a current tag
  let taggedVersion = getTaggedVersion();
  if (taggedVersion === "") {
    console.error("Missing release version. Run the version script first.");
    process.exit(1);
  }

  let prerelease = semver.prerelease(taggedVersion);
  let prereleaseTag = prerelease ? String(prerelease[0]) : undefined;
  let tag = prereleaseTag
    ? prereleaseTag.includes("nightly")
      ? "nightly"
      : prereleaseTag.includes("experimental")
      ? "experimental"
      : prereleaseTag
    : "latest";

  for (let name of packages) {
    publish(name, tag);
  }
}

run().then(
  () => {
    process.exit(0);
  },
  (error) => {
    console.error(error);
    process.exit(1);
  }
);

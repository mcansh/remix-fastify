const path = require("node:path");
const fsp = require("node:fs/promises");

let cache = new Map();

async function getExamples() {
  if (cache.size > 0) return cache;

  let exampleRoot = path.join(__dirname, "examples");
  let exampleContents = await fsp.readdir(exampleRoot, { withFileTypes: true });
  let directories = exampleContents
    .filter((dirent) => dirent.isDirectory())
    .map((dirent) => dirent.name);

  for (const file of directories) {
    const content = await fsp.readFile(
      path.join(exampleRoot, file, "package.json"),
      "utf-8",
    );

    let pkg = JSON.parse(content);

    cache.set(pkg.name, pkg);
  }

  return cache;
}

async function readPackage(pkg) {
  // first get the examples from the examples directory and cache them
  // this is necessary because we need to use the examples in the package.json
  // but we don't want to read the directory every time
  let examples = await getExamples();

  // replace hardcoded version of remix-fastify with workspace:*
  // this is necessary because we're using pnpm workspaces
  // and we want to use the local version of remix-fastify
  // instead of the published version
  // but we want to keep the version in the package.json
  if (pkg.dependencies["@mcansh/remix-fastify"]) {
    pkg.dependencies["@mcansh/remix-fastify"] = "workspace:*";
  }

  let remixPackages = Object.keys(pkg.dependencies).filter((p) => {
    return p.startsWith("@remix-run");
  });

  if (pkg.dependencies["remix"]) {
    pkg.dependencies["remix"] = "latest";
  }

  for (let p of remixPackages) {
    if (pkg.dependencies[p]) {
      pkg.dependencies[p] = "latest";
    }
  }

  return pkg;
}

module.exports = {
  hooks: {
    readPackage,
  },
};

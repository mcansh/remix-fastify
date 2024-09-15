function readPackage(pkg) {
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

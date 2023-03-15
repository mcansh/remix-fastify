import { globSync } from "glob";

export interface StaticFile {
  // whether or not the file is in the build directory
  isBuildAsset: boolean;
  // relative file path to file on disk from the public directory
  filePublicPath: string;
  // url in the browser
  browserAssetUrl: string;
}

export function getStaticFiles({
  assetsBuildDirectory,
  publicPath,
  rootDir,
}: {
  assetsBuildDirectory: string;
  publicPath: string;
  rootDir: string;
}): Array<StaticFile> {
  let staticFilePaths = globSync(`public/**/*`, {
    dot: true,
    nodir: true,
    cwd: rootDir,
  });

  return staticFilePaths.map((filepath) => {
    let normalized = filepath.replace(/\\/g, "/");
    let isBuildAsset = normalized.startsWith(assetsBuildDirectory);

    let browserAssetUrl = isBuildAsset
      ? normalized.replace(
          assetsBuildDirectory,
          `/${publicPath.split("/").filter(Boolean).join("/")}`
        )
      : normalized;

    return {
      isBuildAsset,
      filePublicPath: filepath,
      browserAssetUrl,
    };
  });
}

export function purgeRequireCache(BUILD_DIR: string) {
  // purge require cache on requests for "server side HMR" this won't let
  // you have in-memory objects between requests in development,
  // alternatively you can set up nodemon/pm2-dev to restart the server on
  // file changes, but then you'll have to reconnect to databases/etc on each
  // change. We prefer the DX of this, so we've included it for you by default
  // delete require.cache[BUILDDIR];
  // delete require.cache[__filename];

  for (let key in require.cache) {
    if (key.startsWith(BUILD_DIR)) {
      delete require.cache[key];
    }
  }
}

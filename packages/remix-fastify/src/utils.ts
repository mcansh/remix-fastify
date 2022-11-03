import path from "node:path";
import * as glob from "glob";

export interface StaticFile {
  // whether or not the file is in the build directory
  isBuildAsset: boolean;
  // relative file path to file on disk from the public directory
  filePublicPath: string;
  // url in the browser
  browserAssetUrl: string;
}

export function getStaticFiles(
  assetsBuildDirectory: string,
  publicPath: string
): Array<StaticFile> {
  let staticFilePaths = glob.sync(`public/**/*`, { dot: true, nodir: true });

  return staticFilePaths.map((filepath) => {
    let isBuildAsset = filepath.startsWith(assetsBuildDirectory);

    let filePublicPath = filepath.replace(
      isBuildAsset ? assetsBuildDirectory : "public",
      ""
    );

    let browserAssetUrl = isBuildAsset
      ? path.join(publicPath, filePublicPath)
      : filePublicPath;

    return {
      isBuildAsset,
      filePublicPath,
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

import path from "node:path";
import * as glob from "glob";

export function getStaticFiles(
  assetsBuildDirectory: string,
  publicPath: string
) {
  let staticFilePaths = glob.sync(`public/**/*`, { dot: true, nodir: true });
  return staticFilePaths.map((filepath) => {
    let isBuildAsset = filepath.startsWith(assetsBuildDirectory!);
    let assetPath = filepath.replace(assetsBuildDirectory!, "");
    let filePublicPath = filepath.replace(assetsBuildDirectory!, publicPath!);
    filePublicPath = path.posix.join("/", filePublicPath);
    return { filePublicPath, assetPath, isBuildAsset };
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

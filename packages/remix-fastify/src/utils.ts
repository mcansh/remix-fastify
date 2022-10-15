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

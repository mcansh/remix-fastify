import type { EarlyHintItem } from "@fastify/early-hints";
import type { ServerBuild } from "@remix-run/node";
import { matchRoutes } from "@remix-run/router";
import type { FastifyRequest } from "fastify";
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
  let staticFilePaths = globSync(`**/*`, {
    dot: true,
    nodir: true,
    cwd: rootDir,
    ignore: ["**/node_modules/**"],
  });

  return staticFilePaths
    .filter((filepath) => filepath.startsWith("public"))
    .map((filePublicPath) => {
      let normalized = filePublicPath.replace(/\\/g, "/");
      let isBuildAsset = normalized.startsWith(assetsBuildDirectory);

      let browserAssetUrl = "/";

      if (isBuildAsset) {
        browserAssetUrl += normalized.replace(
          assetsBuildDirectory,
          publicPath.split("/").filter(Boolean).join("/"),
        );
      } else {
        browserAssetUrl += normalized.replace("public/", "");
      }

      return {
        isBuildAsset,
        filePublicPath: filePublicPath.replace("public/", ""),
        browserAssetUrl,
      };
    });
}

export function getEarlyHintLinks(
  request: FastifyRequest,
  serverBuild: ServerBuild,
): EarlyHintItem[] {
  let origin = `${request.protocol}://${request.hostname}`;
  let url = new URL(`${origin}${request.url}`);

  let routes = Object.values(serverBuild.assets.routes);
  let matches = matchRoutes(routes, url.pathname);
  if (!matches || matches.length === 0) return [];
  let links = matches.flatMap((match) => {
    let routeImports = match.route.imports || [];
    let imports = [
      match.route.module,
      ...routeImports,
      serverBuild.assets.url,
      serverBuild.assets.entry.module,
      ...serverBuild.assets.entry.imports,
    ];

    return imports;
  });

  return links.map((link) => {
    return { href: link, as: "script", rel: "preload" };
  });
}

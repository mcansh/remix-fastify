import type { FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";
import fastifyStatic from "@fastify/static";
import path from "node:path";

import { getStaticFiles } from "./utils";

type PluginOptions = {
  assetsBuildDirectory: string;
  publicPath: string;
  rootDir?: string;
};

let staticFiles: FastifyPluginAsync<PluginOptions> = async (
  fastify,
  { rootDir = process.cwd(), assetsBuildDirectory, publicPath },
) => {
  fastify.register(fastifyStatic, {
    wildcard: false,
    root: "/public",
    serve: false,
    prefix: makePublicPath(publicPath),
    decorateReply: false,
  });

  fastify.register(fastifyStatic, {
    wildcard: false,
    root: "/public",
    serve: false,
  });

  let staticFiles = getStaticFiles({
    assetsBuildDirectory,
    publicPath,
    rootDir,
  });

  for (let file of staticFiles) {
    fastify.get(file.browserAssetUrl, (_request, reply) => {
      return reply.sendFile(
        file.filePublicPath,
        path.join(process.cwd(), "public"),
        {
          cacheControl: true,
          acceptRanges: true,
          dotfiles: "allow",
          etag: true,
          immutable: file.isBuildAsset,
          lastModified: true,
          maxAge: file.isBuildAsset ? "1y" : "1h",
          serveDotFiles: true,
        },
      );
    });
  }
};

function makePublicPath(publicPath: string): string {
  if (!publicPath.startsWith("/")) {
    publicPath = `/${publicPath}`;
  }
  if (!publicPath.endsWith("/")) {
    publicPath = `${publicPath}/`;
  }
  if (!publicPath.endsWith("*")) {
    publicPath = `${publicPath}*`;
  }

  return publicPath;
}

export let staticFilePlugin = fp(staticFiles, {
  name: "@mcansh/remix-fastify",
  fastify: "^3.29.0 || ^4.0.0",
  dependencies: [],
});

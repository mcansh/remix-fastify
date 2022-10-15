import * as path from "node:path";

import fastifyStatic from "@fastify/static";
import type { ServerBuild } from "@remix-run/node";
import type { FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";
import fastifyRacing from "fastify-racing";

import { createRequestHandler } from "./server";
import { getStaticFiles } from "./utils";

interface PluginOptions {
  mode?: string;
  build?: ServerBuild;
  /**
   * @deprecated
   * @see https://remix.run/docs/en/v1/api/conventions#publicpath
   * Same as assetsBuildDirectory in remix.config.js, but absolute or relative to this file
   */
  assetsBuildDirectory?: string;
  /**
   * @deprecated
   * @see https://remix.run/docs/en/v1/api/conventions#assetsbuilddirectory
   * Must match the same setting in remix.config.js
   */
  publicPath?: string;
}

let remixFastify: FastifyPluginAsync<PluginOptions> = async (
  fastify,
  options = {}
) => {
  let {
    build,
    assetsBuildDirectory,
    publicPath,
    mode = process.env.NODE_ENV,
  } = options;

  if (!build) {
    throw new Error("You must provide a build");
  }

  assetsBuildDirectory ||= build.assetsBuildDirectory;
  publicPath ||= build.publicPath;

  if (!fastify.hasContentTypeParser("*")) {
    fastify.addContentTypeParser("*", (_request, payload, done) => {
      done(null, payload);
    });
  }

  fastify.register(fastifyRacing, { handleError: true });

  fastify.register(fastifyStatic, {
    root: path.join(process.cwd(), "public"),
    // this needs to be false so our regular requests can still be served
    wildcard: false,
    // we handle serving the files ourselves as you cant stack roots (public/build, public)
    serve: false,
  });

  let staticFiles = getStaticFiles(assetsBuildDirectory, publicPath);

  for (let asset of staticFiles) {
    fastify.get(asset.filePublicPath, (_request, reply) => {
      reply.sendFile(asset.assetPath, assetsBuildDirectory, {
        maxAge: asset.isBuildAsset ? "1y" : "1h",
        immutable: asset.isBuildAsset,
      });
    });
  }

  let requestHandler = createRequestHandler({ build, mode });

  fastify.all("*", requestHandler);
};

export let remixFastifyPlugin = fp(remixFastify, {
  name: "@mcansh/remix-fastify",
  fastify: "^3.29.0 || ^4.0.0",
});

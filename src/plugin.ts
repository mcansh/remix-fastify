import fastifyStatic from "@fastify/static";
import type { ServerBuild } from "@remix-run/node";
import type { FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";
import glob from "glob";
import path from "path";
import { createRequestHandler } from "./server";

interface PluginOptions {
  mode?: string;
  build?: ServerBuild;
  // Same as assetsBuildDirectory in remix.config.js, but absolute or relative to this file
  assetsBuildDirectory?: string;
  // Must match the same setting in remix.config.js
  publicPath?: string;
}

const remixFastify: FastifyPluginAsync<PluginOptions> = async (
  fastify,
  options = {}
) => {
  let fullOptions = Object.assign(
    {
      mode: process.env.NODE_ENV,
      assetsBuildDirectory: path.resolve(process.cwd(), "public", "build"),
      publicPath: "/build/",
    },
    options
  );

  if (!fullOptions.build) {
    throw new Error("Must provide a build");
  }

  if (!fastify.hasContentTypeParser("*")) {
    fastify.addContentTypeParser("*", (_request, payload, done) => {
      let data = "";
      payload.on("data", (chunk) => {
        data += chunk;
      });
      payload.on("end", () => {
        done(null, data);
      });
    });
  }

  fastify.register(fastifyStatic, {
    root: path.join(process.cwd(), "public"),
    // this needs to be false so our regular requests can still be served
    wildcard: false,
    // we handle serving the files ourselves as you cant stack roots (public/build, public)
    serve: false,
  });

  const staticFilePaths = glob.sync(`public/**/*`, {
    dot: true,
    absolute: true,
    nodir: true,
  });

  let staticFiles = staticFilePaths.map((filepath) => {
    return {
      path: filepath.replace(path.join(process.cwd(), "public"), ""),
      filepath,
      isBuildAsset: filepath.startsWith(fullOptions.assetsBuildDirectory),
    };
  });

  for (const asset of staticFiles) {
    fastify.get(asset.path, (_request, reply) => {
      reply.sendFile(asset.path, {
        maxAge: asset.isBuildAsset ? "1y" : "1d",
        immutable: asset.isBuildAsset,
      });
    });
  }

  let requestHandler = createRequestHandler({
    build: fullOptions.build,
    mode: fullOptions.mode,
  });

  fastify.all("*", requestHandler);
};

export const remixFastifyPlugin = fp(remixFastify, {
  name: "remix-fastify",
  fastify: "^3.29.0",
});

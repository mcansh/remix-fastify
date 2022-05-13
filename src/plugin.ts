import fastifyStatic from "@fastify/static";
import type { ServerBuild } from "@remix-run/node";
import type { FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";
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

  await fastify.register(fastifyStatic, {
    root: fullOptions.assetsBuildDirectory,
    prefix: "/",
    wildcard: false,
    maxAge: 31536000,
    dotfiles: "allow",
  });

  await fastify.register(fastifyStatic, {
    // the reply decorator has been added by the first plugin registration
    decorateReply: false,
    root: path.join(process.cwd(), "public"),
    prefix: "/",
    wildcard: false,
    maxAge: 3600,
    dotfiles: "allow",
  });

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

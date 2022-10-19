import * as path from "node:path";

import fastifyStatic from "@fastify/static";
import type { ServerBuild } from "@remix-run/node";
import type { FastifyPluginAsync, FastifyReply } from "fastify";
import fp from "fastify-plugin";
import fastifyRacing from "fastify-racing";
import invariant from "tiny-invariant";

import { createRequestHandler } from "./server";
import { getStaticFiles, purgeRequireCache, StaticFile } from "./utils";

interface PluginOptions {
  buildDir?: string;
  mode?: string;
}

let remixFastify: FastifyPluginAsync<PluginOptions> = async (
  fastify,
  options = {}
) => {
  let { buildDir, mode = process.env.NODE_ENV } = options;
  invariant(buildDir, "You must provide a build");
  let build: ServerBuild = require(buildDir);

  if (!fastify.hasContentTypeParser("*")) {
    fastify.addContentTypeParser("*", (_request, payload, done) => {
      done(null, payload);
    });
  }

  fastify.register(fastifyRacing, { handleError: true });

  let ROOT_DIR = process.cwd();
  let PUBLIC_DIR = path.join(ROOT_DIR, "public");
  let ASSET_DIR = path.join(ROOT_DIR, build.assetsBuildDirectory);

  fastify.register(fastifyStatic, {
    root: PUBLIC_DIR,
    // this needs to be false so our regular requests can still be served
    wildcard: false,
    // we handle serving the files ourselves as you cant stack roots (public/build, public)
    serve: false,
  });

  function sendAsset(reply: FastifyReply, file: StaticFile) {
    return reply.sendFile(
      file.filePublicPath,
      file.isBuildAsset ? ASSET_DIR : PUBLIC_DIR,
      {
        maxAge: file.isBuildAsset ? "1y" : "1h",
        immutable: file.isBuildAsset,
      }
    );
  }

  if (mode === "development") {
    fastify.addHook("onRequest", (request, reply, done) => {
      let staticFiles = getStaticFiles(
        build.assetsBuildDirectory,
        build.publicPath
      );

      let staticFile = staticFiles.find((file) => {
        return (
          request.url ===
          (file.isBuildAsset ? file.browserAssetUrl : file.filePublicPath)
        );
      });

      if (staticFile) {
        return sendAsset(reply, staticFile);
      }

      done();
    });
  } else {
    let staticFiles = getStaticFiles(
      build.assetsBuildDirectory,
      build.publicPath
    );
    for (const staticFile of staticFiles) {
      fastify.get(staticFile.browserAssetUrl, (_request, reply) => {
        return sendAsset(reply, staticFile);
      });
    }
  }

  if (mode === "development") {
    fastify.all("*", (request, reply) => {
      invariant(buildDir, `we lost the buildDir`);
      purgeRequireCache(buildDir);
      return createRequestHandler({ build: require(buildDir), mode })(
        request,
        reply
      );
    });
  } else {
    fastify.all("*", createRequestHandler({ build: require(buildDir), mode }));
  }
};

export let remixFastifyPlugin = fp(remixFastify, {
  name: "@mcansh/remix-fastify",
  fastify: "^3.29.0 || ^4.0.0",
});

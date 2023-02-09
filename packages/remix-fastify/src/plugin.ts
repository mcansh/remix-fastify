import * as path from "node:path";
import { pathToFileURL } from "node:url";
import fastifyStatic from "@fastify/static";
import type { ServerBuild } from "@remix-run/node";
import type { FastifyPluginAsync, FastifyReply } from "fastify";
import fp from "fastify-plugin";
import fastifyRacing from "fastify-racing";
import invariant from "tiny-invariant";

import type { GetLoadContextFunction } from "./server";
import { createRequestHandler } from "./server";
import type { StaticFile } from "./utils";
import { getStaticFiles, purgeRequireCache } from "./utils";

interface PluginOptions {
  build?: ServerBuild | string;
  mode?: string;
  rootDir?: string;
  getLoadContext?: GetLoadContextFunction;
  purgeRequireCacheInDevelopment?: boolean;
}

async function loadBuild(build: ServerBuild | string) {
  if (typeof build === "string") {
    if (!build.endsWith(".js")) {
      build = path.join(build, "index.js");
    }
    let fileURL = pathToFileURL(build);
    fileURL.searchParams.set("ts", Date.now().toString());
    let module = await import(fileURL.toString());
    return module.default;
  }

  return build;
}

let remixFastify: FastifyPluginAsync<PluginOptions> = async (
  fastify,
  options = {}
) => {
  let {
    build,
    mode = process.env.NODE_ENV,
    rootDir = process.cwd(),
    purgeRequireCacheInDevelopment = process.env.NODE_ENV === "development",
  } = options;
  invariant(build, "You must provide a build");
  let resolvedBuild: ServerBuild = await loadBuild(build);

  if (!fastify.hasContentTypeParser("*")) {
    fastify.addContentTypeParser("*", (_request, payload, done) => {
      done(null, payload);
    });
  }

  fastify.register(fastifyRacing, { handleError: true });

  let PUBLIC_DIR = path.join(rootDir, "public");
  let ASSET_DIR = path.join(rootDir, resolvedBuild.assetsBuildDirectory);

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
        resolvedBuild.assetsBuildDirectory,
        resolvedBuild.publicPath,
        rootDir
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
      resolvedBuild.assetsBuildDirectory,
      resolvedBuild.publicPath,
      rootDir
    );
    for (let staticFile of staticFiles) {
      fastify.get(staticFile.browserAssetUrl, (_request, reply) => {
        return sendAsset(reply, staticFile);
      });
    }
  }

  let getLoadContext =
    typeof options.getLoadContext === "function"
      ? options.getLoadContext
      : undefined;

  if (mode === "development" && typeof build === "string") {
    fastify.all("*", async (request, reply) => {
      invariant(build, "we lost the build");
      invariant(
        typeof build === "string",
        `to support "HMR" you must pass a path to the build`
      );
      if (purgeRequireCacheInDevelopment) {
        purgeRequireCache(build);
      }
      return createRequestHandler({
        build: await loadBuild(build),
        mode,
        getLoadContext,
      })(request, reply);
    });
  } else {
    fastify.all(
      "*",
      createRequestHandler({
        build: resolvedBuild,
        mode,
        getLoadContext,
      })
    );
  }
};

export let remixFastifyPlugin = fp(remixFastify, {
  name: "@mcansh/remix-fastify",
  fastify: "^3.29.0 || ^4.0.0",
});

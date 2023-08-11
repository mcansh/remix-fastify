import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from "fastify";
import fastifyStatic from "@fastify/static";
import fastifyEarlyHints from "@fastify/early-hints";
import type { ServerBuild } from "@remix-run/node";
import { broadcastDevReady } from "@remix-run/node";
import fp from "fastify-plugin";
import fastifyRacing from "fastify-racing";
import invariant from "tiny-invariant";
import chokidar from "chokidar";

import type { GetLoadContextFunction } from "./server";
import { createRequestHandler } from "./server";
import { ensureSlashes, getEarlyHintLinks } from "./utils";

interface PluginOptions {
  /**
   * The Remix build to use.
   * This can either be a path to the build or the build itself.
   */
  build?: ServerBuild | string;
  /**
   * The mode your app is running in.
   * This is used to determine how to handle errors.
   * @default process.env.NODE_ENV
   */
  mode?: string;
  /**
   * The root directory of your app.
   * This is used to resolve the `public` directory.
   * @default process.cwd()
   */
  rootDir?: string;
  /**
   * A function that returns the value to use as `context` in route `loader` and
   * `action` functions.
   *
   * You can think of this as an escape hatch that allows you to pass
   * environment/platform-specific values through to your loader/action.
   */
  getLoadContext?: GetLoadContextFunction;
  /**
   * enable early hints
   * note this won't include any imports from your remix `links()` function.
   * it will only include the js needed to render the current page
   * @default true
   */
  earlyHints?: boolean;
}

async function loadBuild(
  build: ServerBuild | string | undefined,
): Promise<ServerBuild> {
  if (!build) {
    throw new Error(`you must pass a build to the plugin`);
  }

  if (typeof build === "string") {
    let stat = fs.statSync(build);
    if (stat.isDirectory()) {
      throw new Error(
        `you must pass a build file to the plugin, not a directory`,
      );
    }
    let fileURL = pathToFileURL(build);
    fileURL.searchParams.set("ts", stat.mtimeMs.toString());
    let module = await import(fileURL.toString());
    return module;
  }

  return build;
}

let serverBuild: ServerBuild | Promise<ServerBuild>;

let remixFastify: FastifyPluginAsync<PluginOptions> = async (
  app,
  options = {},
) => {
  let {
    build,
    mode = process.env.NODE_ENV,
    rootDir = process.cwd(),
    earlyHints = true,
  } = options;
  invariant(build, "you must pass a remix build to the plugin");

  serverBuild = await loadBuild(build);

  if (!app.hasContentTypeParser("*")) {
    app.addContentTypeParser("*", (_request, payload, done) => {
      done(null, payload);
    });
  }

  let PUBLIC_DIR = path.join(process.cwd(), "public");
  let BUILD_DIR = path.join(PUBLIC_DIR, "build");

  app.addHook("onRequest", async (request, reply) => {
    let url = request.url;
    let build = await serverBuild;

    let regex = new RegExp(`^${ensureSlashes(build.publicPath)}`);

    // check if the request is for a static asset in the public directory
    let publicPath = path.join(PUBLIC_DIR, url);

    // if the request is for a static asset in the public directory, and it's not `/`, send it
    if (url !== "/" && fs.existsSync(publicPath)) {
      return reply.sendFile(url, PUBLIC_DIR);
    }

    // check if the request is for a build asset
    let isBuildAsset = url.startsWith(ensureSlashes(build.publicPath));

    if (isBuildAsset) {
      let assetPath = url.replace(
        regex,
        ensureSlashes(build.assetsBuildDirectory),
      );

      let normalizedAssetPath = assetPath.split("/").join(path.sep);

      return reply.sendFile(normalizedAssetPath, process.cwd());
    }
  });

  if (earlyHints) {
    await app.register(fastifyEarlyHints, { warn: true });
  }

  await app.register(fastifyRacing, { handleError: true });

  app.register(fastifyStatic, {
    root: BUILD_DIR,
    immutable: true,
    maxAge: "1y",
    decorateReply: false,
    wildcard: false,
  });

  app.register(fastifyStatic, {
    root: PUBLIC_DIR,
    maxAge: "1h",
    wildcard: false,
  });

  app.all("*", async (request, reply) => {
    let build = await serverBuild;
    if (process.env.NODE_ENV === "development") {
      if (earlyHints) {
        let links = getEarlyHintLinks(request, build);
        await reply.writeEarlyHintsLinks(links);
      }
      if (typeof build === "string") {
        return createDevRequestHandler(build)(request, reply);
      }
    }

    if (earlyHints) {
      let links = getEarlyHintLinks(request, build);
      await reply.writeEarlyHintsLinks(links);
    }
    return createRequestHandler({
      build: build,
      mode,
      getLoadContext: options.getLoadContext,
    })(request, reply);
  });
};

function createDevRequestHandler(build: string) {
  let watcher = chokidar.watch(build, { ignoreInitial: true });
  watcher.on("all", async () => {
    serverBuild = loadBuild(build);
    broadcastDevReady(await serverBuild);
  });
  return async (request: FastifyRequest, reply: FastifyReply) =>
    createRequestHandler({ build: await serverBuild, mode: "development" })(
      request,
      reply,
    );
}

export let remixFastifyPlugin = fp(remixFastify, {
  name: "@mcansh/remix-fastify",
  fastify: "^3.29.0 || ^4.0.0",
});

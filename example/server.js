import url from "node:url";
import fs from "node:fs";
import fastify from "fastify";
import {
  createRequestHandler,
  staticFilePlugin,
  getEarlyHintLinks,
} from "@mcansh/remix-fastify";
import { broadcastDevReady, installGlobals } from "@remix-run/node";
import { fastifyEarlyHints } from "@fastify/early-hints";

installGlobals();

let BUILD_PATH = "./build/index.js";
let VERSION_PATH = "./build/version.txt";

/** @typedef {import('@remix-run/node').ServerBuild} ServerBuild */

/** @type {ServerBuild} */
let initialBuild = await import(BUILD_PATH);

let handler;

if (process.env.NODE_ENV === "development") {
  handler = await createDevRequestHandler(initialBuild);
} else {
  handler = createRequestHandler({
    build: initialBuild,
    mode: initialBuild.mode,
  });
}

let app = fastify();

let noopContentParser = (_request, payload, done) => {
  done(null, payload);
};

app.addContentTypeParser("application/json", noopContentParser);
app.addContentTypeParser("*", noopContentParser);

await app.register(fastifyEarlyHints, { warn: true });

// match with remix.config
await app.register(staticFilePlugin, {
  assetsBuildDirectory: "public/build",
  publicPath: "/build/",
});

app.all("*", async (request, reply) => {
  if (process.env.NODE_ENV === "production") {
    let links = getEarlyHintLinks(request, initialBuild);
    await reply.writeEarlyHintsLinks(links);
  }

  return handler(request, reply);
});

let port = process.env.PORT ? Number(process.env.PORT) || 3000 : 3000;

let address = await app.listen({ port, host: "0.0.0.0" });
console.log(`✅ app ready: ${address}`);

if (process.env.NODE_ENV === "development") {
  await broadcastDevReady(initialBuild);
}

/**
 * @param {ServerBuild} initialBuild
 * @param {import('@mcansh/remix-fastify').GetLoadContextFunction} [getLoadContext]
 * @returns {Promise<import('@mcansh/remix-fastify').RequestHandler>}
 */
async function createDevRequestHandler(initialBuild, getLoadContext) {
  let build = initialBuild;

  async function handleServerUpdate() {
    // 1. re-import the server build
    build = await reimportServer();
    // 2. tell Remix that this app server is now up-to-date and ready
    await broadcastDevReady(build);
  }

  let chokidar = await import("chokidar");
  chokidar
    .watch(VERSION_PATH, { ignoreInitial: true })
    .on("add", handleServerUpdate)
    .on("change", handleServerUpdate);

  return async (request, reply) => {
    let links = getEarlyHintLinks(request, build);
    await reply.writeEarlyHintsLinks(links);

    return createRequestHandler({
      build: await build,
      getLoadContext,
      mode: "development",
    })(request, reply);
  };
}

/** @returns {Promise<ServerBuild>} */
async function reimportServer() {
  let stat = fs.statSync(BUILD_PATH);

  // convert build path to URL for Windows compatibility with dynamic `import`
  let BUILD_URL = url.pathToFileURL(BUILD_PATH).href;

  // use a timestamp query parameter to bust the import cache
  return import(BUILD_URL + "?t=" + stat.mtimeMs);
}

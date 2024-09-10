import fs from "node:fs";
import path from "node:path";
import url from "node:url";
import chalk from "chalk";
import fastify from "fastify";
import { createRequestHandler } from "@mcansh/remix-fastify";
import { broadcastDevReady, installGlobals } from "@remix-run/node";
import { fastifyStatic } from "@fastify/static";
import sourceMapSupport from "source-map-support";
import getPort, { portNumbers } from "get-port";

installGlobals();
sourceMapSupport.install();

let __dirname = url.fileURLToPath(new URL(".", import.meta.url));
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

let PUBLIC_DIR = path.join(__dirname, "public");
let BUILD_DIR = path.join(PUBLIC_DIR, "build");

let ASSET_CACHE_CONTROL = "public, max-age=31536000, immutable";
let DEFAULT_CACHE_CONTROL = "public, max-age=3600";

function setHeaders(res, filepath) {
  let isAsset = filepath.startsWith(BUILD_DIR);
  res.setHeader(
    "cache-control",
    isAsset ? ASSET_CACHE_CONTROL : DEFAULT_CACHE_CONTROL,
  );
}

if (process.env.NODE_ENV === "production") {
  await app.register(fastifyStatic, {
    root: PUBLIC_DIR,
    prefix: "/",
    wildcard: false,
    decorateReply: false,
    cacheControl: true,
    dotfiles: "allow",
    etag: true,
    serveDotFiles: true,
    lastModified: true,
    setHeaders,
  });
}

await app.register(fastifyStatic, {
  root: BUILD_DIR,
  prefix: "/",
  wildcard: false,
  cacheControl: true,
  dotfiles: "allow",
  etag: true,
  serveDotFiles: true,
  lastModified: true,
  setHeaders(res, filepath) {
    let isAsset = filepath.startsWith(BUILD_DIR);
    res.setHeader(
      "cache-control",
      isAsset ? ASSET_CACHE_CONTROL : DEFAULT_CACHE_CONTROL,
    );
  },
});

app.register(async function (childServer) {
  childServer.removeAllContentTypeParsers();

  // allow all content types
  childServer.addContentTypeParser("*", (_request, payload, done) => {
    done(null, payload);
  });

  // handle SSR requests
  childServer.all("*", async (request, reply) => {
    try {
      return handler(request, reply);
    } catch (error) {
      console.error(error);
      return reply.status(500).send(error);
    }
  });
});

const desiredPort = Number(process.env.PORT) || 3000;
const portToUse = await getPort({
  port: portNumbers(desiredPort, desiredPort + 100),
});

let address = await app.listen({ port: portToUse, host: "0.0.0.0" });

if (portToUse !== desiredPort) {
  console.warn(
    chalk.yellow(
      `⚠️  Port ${desiredPort} is not available, using ${portToUse} instead.`,
    ),
  );
}

console.log(chalk.green(`✅ app ready: ${address}`));

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

import fs from "node:fs";
import fastify from "fastify";
import {
  createRequestHandler,
  staticFilePlugin,
  getEarlyHintLinks,
} from "@mcansh/remix-fastify";
import { installGlobals } from "@remix-run/node";
import sourceMapSupport from "source-map-support";
import { fastifyEarlyHints } from "@fastify/early-hints";

sourceMapSupport.install();
installGlobals();

let BUILD_PATH = "./build/index.mjs";

/**
 * @type { import('@remix-run/node').ServerBuild | Promise<import('@remix-run/node').ServerBuild> }
 */
let build = await import(BUILD_PATH);

let app = fastify();

let noopContentParser = (_request, payload, done) => {
  done(null, payload);
};

app.addContentTypeParser("application/json", noopContentParser);
app.addContentTypeParser("*", noopContentParser);

await app.register(fastifyEarlyHints, { warn: true });

// match with remix.config
app.register(staticFilePlugin, {
  assetsBuildDirectory: "public/build",
  publicPath: "/modules/",
});

app.all("*", async (request, reply) => {
  if (process.env.NODE_ENV === "development") {
    let devHandler = await createDevRequestHandler();
    return devHandler(request, reply);
  }

  let links = getEarlyHintLinks(request, build);
  await reply.writeEarlyHintsLinks(links);

  return createRequestHandler({
    build,
    getLoadContext: () => ({ loadContextName: "John Doe" }),
    mode: process.env.NODE_ENV,
  })(request, reply);
});

let port = process.env.PORT ? Number(process.env.PORT) || 3000 : 3000;

let address = await app.listen({ port, host: "0.0.0.0" });
console.log(`✅ app ready: ${address}`);

if (process.env.NODE_ENV === "development") {
  let { broadcastDevReady } = await import("@remix-run/node");
  broadcastDevReady(build);
}

async function createDevRequestHandler() {
  let chokidar = await import("chokidar");
  let watcher = chokidar.default.watch(BUILD_PATH, { ignoreInitial: true });
  watcher.on("all", async () => {
    // 1. purge require cache && load updated server build
    const stat = fs.statSync(BUILD_PATH);
    build = import(BUILD_PATH + "?t=" + stat.mtimeMs);
    // 2. tell dev server that this app server is now ready
    let { broadcastDevReady } = await import("@remix-run/node");
    broadcastDevReady(await build);
  });

  return async (request, reply) => {
    let links = getEarlyHintLinks(request, build);
    await reply.writeEarlyHintsLinks(links);

    return createRequestHandler({
      build: await build,
      getLoadContext: () => ({ loadContextName: "John Doe" }),
      mode: "development",
    })(request, reply);
  };
}

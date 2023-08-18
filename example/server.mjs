import fs from "node:fs";
import path from "node:path";
import fastify from "fastify";
import { createRequestHandler, getStaticFiles } from "@mcansh/remix-fastify";
import { installGlobals } from "@remix-run/node";
import sourceMapSupport from "source-map-support";
import fastifyStatic from "@fastify/static";
import chokidar from "chokidar";

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

app.register(fastifyStatic, {
  wildcard: false,
  root: "/public",
  serve: false,
  prefix: "/build/*",
  decorateReply: false,
});

app.register(fastifyStatic, {
  wildcard: false,
  root: "/public",
  serve: false,
});

let staticFiles = await getStaticFiles({
  assetsBuildDirectory: "public/build",
  publicPath: "/build/",
  rootDir: process.cwd(),
});

for (let file of staticFiles) {
  app.get(file.browserAssetUrl, (request, reply) => {
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

app.all(
  "*",
  process.env.NODE_ENV === "development"
    ? createDevRequestHandler()
    : createRequestHandler({
        build,
        getLoadContext: () => ({ loadContextName: "John Doe" }),
        mode: process.env.NODE_ENV,
      }),
);

let port = process.env.PORT ? Number(process.env.PORT) || 3000 : 3000;

let address = await app.listen({ port, host: "0.0.0.0" });
console.log(`✅ app ready: ${address}`);

if (process.env.NODE_ENV === "development") {
  let { broadcastDevReady } = await import("@remix-run/node");
  broadcastDevReady(build);
}

function createDevRequestHandler() {
  let watcher = chokidar.watch(BUILD_PATH, { ignoreInitial: true });
  watcher.on("all", async () => {
    // 1. purge require cache && load updated server build
    const stat = fs.statSync(BUILD_PATH);
    build = import(BUILD_PATH + "?t=" + stat.mtimeMs);
    // 2. tell dev server that this app server is now ready
    let { broadcastDevReady } = await import("@remix-run/node");
    broadcastDevReady(await build);
  });

  return async (request, reply) => {
    return createRequestHandler({
      build: await build,
      getLoadContext: () => ({ loadContextName: "John Doe" }),
      mode: "development",
    })(request, reply);
  };
}

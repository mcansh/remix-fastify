import url from "node:url";
import path from "node:path";
import fastify from "fastify";
import { createRequestHandler } from "@mcansh/remix-fastify";
import { installGlobals } from "@remix-run/node";
import { fastifyStatic } from "@fastify/static";
import middie from "@fastify/middie";
import {
  unstable_createViteServer,
  unstable_loadViteServerBuild,
} from "@remix-run/dev";

installGlobals();

let vite =
  process.env.NODE_ENV === "production"
    ? undefined
    : await unstable_createViteServer();

let app = fastify();

await app.register(middie);

let noopContentParser = (_request, payload, done) => {
  done(null, payload);
};

app.addContentTypeParser("application/json", noopContentParser);
app.addContentTypeParser("*", noopContentParser);

let __dirname = url.fileURLToPath(new URL(".", import.meta.url));

// handle asset requests
if (vite) {
  await app.use(vite.middlewares);
} else {
  await app.register(fastifyStatic, {
    root: path.join(__dirname, "public", "build"),
    prefix: "/build",
    wildcard: true,
    decorateReply: false,
    cacheControl: true,
    dotfiles: "allow",
    etag: true,
    maxAge: "1y",
    immutable: true,
    serveDotFiles: true,
    lastModified: true,
  });
}

await app.register(fastifyStatic, {
  root: path.join(__dirname, "public"),
  prefix: "/",
  wildcard: false,
  cacheControl: true,
  dotfiles: "allow",
  etag: true,
  maxAge: "1h",
  serveDotFiles: true,
  lastModified: true,
});

// handle SSR requests
app.all("*", async (request, reply) => {
  try {
    let build = vite
      ? () => unstable_loadViteServerBuild(vite)
      : await import("./build/index.js");
    let criticalCss;

    if (vite) {
      let [{ getStylesForUrl }, { readConfig }] = await Promise.all([
        import("@remix-run/dev/dist/vite/styles.js"),
        import("@remix-run/dev/dist/config.js"),
      ]);

      let remixConfig = await readConfig();
      let resolvedBuild = vite ? await build() : build;
      criticalCss = await getStylesForUrl(
        vite,
        remixConfig,
        {},
        resolvedBuild,
        request.url,
      );
    }

    let handler = createRequestHandler({ build, criticalCss });
    return handler(request, reply);
  } catch (error) {
    console.error(error);
    return reply.status(500).send(error.message);
  }
});

let port = process.env.PORT ? Number(process.env.PORT) || 3000 : 3000;

let address = await app.listen({ port, host: "0.0.0.0" });
console.log(`✅ app ready: ${address}`);

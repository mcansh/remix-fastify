import path from "node:path";
import url from "node:url";

import { fastifyStatic } from "@fastify/static";
import { createRequestHandler } from "@mcansh/remix-fastify";
import { installGlobals } from "@remix-run/node";
import { fastify } from "fastify";

installGlobals();

let vite =
  process.env.NODE_ENV === "production"
    ? undefined
    : await import("vite").then((m) =>
        m.createServer({ server: { middlewareMode: true } }),
      );

let app = fastify();

let noopContentParser = (_request, payload, done) => {
  done(null, payload);
};

app.addContentTypeParser("application/json", noopContentParser);
app.addContentTypeParser("*", noopContentParser);

let __dirname = url.fileURLToPath(new URL(".", import.meta.url));

// handle asset requests
if (vite) {
  let middie = await import("@fastify/middie").then((m) => m.default);
  await app.register(middie);
  await app.use(vite.middlewares);
} else {
  await app.register(fastifyStatic, {
    root: path.join(__dirname, "build", "client", "assets"),
    prefix: "/assets",
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
  root: path.join(__dirname, "build", "client"),
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
    let handler = createRequestHandler({
      build: vite
        ? () => vite?.ssrLoadModule("virtual:remix/server-build")
        : await import("./build/server/index.js"),
    });
    return handler(request, reply);
  } catch (error) {
    console.error(error);
    return reply.status(500).send(error);
  }
});

let port = Number(process.env.PORT) || 3000;

let address = await app.listen({ port, host: "0.0.0.0" });
console.log(`✅ app ready: ${address}`);

import { fastifyStatic } from "@fastify/static";
import { createRequestHandler } from "@mcansh/remix-fastify";
import { installGlobals, type ServerBuild } from "@remix-run/node";
import { fastify } from "fastify";
import * as path from "node:path";
import * as process from "node:process";

installGlobals();

function resolve(...files: string[]) {
  return path.resolve(process.cwd(), ...files);
}

async function runServer() {
  const viteApp =
    process.env.NODE_ENV === "production"
      ? undefined
      : await import("vite").then((module) =>
          module.createServer({
            server: { middlewareMode: true },
            appType: "custom",
          }),
        );

  const app = fastify();

  if (viteApp) {
    let middie = await import("@fastify/middie").then((m) => m.default);
    await app.register(middie);
    await app.use(viteApp.middlewares);
  } else {
    await app.register(fastifyStatic, {
      root: resolve("build", "client", "assets"),
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

    await app.register(fastifyStatic, {
      root: resolve("build", "client"),
      prefix: "/",
      wildcard: false,
      cacheControl: true,
      dotfiles: "allow",
      etag: true,
      maxAge: "1h",
      serveDotFiles: true,
      lastModified: true,
    });
  }

  app.register(async function (childServer) {
    childServer.removeAllContentTypeParsers();
    // allow all content types
    childServer.addContentTypeParser("*", (_request, payload, done) => {
      done(null, payload);
    });

    // handle SSR requests
    childServer.all("*", async (request, reply) => {
      try {
        let handler = createRequestHandler({
          build: viteApp
            ? () =>
                viteApp.ssrLoadModule(
                  "virtual:remix/server-build",
                ) as Promise<ServerBuild>
            : () =>
                import(
                  resolve("./build/server/index.js")
                ) as Promise<ServerBuild>,
        });
        return handler(request, reply);
      } catch (error) {
        console.error(error);
        return reply.status(500).send(error);
      }
    });
  });

  const port = Number(process.env.PORT) || 3000;
  const host = process.env.HOST === "true" ? "0.0.0.0" : "127.0.0.1";

  app.listen({ port, host }).then((address) => {
    console.log(`Server listening on ${address}`);
  });
}

runServer();

import path from "node:path";
import fp from "fastify-plugin";
import type { ViteDevServer } from "vite";
import fastifyStatic from "@fastify/static";

import { createRequestHandler } from "./server";

export type RemixFastifyOptions = {
  /**
   * The base path for the Remix app.
   * match the `basename` in your Vite config.
   * @default "/"
   */
  basename?: string;
  /**
   * The directory where the Remix app is built.
   * This should match the `buildDirectory` directory in your Remix config.
   * @default "build"
   */
  buildDirectory?: string;
};

export let remixFastify = fp<RemixFastifyOptions>(
  async (fastify, { basename = "/", buildDirectory = "build" }, done) => {
    let cwd = process.env.REMIX_ROOT ?? process.cwd();

    let vite: ViteDevServer | undefined;

    if (process.env.NODE_ENV !== "production") {
      vite = await import("vite").then((mod) => {
        return mod.createServer({ server: { middlewareMode: true } });
      });
    }

    let resolvedBuildDirectory = path.resolve(cwd, buildDirectory);

    let serverBuildPath = path.join(
      resolvedBuildDirectory,
      "server",
      "index.js",
    );

    // handle asset requests
    if (vite) {
      let middie = await import("@fastify/middie").then((mod) => mod.default);
      await fastify.register(middie);
      fastify.use(vite.middlewares);
    } else {
      await Promise.all([
        fastify.register(fastifyStatic, {
          root: path.join(resolvedBuildDirectory, "client", "assets"),
          prefix: "/assets",
          wildcard: true,
          cacheControl: true,
          dotfiles: "allow",
          etag: true,
          maxAge: "1y",
          immutable: true,
          serveDotFiles: true,
          lastModified: true,
        }),

        fastify.register(fastifyStatic, {
          root: path.join(resolvedBuildDirectory, "client"),
          prefix: "/",
          wildcard: false,
          cacheControl: true,
          dotfiles: "allow",
          etag: true,
          maxAge: "1h",
          serveDotFiles: true,
          lastModified: true,
          decorateReply: false,
        }),
      ]);
    }

    fastify.register(async function (childServer) {
      childServer.removeAllContentTypeParsers();
      // allow all content types
      childServer.addContentTypeParser("*", (_request, payload, done) => {
        done(null, payload);
      });

      // normalize the base path to include a leading slash and no trailing slash
      let basepath = basename.replace(/\/$/, "");
      console.log({ basepath });

      // handle SSR requests
      childServer.all(`${basepath}/*`, async (request, reply) => {
        try {
          let handler = createRequestHandler({
            build: vite
              ? () => {
                  if (!vite) throw new Error("we lost vite!");
                  return vite.ssrLoadModule("virtual:remix/server-build");
                }
              : () => import(serverBuildPath),
          });

          return handler(request, reply);
        } catch (error) {
          console.error(error);
          return reply.status(500).send(error);
        }
      });

      done();
    });
  },
  {
    name: "remix-fastify",
    fastify: "4.x",
  },
);

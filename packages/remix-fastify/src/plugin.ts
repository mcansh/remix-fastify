import path from "node:path";
import fp from "fastify-plugin";
import type { ViteDevServer } from "vite";
import fastifyStatic from "@fastify/static";

import { createRequestHandler } from "./server";
import type { HttpServer, GetLoadContextFunction } from "./server";

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
  /**
   * A function that returns the value to use as `context` in route `loader` and
   * `action` functions.
   *
   * You can think of this as an escape hatch that allows you to pass
   * environment/platform-specific values through to your loader/action.
   */
  getLoadContext?: GetLoadContextFunction<HttpServer>;
  mode?: string;
};

export let remixFastify = fp<RemixFastifyOptions>(
  async (
    fastify,
    {
      basename = "/",
      buildDirectory = "build",
      getLoadContext,
      mode = process.env.NODE_ENV,
    },
  ) => {
    let cwd = process.env.REMIX_ROOT ?? process.cwd();

    let vite: ViteDevServer | undefined;

    if (mode !== "production") {
      vite = await import("vite").then((mod) => {
        return mod.createServer({ server: { middlewareMode: true } });
      });
    }

    let resolvedBuildDirectory = path.resolve(cwd, buildDirectory);

    let SERVER_BUILD = path.join(resolvedBuildDirectory, "server", "index.js");

    // handle asset requests
    if (vite) {
      let middie = await import("@fastify/middie").then((mod) => mod.default);
      await fastify.register(middie);
      fastify.use(vite.middlewares);
    } else {
      let ASSET_DIR = path.join(resolvedBuildDirectory, "client");
      await fastify.register(fastifyStatic, {
        root: ASSET_DIR,
        prefix: "/",
        wildcard: false,
        cacheControl: true,
        dotfiles: "allow",
        etag: true,
        serveDotFiles: true,
        lastModified: true,
        setHeaders(res, filepath) {
          let file = path.relative(ASSET_DIR, filepath);
          let isAsset = file.startsWith("assets/");
          res.setHeader(
            "cache-control",
            isAsset
              ? "public, max-age=31536000, immutable"
              : "public, max-age=3600",
          );
        },
      });
    }

    fastify.register(async function createRemixRequestHandler(childServer) {
      // remove the default content type parsers
      childServer.removeAllContentTypeParsers();
      // allow all content types
      childServer.addContentTypeParser("*", (_request, payload, done) => {
        done(null, payload);
      });

      let basepath = basename.replace(/\/+$/, "") + "/*";

      // handle SSR requests
      childServer.all(basepath, async (request, reply) => {
        try {
          let handler = createRequestHandler({
            mode,
            getLoadContext,
            build: vite
              ? () => {
                  if (!vite) throw new Error("we lost vite!");
                  return vite.ssrLoadModule("virtual:remix/server-build");
                }
              : () => import(SERVER_BUILD),
          });

          return handler(request, reply);
        } catch (error) {
          console.error(error);
          return reply.status(500).send(error);
        }
      });
    });
  },
  {
    // replaced with the package name during build
    name: process.env.__PACKAGE_NAME__,
    fastify: "4.x",
  },
);

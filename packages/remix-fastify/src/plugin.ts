import path from "node:path";
import url from "node:url";
import fp from "fastify-plugin";
import type { InlineConfig, ViteDevServer } from "vite";
import fastifyStatic from "@fastify/static";
import { cacheHeader } from "pretty-cache-header";

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
  /**
   * Options to pass to the Vite server in development.
   */
  viteOptions?: InlineConfig;
  /**
   * The cache control options to use for build assets in production.
   * uses `pretty-cache-header` under the hood.
   * @link https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control
   * @default { public: true, maxAge: '1 year', immutable: true }
   */
  assetCacheControl?: Parameters<typeof cacheHeader>[0];
  /**
   * The cache control options to use for other assets in production.
   * uses `pretty-cache-header` under the hood.
   * @link https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control
   * @default { public: true, maxAge: '1 hour' }
   */
  defaultCacheControl?: Parameters<typeof cacheHeader>[0];
};

export let remixFastify = fp<RemixFastifyOptions>(
  async (
    fastify,
    {
      basename = "/",
      buildDirectory = "build",
      getLoadContext,
      mode = process.env.NODE_ENV,
      viteOptions,
      assetCacheControl = { public: true, maxAge: "1 year", immutable: true },
      defaultCacheControl = { public: true, maxAge: "1 hour" },
    },
  ) => {
    let cwd = process.env.REMIX_ROOT ?? process.cwd();

    let vite: ViteDevServer | undefined;

    if (mode !== "production") {
      vite = await import("vite").then((mod) => {
        return mod.createServer({
          ...viteOptions,
          server: {
            ...viteOptions?.server,
            middlewareMode: true,
          },
        });
      });
    }

    let resolvedBuildDirectory = path.resolve(cwd, buildDirectory);

    let SERVER_BUILD = path.join(resolvedBuildDirectory, "server", "index.js");
    let SERVER_BUILD_URL = url.pathToFileURL(SERVER_BUILD).href;

    // handle asset requests
    if (vite) {
      let middie = await import("@fastify/middie").then((mod) => mod.default);
      await fastify.register(middie);
      fastify.use(vite.middlewares);
    } else {
      let BUILD_DIR = path.join(resolvedBuildDirectory, "client");
      let ASSET_DIR = path.join(BUILD_DIR, "assets");
      await fastify.register(fastifyStatic, {
        root: BUILD_DIR,
        prefix: "/",
        wildcard: false,
        cacheControl: true,
        dotfiles: "allow",
        etag: true,
        serveDotFiles: true,
        lastModified: true,
        setHeaders(res, filepath) {
          let isAsset = filepath.startsWith(ASSET_DIR);
          res.setHeader(
            "cache-control",
            isAsset
              ? cacheHeader(assetCacheControl)
              : cacheHeader(defaultCacheControl),
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
              : () => import(SERVER_BUILD_URL),
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

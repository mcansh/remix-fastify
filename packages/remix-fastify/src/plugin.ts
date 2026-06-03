import path from "node:path";
import url from "node:url";

import type { FastifyStaticOptions } from "@fastify/static";
import fastifyStatic from "@fastify/static";
import fp from "fastify-plugin";
import type { FastifyPluginAsync, RouteShorthandOptions } from "fastify";
import { cacheHeader } from "pretty-cache-header";
import type { ServerBuild } from "react-router";
import type { ViteDevServer } from "vite";

import { createReactRouterRequestHandler } from "./server";
import type { GetLoadContextFunction, HttpServer } from "./server";

const VIRTUAL_SERVER_BUILD_ID = "virtual:react-router/server-build";

export type ReactRouterFastifyOptions<
  Server extends HttpServer = HttpServer,
  ServerBuildType = ServerBuild,
> = {
  /**
   * The base path for the React Router app.
   * match the `basename` in your React Router config.
   * @default "/"
   */
  basename?: string;
  /**
   * The directory where the React Router app is built.
   * This should match the `buildDirectory` directory in your React Router config.
   * @default "build"
   */
  buildDirectory?: string;
  /**
   * The React Router server output filename
   * This should match the `serverBuildFile` filename in your React Router config.
   * @default "index.js"
   */
  serverBuildFile?: string;
  /**
   * A function that returns the value to use as `context` in route `loader` and
   * `action` functions.
   *
   * You can think of this as an escape hatch that allows you to pass
   * environment/platform-specific values through to your loader/action.
   */
  getLoadContext?: GetLoadContextFunction<Server>;
  mode?: string;
  /**
   * The Vite dev server, passed by the `fastifyDevServer` Vite plugin in
   * development. When present, SSR is handled through Vite (so route changes
   * hot-reload) and client assets/HMR are served by Vite ahead of Fastify, so
   * the plugin skips static asset serving. Leave unset in production.
   */
  viteDevServer?: ViteDevServer;
  /**
   * Options to pass to the `@fastify/static` plugin for serving compiled assets in production.
   */
  fastifyStaticOptions?: FastifyStaticOptions;
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
  /**
   * The React Router server build to use in production. Use this only if the default approach doesn't work for you.
   *
   * If not provided, it will be loaded using `import()` with the server build path provided in the options.
   */
  productionServerBuild?:
    | ServerBuildType
    | (() => ServerBuildType | Promise<ServerBuildType>);

  childServerOptions?: RouteShorthandOptions<Server>;
};

/**
 * A Fastify plugin that serves a React Router (framework mode) app: SSR, data
 * requests, and — in production — the compiled client assets.
 *
 * It is a plugin factory: call it with your options and register the result.
 * This lets `getLoadContext` be typed for your server (defaulting to
 * `http.Server`); pass a type argument to target another, e.g.
 * `reactRouterFastify<Http2Server>({ ... })`.
 *
 * ```ts
 * await app.register(reactRouterFastify({ getLoadContext }));
 * ```
 */
export function reactRouterFastify<Server extends HttpServer = HttpServer>(
  options: ReactRouterFastifyOptions<Server> = {},
): FastifyPluginAsync {
  // The generic only shapes `getLoadContext`/`childServerOptions` for the
  // caller. Internally we work against the default server type.
  let {
    basename = "/",
    buildDirectory = "build",
    serverBuildFile = "index.js",
    getLoadContext,
    mode,
    viteDevServer,
    fastifyStaticOptions,
    assetCacheControl = { public: true, maxAge: "1 year", immutable: true },
    defaultCacheControl = { public: true, maxAge: "1 hour" },
    productionServerBuild,
    childServerOptions,
  } = options as ReactRouterFastifyOptions;

  return fp(
    async function reactRouterFastifyPlugin(fastify) {
      let cwd = process.env.REMIX_ROOT ?? process.cwd();
      let resolvedBuildDirectory = path.resolve(cwd, buildDirectory);

      let resolvedMode =
        mode ?? (viteDevServer ? "development" : process.env.NODE_ENV);

      // In development the `fastifyDevServer` Vite plugin owns the dev server
      // and serves client assets + HMR. We only handle SSR here, and load the
      // server build through Vite so route changes are hot-reloaded.
      let build: ServerBuild | (() => Promise<ServerBuild>);
      if (viteDevServer) {
        build = () =>
          viteDevServer.ssrLoadModule(
            VIRTUAL_SERVER_BUILD_ID,
          ) as Promise<ServerBuild>;
      } else if (productionServerBuild) {
        build = productionServerBuild as
          | ServerBuild
          | (() => Promise<ServerBuild>);
      } else {
        let serverBuildPath = path.join(
          resolvedBuildDirectory,
          "server",
          serverBuildFile,
        );
        let serverBuildUrl = url.pathToFileURL(serverBuildPath).href;
        try {
          build = await import(serverBuildUrl);
        } catch (error) {
          throw new Error(
            `[@mcansh/remix-fastify] could not import the server build from "${serverBuildPath}". ` +
              "Did you run `react-router build`? If your output path differs, set the " +
              "`buildDirectory` and `serverBuildFile` options to match your React Router config.",
            { cause: error },
          );
        }
      }

      let handler = createReactRouterRequestHandler({
        mode: resolvedMode,
        getLoadContext,
        build,
      });

      // In production Fastify serves the compiled client assets. In development
      // Vite already serves them ahead of our request handler, so there is
      // nothing to register here.
      if (!viteDevServer) {
        let clientDirectory = path.join(resolvedBuildDirectory, "client");
        let assetDirectory = path.join(clientDirectory, "assets");
        await fastify.register(fastifyStatic, {
          root: clientDirectory,
          prefix: basename,
          wildcard: false,
          cacheControl: false, // required because we are setting custom cache-control headers in setHeaders
          dotfiles: "allow",
          etag: true,
          serveDotFiles: true,
          lastModified: true,
          setHeaders(res, filepath) {
            let isAsset = filepath.startsWith(assetDirectory);
            res.setHeader(
              "cache-control",
              isAsset
                ? cacheHeader(assetCacheControl)
                : cacheHeader(defaultCacheControl),
            );
          },
          ...fastifyStaticOptions,
        });
      }

      await fastify.register(
        async function reactRouterCatchAll(childServer) {
          // remove the default content type parsers
          childServer.removeAllContentTypeParsers();
          // allow all content types so React Router reads the raw body stream
          childServer.addContentTypeParser("*", (_request, payload, done) => {
            done(null, payload);
          });

          if (childServerOptions) {
            childServer.all("*", childServerOptions, handler);
          } else {
            childServer.all("*", handler);
          }
        },
        { prefix: basename },
      );
    },
    {
      // replaced with the package name during build
      name: process.env.__PACKAGE_NAME__,
      fastify: process.env.__FASTIFY_VERSION__,
    },
  );
}

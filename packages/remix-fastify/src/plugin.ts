import path from "node:path";
import url from "node:url";

import type { FastifyStaticOptions } from "@fastify/static";
import fastifyStatic from "@fastify/static";
import type { FastifyInstance, RouteShorthandOptions } from "fastify";
import fp from "fastify-plugin";
import { cacheHeader } from "pretty-cache-header";
import type { ServerBuild } from "react-router";
import type { ViteDevServer } from "vite";

import { loadSsrModule } from "./dev-ssr.ts";
import type { GetLoadContextFunction, HttpServer } from "./server";
import { createRequestHandler } from "./server.ts";

const SERVER_BUILD_MODULE = "virtual:react-router/server-build";

/**
 * Options for registering the React Router Fastify plugin.
 */
export type ReactRouterFastifyOptions<Server extends HttpServer = HttpServer> = {
  /**
   * Vite dev server used in development mode.
   *
   * When set, the server build is loaded through Vite and client asset serving
   * is left to Vite middleware. `fastifyDevServer` supplies this automatically.
   */
  vite?: ViteDevServer;
  /**
   * The base path for the app. Should match the `basename` in your Vite config.
   * (defaults to `/`).
   */
  basename?: string;
  /**
   * The directory where the app is built. Should match the `buildDirectory` in
   * your React Router config. (defaults to `build`).
   */
  buildDirectory?: string;
  /**
   * The server build output filename. Should match the `serverBuildFile` in your
   * React Router config. (defaults to `index.js`).
   */
  serverBuildFile?: string;
  /**
   * Runtime mode passed to React Router's request handler. (defaults to
   * `process.env.NODE_ENV`).
   */
  mode?: string;
  /**
   * A function that returns the value to use as `context` in route `loader` and
   * `action` functions. When middleware is enabled, return a
   * `RouterContextProvider` instance.
   */
  getLoadContext?: GetLoadContextFunction<Server>;
  /**
   * The cache control options to use for fingerprinted build assets in
   * production. Uses `pretty-cache-header` under the hood. (defaults to
   * `{ public: true, maxAge: "1 year", immutable: true }`).
   */
  assetCacheControl?: Parameters<typeof cacheHeader>[0];
  /**
   * The cache control options to use for other static files in production.
   * Uses `pretty-cache-header` under the hood. (defaults to
   * `{ public: true, maxAge: "1 hour" }`).
   */
  defaultCacheControl?: Parameters<typeof cacheHeader>[0];
  /**
   * Options to pass to the `@fastify/static` plugin for serving compiled assets
   * in production.
   */
  fastifyStaticOptions?: FastifyStaticOptions;
  /**
   * The server build to use in production. Use this only if the default
   * `import()` of the built server file doesn't work for you.
   */
  productionServerBuild?: ServerBuild | (() => ServerBuild | Promise<ServerBuild>);
  /**
   * Route options applied to the React Router catch-all route.
   */
  childServerOptions?: RouteShorthandOptions<Server>;
};

async function plugin(fastify: FastifyInstance, options: ReactRouterFastifyOptions): Promise<void> {
  let {
    vite,
    basename = "/",
    buildDirectory = "build",
    serverBuildFile = "index.js",
    mode = process.env.NODE_ENV,
    getLoadContext,
    assetCacheControl = { public: true, maxAge: "1 year", immutable: true },
    defaultCacheControl = { public: true, maxAge: "1 hour" },
    fastifyStaticOptions,
    productionServerBuild,
    childServerOptions,
  } = options;

  let cwd = process.env.REACT_ROUTER_ROOT ?? process.cwd();
  let resolvedBuildDirectory = path.resolve(cwd, buildDirectory);

  let build: ServerBuild | (() => ServerBuild | Promise<ServerBuild>);
  if (vite) {
    build = () => loadSsrModule(vite, SERVER_BUILD_MODULE) as unknown as Promise<ServerBuild>;
  } else if (productionServerBuild) {
    build = productionServerBuild;
  } else {
    let serverBuildPath = path.join(resolvedBuildDirectory, "server", serverBuildFile);
    build = (await import(url.pathToFileURL(serverBuildPath).href)) as ServerBuild;
  }

  let handler = createRequestHandler<HttpServer>({
    build,
    getLoadContext,
    mode,
  });

  // In development Vite's middleware serves client assets, so static serving is
  // only needed in production.
  if (!vite) {
    let clientDirectory = path.join(resolvedBuildDirectory, "client");
    let assetsDirectory = path.join(clientDirectory, "assets");
    await fastify.register(fastifyStatic, {
      root: clientDirectory,
      prefix: basename,
      wildcard: false,
      // required because we set custom cache-control headers in `setHeaders`
      cacheControl: false,
      // Don't serve hidden files (e.g. `.vite/`) from the client build. Override
      // via `fastifyStaticOptions` if you intentionally serve dotfiles.
      dotfiles: "ignore",
      etag: true,
      serveDotFiles: false,
      lastModified: true,
      setHeaders(res, filepath) {
        let isAsset = filepath.startsWith(assetsDirectory);
        res.setHeader(
          "cache-control",
          cacheHeader(isAsset ? assetCacheControl : defaultCacheControl),
        );
      },
      ...fastifyStaticOptions,
    });
  }

  await fastify.register(
    async (childServer) => {
      // remove the default content type parsers and allow all content types so
      // React Router receives the raw request body
      childServer.removeAllContentTypeParsers();
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
}

/**
 * Fastify plugin that serves a React Router app in development or production.
 */
export const reactRouterFastify = fp<ReactRouterFastifyOptions>(plugin, {
  // replaced with the package name during build
  name: process.env.__PACKAGE_NAME__,
  fastify: process.env.__FASTIFY_VERSION__,
});

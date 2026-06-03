import path from "node:path";
import url from "node:url";

import type { FastifyStaticOptions } from "@fastify/static";
import fastifyStatic from "@fastify/static";
import type {
  FastifyBaseLogger,
  FastifyInstance,
  FastifyTypeProviderDefault,
  RawServerDefault,
  RouteShorthandOptions,
} from "fastify";
import { cacheHeader } from "pretty-cache-header";
import type { ServerBuild } from "react-router";

import type { IncomingMessage, ServerResponse } from "node:http";
import { createReactRouterRequestHandler } from "../servers/react-router";
import type { GetLoadContextFunction, HttpServer } from "../shared";
import { getDevServer } from "../shared";

const VIRTUAL_SERVER_BUILD_ID = "virtual:react-router/server-build";

export type PluginOptions<
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

export function createPlugin<T extends  FastifyInstance<RawServerDefault, IncomingMessage, ServerResponse<IncomingMessage>, FastifyBaseLogger, FastifyTypeProviderDefault>>(
  fastify: T,
  {
    basename = "/",
    buildDirectory = "build",
    serverBuildFile = "index.js",
    getLoadContext,
    mode,
    fastifyStaticOptions,
    assetCacheControl = { public: true, maxAge: "1 year", immutable: true },
    defaultCacheControl = { public: true, maxAge: "1 hour" },
    productionServerBuild,
    childServerOptions,
  }: PluginOptions<HttpServer, ServerBuild>,
) {
  return async () => {
    let cwd = process.env.REMIX_ROOT ?? process.cwd();

    // In development the `fastifyDevServer` Vite plugin owns the dev server and
    // serves client assets + HMR. We only handle SSR here, and load the server
    // build through Vite so route changes are hot-reloaded.
    let vite = getDevServer();
    let resolvedMode = mode ?? (vite ? "development" : process.env.NODE_ENV);

    let build: ServerBuild | (() => Promise<ServerBuild>);
    if (vite) {
      build = () =>
        vite.ssrLoadModule(VIRTUAL_SERVER_BUILD_ID) as Promise<ServerBuild>;
    } else if (productionServerBuild) {
      build = productionServerBuild as
        | ServerBuild
        | (() => Promise<ServerBuild>);
    } else {
      let resolvedBuildDirectory = path.resolve(cwd, buildDirectory);
      let SERVER_BUILD = path.join(
        resolvedBuildDirectory,
        "server",
        serverBuildFile,
      );
      let SERVER_BUILD_URL = url.pathToFileURL(SERVER_BUILD).href;
      build = await import(SERVER_BUILD_URL);
    }

    let handler = createReactRouterRequestHandler<HttpServer>({
      mode: resolvedMode,
      getLoadContext,
      build,
    });

    // In production Fastify serves the compiled client assets. In development
    // Vite already serves them ahead of our request handler, so there is
    // nothing to register here.
    if (!vite) {
      let resolvedBuildDirectory = path.resolve(cwd, buildDirectory);
      let BUILD_DIR = path.join(resolvedBuildDirectory, "client");
      let ASSET_DIR = path.join(BUILD_DIR, "assets");
      await fastify.register(fastifyStatic, {
        root: BUILD_DIR,
        prefix: basename,
        wildcard: false,
        cacheControl: false, // required because we are setting custom cache-control headers in setHeaders
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
        ...fastifyStaticOptions,
      });
    }

    fastify.register(
      async function createReactRouterRequestHandler(childServer) {
        // remove the default content type parsers
        childServer.removeAllContentTypeParsers();
        // allow all content types
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
  };
}

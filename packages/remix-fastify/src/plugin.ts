import path from "node:path"

import type { FastifyStaticOptions } from "@fastify/static"
import fastifyStatic from "@fastify/static"
import type { FastifyPluginAsync, RouteShorthandOptions } from "fastify"
import fp from "fastify-plugin"
import { cacheHeader } from "pretty-cache-header"
import type { ServerBuild } from "react-router"
import type { ViteDevServer } from "vite"

import type { GetLoadContextFunction, HttpServer } from "./server.js"
import { createReactRouterRequestHandler } from "./server.js"

export type ReactRouterFastifyOptions<Server extends HttpServer = HttpServer> =
  {
    /**
     * The React Router server build, or a function that resolves it.
     *
     * You load the build, not the plugin — that way you can shape the
     * {@link ServerBuild} before handing it over (e.g. set `allowedActionOrigins`).
     *
     * In development, return the build through the Vite dev server so route
     * changes hot-reload:
     *
     * ```ts
     * build: () => viteDevServer.ssrLoadModule("virtual:react-router/server-build")
     * ```
     *
     * In production, import the compiled server build:
     *
     * ```ts
     * build: await import("./build/server/index.js")
     * ```
     */
    build: ServerBuild | (() => ServerBuild | Promise<ServerBuild>)
    /**
     * The base path for the React Router app.
     * match the `basename` in your React Router config.
     * @default "/"
     */
    basename?: string
    /**
     * The directory where the React Router app is built.
     * This should match the `buildDirectory` directory in your React Router config.
     * Used to locate the compiled client assets (`<buildDirectory>/client`) served
     * in production.
     * @default "build"
     */
    buildDirectory?: string
    /**
     * A function that returns the value to use as `context` in route `loader` and
     * `action` functions.
     *
     * You can think of this as an escape hatch that allows you to pass
     * environment/platform-specific values through to your loader/action.
     */
    getLoadContext?: GetLoadContextFunction<Server>
    mode?: string
    /**
     * The Vite dev server, passed by the `fastifyDevServer` Vite plugin in
     * development. When present, client assets/HMR are served by Vite ahead of
     * Fastify, so the plugin skips static asset serving, and `mode` defaults to
     * `"development"`. Leave unset in production.
     */
    viteDevServer?: ViteDevServer
    /**
     * Options to pass to the `@fastify/static` plugin for serving compiled assets in production.
     */
    fastifyStaticOptions?: FastifyStaticOptions
    /**
     * The cache control options to use for build assets in production.
     * uses `pretty-cache-header` under the hood.
     * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control
     * @default { public: true, maxAge: '1 year', immutable: true }
     */
    assetCacheControl?: Parameters<typeof cacheHeader>[0]
    /**
     * The cache control options to use for other assets in production.
     * uses `pretty-cache-header` under the hood.
     * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control
     * @default { public: true, maxAge: '1 hour' }
     */
    defaultCacheControl?: Parameters<typeof cacheHeader>[0]

    childServerOptions?: RouteShorthandOptions<Server>
  }

/**
 * A Fastify plugin that serves a React Router (framework mode) app: SSR, data
 * requests, and — in production — the compiled client assets.
 *
 * It is a plugin factory: call it with your options and register the result.
 * This lets `getLoadContext` be typed for your server (defaulting to
 * `http.Server`); pass a type argument to target another, e.g.
 * `reactRouterFastify<Http2Server>({ ... })`.
 *
 * You load the server build and pass it as `build`; the plugin never imports it
 * itself. See {@link ReactRouterFastifyOptions.build}.
 *
 * ```ts
 * await app.register(reactRouterFastify({ build, getLoadContext }));
 * ```
 *
 * @param options - Plugin options. See {@link ReactRouterFastifyOptions}.
 * @returns A Fastify plugin to register on your app.
 */
export function reactRouterFastify<Server extends HttpServer = HttpServer>(
  options: ReactRouterFastifyOptions<Server>,
): FastifyPluginAsync {
  // The generic only shapes `getLoadContext`/`childServerOptions` for the
  // caller. Internally we work against the default server type.
  let {
    build,
    basename = "/",
    buildDirectory = "build",
    getLoadContext,
    mode,
    viteDevServer,
    fastifyStaticOptions,
    assetCacheControl = { public: true, maxAge: "1 year", immutable: true },
    defaultCacheControl = { public: true, maxAge: "1 hour" },
    childServerOptions,
  } = options as ReactRouterFastifyOptions

  return fp(
    async function reactRouterFastifyPlugin(fastify) {
      let resolvedMode =
        mode ?? (viteDevServer ? "development" : process.env.NODE_ENV)

      let handler = createReactRouterRequestHandler({
        mode: resolvedMode,
        getLoadContext,
        build,
      })

      // In production Fastify serves the compiled client assets. In development
      // Vite already serves them ahead of our request handler, so there is
      // nothing to register here.
      if (!viteDevServer) {
        let cwd = process.env.REMIX_ROOT ?? process.cwd()
        let resolvedBuildDirectory = path.resolve(cwd, buildDirectory)
        let clientDirectory = path.join(resolvedBuildDirectory, "client")
        let assetDirectory = path.join(clientDirectory, "assets")
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
            let isAsset = filepath.startsWith(assetDirectory)
            res.setHeader(
              "cache-control",
              isAsset
                ? cacheHeader(assetCacheControl)
                : cacheHeader(defaultCacheControl),
            )
          },
          ...fastifyStaticOptions,
        })
      }

      await fastify.register(
        async function reactRouterCatchAll(childServer) {
          // remove the default content type parsers
          childServer.removeAllContentTypeParsers()
          // allow all content types so React Router reads the raw body stream
          childServer.addContentTypeParser("*", (_request, payload, done) => {
            done(null, payload)
          })

          if (childServerOptions) {
            childServer.all("*", childServerOptions, handler)
          } else {
            childServer.all("*", handler)
          }
        },
        { prefix: basename },
      )
    },
    {
      // replaced with the package name during build
      name: process.env.__PACKAGE_NAME__,
      fastify: process.env.__FASTIFY_VERSION__,
    },
  )
}

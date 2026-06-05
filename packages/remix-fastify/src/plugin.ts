import path from "node:path";

import type { FastifyStaticOptions } from "@fastify/static";
import fastifyStatic from "@fastify/static";
import type { CacheControlInit } from "@remix-run/headers";
import { CacheControl } from "@remix-run/headers";
import type { FastifyPluginAsync, RouteShorthandOptions } from "fastify";
import fp from "fastify-plugin";
import type { ServerBuild } from "react-router";
import type { GetLoadContextFunction, HttpServer } from "./server.js";
import { createReactRouterRequestHandler } from "./server.js";

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
     * Options to pass to the `@fastify/static` plugin for serving compiled assets in production.
     */
    fastifyStaticOptions?: FastifyStaticOptions
    /**
     * The cache control options to use for build assets in production.
     * uses `@remix-run/headers` under the hood.
     * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control
     * @default { public: true, maxAge: '1 year', immutable: true }
     */
    assetCacheControl?: CacheControlInit
    /**
     * The cache control options to use for other assets in production.
     * uses `@remix-run/headers` under the hood.
     * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control
     * @default { public: true, maxAge: '1 hour' }
     */
    defaultCacheControl?: CacheControlInit
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
  let {
    build,
    basename = "/",
    buildDirectory = "build",
    getLoadContext,
    mode,
    fastifyStaticOptions,
    assetCacheControl = { public: true, maxAge: 31_536_000, immutable: true },
    defaultCacheControl = { public: true, maxAge: 3_600 },
    childServerOptions = {},
  } = options as ReactRouterFastifyOptions

  return fp(
    async function reactRouterFastifyPlugin(fastify) {
      // In production Fastify serves the compiled client assets. In development
      // Vite already serves them ahead of our request handler, so there is
      // nothing to register here.
      if (process.env.NODE_ENV === "production") {
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
            let cacheControl = new CacheControl(
              isAsset ? assetCacheControl : defaultCacheControl,
            )
            res.setHeader("cache-control", cacheControl.toString())
          },
          ...fastifyStaticOptions,
        })
      } else {
        let viteDevServer = await import("vite").then(vite => {
          return vite.createServer({
              server: {middlewareMode: true}
          })
        })

        let middie = await import("@fastify/middie")

        await fastify.register(middie.default)
        fastify.use(viteDevServer.middlewares)

        await fastify.register(async (request, reply, done) => {
          try {
            const source = await viteDevServer.ssrLoadModule("./server.ts")
            return await source.app(request, reply)
          } catch (error) {
            if (typeof error === 'object' && error instanceof Error) {
              viteDevServer.ssrFixStacktrace(error);
              done(error)
            }

            return reply.send(error)
          }
        })
      }

      let handler = createReactRouterRequestHandler({
        mode: mode ?? process.env.NODE_ENV,
        getLoadContext,
        build,
      })

      await fastify.register(
        async function reactRouterCatchAll(childServer) {
          // remove the default content type parsers
          childServer.removeAllContentTypeParsers()
          // allow all content types so React Router reads the raw body stream
          childServer.addContentTypeParser("*", (_request, payload, done) => {
            done(null, payload)
          })

          childServer.all("*", childServerOptions, handler)
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

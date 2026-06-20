import type { ServerResponse } from "node:http"
import path from "node:path"
import { pathToFileURL } from "node:url"

import fastifyStatic from "@fastify/static"
import type { FastifyStaticOptions } from "@fastify/static"
import type { FastifyInstance, RouteShorthandOptions } from "fastify"
import type { ServerBuild } from "react-router"
import type { ViteDevServer } from "vite"

import { createRequestHandler, type GetLoadContextFunction } from "./handler.ts"
import { importSsrModule } from "./vite-runtime.ts"

export interface FastifyReactRouterOptions {
  devServer?: ViteDevServer
  basePath?: string
  serverBuildPath?: string
  clientBuildDirectory?: string
  mode?: string
  getLoadContext?: GetLoadContextFunction
  build?: ServerBuild | (() => ServerBuild | Promise<ServerBuild>)
  staticOptions?: FastifyStaticOptions
  assetCacheControl?: string
  fileCacheControl?: string
  routeOptions?: RouteShorthandOptions
}

/**
 * Fastify plugin that serves React Router framework builds.
 *
 * @param fastify Fastify instance.
 * @param options Adapter options.
 */
export async function fastifyReactRouter(
  fastify: FastifyInstance,
  options: FastifyReactRouterOptions,
): Promise<void> {
  let {
    devServer,
    basePath = "/",
    serverBuildPath = "build/server/index.js",
    clientBuildDirectory = "build/client",
    mode = process.env.NODE_ENV,
    getLoadContext,
    build,
    staticOptions,
    assetCacheControl = "public, max-age=31536000, immutable",
    fileCacheControl = "public, max-age=3600",
    routeOptions,
  } = options

  let serverBuild =
    build ?? createBuildLoader(devServer, path.resolve(serverBuildPath))

  if (devServer == null) {
    await registerStaticFiles(fastify, {
      basePath,
      clientBuildDirectory: path.resolve(clientBuildDirectory),
      assetCacheControl,
      fileCacheControl,
      staticOptions,
    })
  }

  let handler = createRequestHandler({
    build: serverBuild,
    getLoadContext,
    mode,
  })

  fastify.removeAllContentTypeParsers()
  fastify.addContentTypeParser("*", (_request, payload, done) => {
    done(null, payload)
  })

  if (routeOptions) {
    fastify.all("*", routeOptions, handler)
  } else {
    fastify.all("*", handler)
  }
}

function createBuildLoader(
  devServer: ViteDevServer | undefined,
  serverBuildPath: string,
): ServerBuild | (() => ServerBuild | Promise<ServerBuild>) {
  if (devServer != null) {
    return () =>
      importSsrModule<ServerBuild>(
        devServer,
        "virtual:react-router/server-build",
      )
  }

  return async () =>
    import(
      /* @vite-ignore */ pathToFileURL(serverBuildPath).href
    ) as Promise<ServerBuild>
}

async function registerStaticFiles(
  fastify: FastifyInstance,
  options: {
    basePath: string
    clientBuildDirectory: string
    assetCacheControl: string
    fileCacheControl: string
    staticOptions?: FastifyStaticOptions
  },
): Promise<void> {
  let assetsDirectory = path.join(options.clientBuildDirectory, "assets")

  await fastify.register(fastifyStatic, {
    root: options.clientBuildDirectory,
    prefix: options.basePath,
    wildcard: false,
    cacheControl: false,
    dotfiles: "ignore",
    etag: true,
    lastModified: true,
    setHeaders(res, filePath) {
      let isAsset = filePath.startsWith(assetsDirectory)
      res.setHeader(
        "cache-control",
        isAsset ? options.assetCacheControl : options.fileCacheControl,
      )
    },
    ...options.staticOptions,
  })
}

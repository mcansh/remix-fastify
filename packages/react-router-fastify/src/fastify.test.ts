import fs from "node:fs"
import os from "node:os"
import path from "node:path"

import fastify from "fastify"
import type * as ReactRouter from "react-router"
import { createRequestHandler as createReactRouterHandler } from "react-router"
import type { ViteDevServer } from "vite"
import type { MockedFunction } from "vitest"
import { afterEach, describe, expect, it, vi } from "vitest"

import { fastifyReactRouter } from "./fastify.ts"

vi.mock("react-router", async () => {
  let actual = await vi.importActual<typeof ReactRouter>("react-router")
  return {
    ...actual,
    createRequestHandler: vi.fn(),
  }
})

const mockedReactRouterHandler = createReactRouterHandler as MockedFunction<
  typeof createReactRouterHandler
>

describe("fastifyReactRouter", () => {
  afterEach(() => {
    mockedReactRouterHandler.mockReset()
  })

  it("registers a catch-all route and leaves custom routes usable", async () => {
    mockedReactRouterHandler.mockImplementation(
      () => async (request) =>
        new Response(`route:${new URL(request.url).pathname}`),
    )

    let app = fastify()
    app.get("/health", async () => ({ ok: true }))
    await app.register(fastifyReactRouter, {
      build: {} as ReactRouter.ServerBuild,
    })

    let health = await app.inject("/health")
    let route = await app.inject("/dashboard")

    expect(JSON.parse(health.body)).toEqual({ ok: true })
    expect(route.body).toBe("route:/dashboard")
  })

  it("serves production static files with separate cache headers", async () => {
    mockedReactRouterHandler.mockImplementation(
      () => async () => new Response("route"),
    )

    let root = fs.mkdtempSync(path.join(os.tmpdir(), "rr-fastify-client-"))
    let clientBuildDirectory = path.join(root, "build/client")
    let assetsDirectory = path.join(clientBuildDirectory, "assets")
    fs.mkdirSync(assetsDirectory, { recursive: true })
    fs.writeFileSync(
      path.join(assetsDirectory, "app.js"),
      "console.log('app');",
    )
    fs.writeFileSync(path.join(clientBuildDirectory, "favicon.ico"), "icon")

    let app = fastify()

    try {
      await app.register(fastifyReactRouter, {
        build: {} as ReactRouter.ServerBuild,
        clientBuildDirectory,
        assetCacheControl: "public, max-age=999",
        fileCacheControl: "public, max-age=60",
      })

      let asset = await app.inject("/assets/app.js")
      let file = await app.inject("/favicon.ico")

      expect(asset.statusCode).toBe(200)
      expect(asset.body).toBe("console.log('app');")
      expect(asset.headers["cache-control"]).toBe("public, max-age=999")
      expect(file.statusCode).toBe(200)
      expect(file.body).toBe("icon")
      expect(file.headers["cache-control"]).toBe("public, max-age=60")
    } finally {
      await app.close()
      fs.rmSync(root, { recursive: true, force: true })
    }
  })

  it("uses the Vite server build in development when a production build is configured", async () => {
    mockedReactRouterHandler.mockImplementation(
      () => async () => new Response("route"),
    )

    let developmentBuild = {} as ReactRouter.ServerBuild
    let productionBuild = {} as ReactRouter.ServerBuild
    let vite = {
      ssrLoadModule: vi.fn(async () => developmentBuild),
    } as unknown as ViteDevServer

    let app = fastify()

    try {
      await app.register(fastifyReactRouter, {
        devServer: vite,
        build: productionBuild,
      })

      let build = mockedReactRouterHandler.mock.calls[0]?.[0]

      expect(build).not.toBe(productionBuild)
      expect(build).toEqual(expect.any(Function))
      await expect(
        (build as () => Promise<ReactRouter.ServerBuild>)(),
      ).resolves.toBe(developmentBuild)
      expect(vite.ssrLoadModule).toHaveBeenCalledWith(
        "virtual:react-router/server-build",
      )
    } finally {
      await app.close()
    }
  })
})

import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { Readable } from "node:stream"

import { createReadableStreamFromReadable } from "@react-router/node"
import fastify from "fastify"
import type * as ReactRouter from "react-router"
import {
  createRequestHandler as createReactRouterHandler,
  RouterContextProvider,
} from "react-router"
import type { ViteDevServer } from "vite"
import type { MockedFunction } from "vitest"
import { afterEach, describe, expect, it, vi } from "vitest"

import { fastifyReactRouter } from "./fastify.ts"
import { createRequestHandler } from "./handler.ts"
import { createHeaders, createRequest, createUrl } from "./request.ts"
import { sendResponse } from "./response.ts"
import { importSsrModule } from "./vite-runtime.ts"
import { fastifyReactRouterDev } from "./vite.ts"

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

describe("request adapter", () => {
  it("copies headers", () => {
    let headers = createHeaders({
      "x-single": "one",
      "x-many": ["two", "three"],
    })

    expect(headers.get("X-Single")).toBe("one")
    expect(headers.get("X-Many")).toBe("two, three")
  })

  it("skips empty header values", () => {
    let headers = createHeaders({
      "x-null": null,
      "x-undefined": undefined,
      "x-value": "yes",
    } as unknown as Parameters<typeof createHeaders>[0])

    expect(headers.has("X-Null")).toBe(false)
    expect(headers.has("X-Undefined")).toBe(false)
    expect(headers.get("X-Value")).toBe("yes")
  })

  it("keeps original URLs intact", async () => {
    let app = fastify()
    let seenUrl = ""

    app.get("*", async (request, reply) => {
      seenUrl = createUrl(request)
      reply.send("ok")
    })

    await app.inject({
      url: "//docs//intro?x=1",
      headers: { Host: "example.com" },
    })

    expect(seenUrl).toBe("http://example.com//docs//intro?x=1")
  })

  it("creates Web requests with stream bodies", async () => {
    let app = fastify()
    let seenText = ""

    app.removeAllContentTypeParsers()
    app.addContentTypeParser("*", (_request, payload, done) => {
      done(null, payload)
    })
    app.post("*", async (request, reply) => {
      let webRequest = createRequest(request, reply)
      seenText = await webRequest.text()
      reply.send("ok")
    })

    await app.inject({
      method: "POST",
      url: "/submit",
      headers: { "Content-Type": "text/plain" },
      payload: "hello",
    })

    expect(seenText).toBe("hello")
  })

  it("serializes parsed JSON bodies", async () => {
    let app = fastify()
    let seenText = ""

    app.post("*", async (request, reply) => {
      let webRequest = createRequest(request, reply)
      seenText = await webRequest.text()
      reply.send("ok")
    })

    await app.inject({
      method: "POST",
      url: "/submit",
      headers: { "Content-Type": "application/json" },
      payload: JSON.stringify({ hello: "world" }),
    })

    expect(seenText).toBe(JSON.stringify({ hello: "world" }))
  })
})

describe("response adapter", () => {
  it("writes status, headers, and stream bodies", async () => {
    let app = fastify()

    app.get("*", async (_request, reply) => {
      let body = createReadableStreamFromReadable(Readable.from("hello"))
      await sendResponse(
        reply,
        new Response(body, {
          status: 201,
          headers: { "X-Test": "yes" },
        }),
      )
    })

    let response = await app.inject("/")

    expect(response.statusCode).toBe(201)
    expect(response.headers["x-test"]).toBe("yes")
    expect(response.body).toBe("hello")
  })

  it("preserves multiple set-cookie headers in runtimes that expose getSetCookie", async () => {
    let app = fastify()

    app.get("*", async (_request, reply) => {
      let headers = new Headers()
      headers.append("Set-Cookie", "a=1; Path=/")
      headers.append("Set-Cookie", "b=2; Path=/")
      await sendResponse(reply, new Response("ok", { headers }))
    })

    let response = await app.inject("/")

    expect(response.headers["set-cookie"]).toEqual([
      "a=1; Path=/",
      "b=2; Path=/",
    ])
  })

  it("sends responses without bodies", async () => {
    let app = fastify()

    app.get("*", async (_request, reply) => {
      await sendResponse(
        reply,
        new Response(null, {
          status: 204,
          headers: { "X-Empty": "yes" },
        }),
      )
    })

    let response = await app.inject("/")

    expect(response.statusCode).toBe(204)
    expect(response.headers["x-empty"]).toBe("yes")
    expect(response.body).toBe("")
  })
})

describe("createRequestHandler", () => {
  it("passes adapted request and load context to React Router", async () => {
    let context = new RouterContextProvider()
    let seenPath = ""
    let seenContext: RouterContextProvider | undefined

    mockedReactRouterHandler.mockImplementation(
      () => async (request, loadContext) => {
        seenPath = new URL(request.url).pathname
        seenContext = loadContext
        return new Response("handled")
      },
    )

    let app = fastify()
    app.all(
      "*",
      createRequestHandler({
        build: {} as ReactRouter.ServerBuild,
        getLoadContext() {
          return context
        },
      }),
    )

    let response = await app.inject("/route")

    expect(response.body).toBe("handled")
    expect(seenPath).toBe("/route")
    expect(seenContext).toBe(context)
  })

  it("passes the configured mode to React Router", () => {
    mockedReactRouterHandler.mockImplementation(
      () => async () => new Response("ok"),
    )

    createRequestHandler({
      build: {} as ReactRouter.ServerBuild,
      mode: "production",
    })

    expect(mockedReactRouterHandler).toHaveBeenCalledWith({}, "production")
  })
})

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
})

describe("importSsrModule", () => {
  it("uses the Vite Environment runner when available", async () => {
    let imported = { ok: true }
    let vite = {
      environments: {
        ssr: {
          runner: {
            import: vi.fn(async () => imported),
          },
        },
      },
      ssrLoadModule: vi.fn(),
    } as unknown as ViteDevServer

    await expect(importSsrModule(vite, "/entry.ts")).resolves.toBe(imported)
    expect(
      (
        vite as unknown as {
          environments: {
            ssr: {
              runner: {
                import: MockedFunction<(id: string) => Promise<typeof imported>>
              }
            }
          }
        }
      ).environments.ssr.runner.import,
    ).toHaveBeenCalledWith("/entry.ts")
    expect(vite.ssrLoadModule).not.toHaveBeenCalled()
  })

  it("falls back to ssrLoadModule", async () => {
    let imported = { ok: true }
    let vite = {
      ssrLoadModule: vi.fn(async () => imported),
    } as unknown as ViteDevServer

    await expect(importSsrModule(vite, "/entry.ts")).resolves.toBe(imported)
    expect(vite.ssrLoadModule).toHaveBeenCalledWith("/entry.ts")
  })
})

describe("fastifyReactRouterDev", () => {
  it("creates a pre-enforced Vite plugin", () => {
    let plugin = fastifyReactRouterDev({ entry: "./server.ts" })

    expect(plugin.name).toBe("fastify-react-router-dev")
    expect(plugin.enforce).toBe("pre")
    expect(plugin.configureServer).toBeTypeOf("function")
  })

  it("externalizes package imports found in the server entry during SSR builds", async () => {
    let root = fs.mkdtempSync(path.join(os.tmpdir(), "rr-fastify-"))
    fs.writeFileSync(
      path.join(root, "server.ts"),
      'import { requestInfoContext } from "#request-info";\n',
    )

    try {
      let plugin = fastifyReactRouterDev({ entry: "./server.ts" })
      let configResolved = getHook(plugin.configResolved)
      await (configResolved as AnyHook | undefined)?.call(undefined, {
        command: "build",
        root,
      })

      let resolveId = getHook(plugin.resolveId)
      let result = await (resolveId as AnyHook | undefined)?.call(
        {
          resolve: vi.fn(),
        },
        "#request-info",
        path.join(root, "app/root.tsx"),
        {
          isEntry: false,
          ssr: true,
        },
      )

      expect(result).toEqual({
        id: "#request-info",
        external: true,
      })
    } finally {
      fs.rmSync(root, { recursive: true, force: true })
    }
  })

  it("externalizes relative server entry imports by resolved file", async () => {
    let root = fs.mkdtempSync(path.join(os.tmpdir(), "rr-fastify-"))
    let helperPath = path.join(root, "app/request-info.ts")
    fs.mkdirSync(path.dirname(helperPath), { recursive: true })
    fs.writeFileSync(
      path.join(root, "server.ts"),
      'import { requestInfoContext } from "./app/request-info";\n',
    )
    fs.writeFileSync(helperPath, "export let requestInfoContext = Symbol();\n")

    try {
      let plugin = fastifyReactRouterDev({ entry: "./server.ts" })
      let configResolved = getHook(plugin.configResolved)
      await (configResolved as AnyHook | undefined)?.call(undefined, {
        command: "build",
        root,
      })

      let normalizedHelperPath = helperPath.split(path.sep).join("/")
      let resolveId = getHook(plugin.resolveId)
      let result = await (resolveId as AnyHook | undefined)?.call(
        {
          resolve: vi.fn(async () => ({ id: normalizedHelperPath })),
        },
        "./request-info",
        path.join(root, "app/root.tsx"),
        {
          isEntry: false,
          ssr: true,
        },
      )

      expect(result).toEqual({
        id: normalizedHelperPath,
        external: true,
      })
    } finally {
      fs.rmSync(root, { recursive: true, force: true })
    }
  })

  it("does not externalize server entry imports when disabled", async () => {
    let root = fs.mkdtempSync(path.join(os.tmpdir(), "rr-fastify-"))
    fs.writeFileSync(
      path.join(root, "server.ts"),
      'import { requestInfoContext } from "#request-info";\n',
    )

    try {
      let plugin = fastifyReactRouterDev({
        entry: "./server.ts",
        externalizeServerEntryImports: false,
      })
      let configResolved = getHook(plugin.configResolved)
      await (configResolved as AnyHook | undefined)?.call(undefined, {
        command: "build",
        root,
      })

      let resolveId = getHook(plugin.resolveId)
      let result = await (resolveId as AnyHook | undefined)?.call(
        {
          resolve: vi.fn(),
        },
        "#request-info",
        path.join(root, "app/root.tsx"),
        {
          isEntry: false,
          ssr: true,
        },
      )

      expect(result).toBeNull()
    } finally {
      fs.rmSync(root, { recursive: true, force: true })
    }
  })
})

function getHook<T>(hook: T | { handler: T } | undefined): T | undefined {
  if (hook == null) return undefined
  if (typeof hook === "object" && "handler" in hook) return hook.handler
  return hook as T
}

type AnyHook = {
  call(thisArg: unknown, ...args: unknown[]): unknown
}

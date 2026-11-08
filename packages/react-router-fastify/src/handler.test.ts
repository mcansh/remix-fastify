import http2 from "node:http2"

import fastify from "fastify"
import type * as ReactRouter from "react-router"
import {
  createRequestHandler as createReactRouterHandler,
  RouterContextProvider,
} from "react-router"
import type { MockedFunction } from "vitest"
import { afterEach, describe, expect, it, vi } from "vitest"

import { createRequestHandler } from "./handler.ts"

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

describe("createRequestHandler", () => {
  afterEach(() => {
    mockedReactRouterHandler.mockReset()
  })

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

  it("handles requests on HTTP/2 servers", async () => {
    let seenPath = ""
    let seenRawRequest = false

    mockedReactRouterHandler.mockImplementation(() => async (request) => {
      seenPath = new URL(request.url).pathname
      return new Response("handled")
    })

    let app = fastify({ http2: true })
    app.all(
      "*",
      createRequestHandler({
        build: {} as ReactRouter.ServerBuild,
        getLoadContext(request) {
          seenRawRequest = request.raw instanceof http2.Http2ServerRequest
          return undefined
        },
      }),
    )

    let address = await app.listen({ host: "127.0.0.1", port: 0 })
    let client = http2.connect(address)

    try {
      let body = await new Promise<string>((resolve, reject) => {
        let stream = client.request({ ":path": "/route" })
        let chunks: Buffer[] = []
        stream.on("data", (chunk: Buffer) => chunks.push(chunk))
        stream.on("error", reject)
        stream.on("end", () => resolve(Buffer.concat(chunks).toString()))
        stream.end()
      })

      expect(body).toBe("handled")
      expect(seenPath).toBe("/route")
      expect(seenRawRequest).toBe(true)
    } finally {
      client.close()
      await app.close()
    }
  })
})

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
})

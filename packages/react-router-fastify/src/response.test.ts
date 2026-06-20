import { Readable } from "node:stream"

import { createReadableStreamFromReadable } from "@react-router/node"
import fastify from "fastify"
import { describe, expect, it } from "vitest"

import { sendResponse } from "./response.ts"

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

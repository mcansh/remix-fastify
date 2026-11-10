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

  it("appends Link headers to ones already set on the reply", async () => {
    let app = fastify()

    app.get("*", async (_request, reply) => {
      reply.header("Link", "</font.woff2>; rel=preload; as=font; crossorigin")
      await sendResponse(
        reply,
        new Response("ok", {
          headers: { Link: "</app.css>; rel=preload; as=style" },
        }),
      )
    })

    let response = await app.inject("/")

    expect(response.headers.link).toBe(
      "</font.woff2>; rel=preload; as=font; crossorigin, </app.css>; rel=preload; as=style",
    )
  })

  it("keeps Link headers set on the reply as an array", async () => {
    let app = fastify()

    app.get("*", async (_request, reply) => {
      reply.header("Link", ["</a.js>; rel=modulepreload"])
      await sendResponse(
        reply,
        new Response("ok", {
          headers: { Link: "</b.js>; rel=modulepreload" },
        }),
      )
    })

    let response = await app.inject("/")

    expect(response.headers.link).toEqual([
      "</a.js>; rel=modulepreload",
      "</b.js>; rel=modulepreload",
    ])
  })

  it("lets response headers other than Link replace ones set on the reply", async () => {
    let app = fastify()

    app.get("*", async (_request, reply) => {
      reply.header("X-Robots-Tag", "noindex")
      reply.header("Link", "</font.woff2>; rel=preload; as=font")
      await sendResponse(
        reply,
        new Response("ok", { headers: { "X-Robots-Tag": "all" } }),
      )
    })

    let response = await app.inject("/")

    expect(response.headers["x-robots-tag"]).toBe("all")
    expect(response.headers.link).toBe("</font.woff2>; rel=preload; as=font")
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

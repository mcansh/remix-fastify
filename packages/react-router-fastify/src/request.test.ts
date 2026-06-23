import fastify from "fastify"
import { describe, expect, it } from "vitest"

import { createHeaders, createRequest, createUrl } from "./request.ts"

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

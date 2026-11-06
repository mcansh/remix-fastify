import http2 from "node:http2"

import fastify from "fastify"
import type { FastifyReply, FastifyRequest } from "fastify"
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

  it("skips HTTP/2 pseudo headers", () => {
    let headers = createHeaders({
      ":method": "GET",
      ":path": "/",
      ":scheme": "http",
      ":authority": "example.com",
      "x-value": "yes",
    } as unknown as Parameters<typeof createHeaders>[0])

    expect([...headers.keys()]).toEqual(["x-value"])
  })

  it("creates Web requests from HTTP/2 requests", async () => {
    let app = fastify({ http2: true })
    let seenMethod = ""
    let seenUrl = ""

    app.get("*", async (request, reply) => {
      // createRequest is typed for HTTP/1 requests; the runtime shape is the same.
      let webRequest = createRequest(
        request as unknown as FastifyRequest,
        reply as unknown as FastifyReply,
      )
      seenMethod = webRequest.method
      seenUrl = webRequest.url
      reply.send("ok")
    })

    let address = await app.listen({ host: "127.0.0.1", port: 0 })
    let client = http2.connect(address)

    try {
      let status = await new Promise<number | undefined>((resolve, reject) => {
        let stream = client.request({ ":path": "/docs?x=1" })
        let responseStatus: number | undefined
        stream.on("response", (headers) => {
          responseStatus = headers[":status"]
        })
        stream.on("error", reject)
        stream.on("end", () => resolve(responseStatus))
        stream.resume()
        stream.end()
      })

      expect(status).toBe(200)
      expect(seenMethod).toBe("GET")
      expect(seenUrl).toBe(`${address}/docs?x=1`)
    } finally {
      client.close()
      await app.close()
    }
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

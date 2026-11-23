import assert from "node:assert/strict"
import { createHash } from "node:crypto"
import type { AddressInfo } from "node:net"
import { after, before, test } from "node:test"
import { fileURLToPath } from "node:url"

import type { FastifyInstance } from "fastify"

// server.ts loads the build relative to the working directory, and React
// Router picks its production build from NODE_ENV when it is first imported
process.chdir(fileURLToPath(new URL("..", import.meta.url)))
process.env.NODE_ENV = "production"
process.env.LOG_LEVEL = "silent"

const { createServer } = await import("../server.ts")

let app: FastifyInstance
let origin: string

before(async () => {
  app = await createServer()
  await app.listen({ port: 0, host: "127.0.0.1" })
  let { port } = app.server.address() as AddressInfo
  origin = `http://127.0.0.1:${port}`
})

after(() => app.close())

test("renders a route with context from getLoadContext and root middleware", async () => {
  let response = await fetch(`${origin}/`, {
    headers: { "User-Agent": "integration-test" },
  })
  let html = await response.text()

  assert.equal(response.status, 200)
  assert.equal(response.headers.get("Content-Type"), "text/html")
  assert.match(html, /React Router is running through Fastify\./)
  assert.match(html, /integration-test/)
  assert.match(html, /getLoadContext -&gt; root middleware/)
})

test("serves Fastify routes registered next to the React Router catch-all", async () => {
  let response = await fetch(`${origin}/api/health`)

  let body = await response.json()

  assert.equal(response.status, 200)
  assert.equal(body.ok, true)
  assert.equal(body.adapter, "fastify")
})

test("serves the client assets with the bytes their integrity hashes expect", async () => {
  let html = await fetch(`${origin}/`).then((response) => response.text())
  let importMap = html.match(
    /<script[^>]*type="importmap"[^>]*>(.*?)<\/script>/,
  )
  assert.ok(importMap, "expected an import map with integrity hashes")
  let { integrity } = JSON.parse(importMap[1]) as {
    integrity: Record<string, string>
  }
  let assets = Object.entries(integrity)
  assert.ok(assets.length > 0)

  for (let [pathname, expected] of assets) {
    let response = await fetch(`${origin}${pathname}`)
    let body = Buffer.from(await response.arrayBuffer())
    let actual = `sha384-${createHash("sha384").update(body).digest("base64")}`

    assert.equal(response.status, 200, pathname)
    assert.equal(
      response.headers.get("Cache-Control"),
      "public, max-age=31536000, immutable",
      pathname,
    )
    assert.equal(actual, expected, pathname)
  }
})

test("returns route data for client-side navigations", async () => {
  let response = await fetch(`${origin}/about.data`)

  assert.equal(response.status, 200)
  assert.equal(response.headers.get("Content-Type"), "text/x-script")
})

test("renders the React Router 404 page for unknown URLs and assets", async () => {
  for (let pathname of ["/missing", "/assets/missing.js"]) {
    let response = await fetch(`${origin}${pathname}`)

    assert.equal(response.status, 404, pathname)
    assert.equal(response.headers.get("Content-Type"), "text/html", pathname)
  }
})

test("passes the request origin to React Router's action origin check", async () => {
  let submit = (requestOrigin: string) =>
    fetch(`${origin}/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Origin: requestOrigin,
      },
      body: "intent=test",
    })

  // the route has no action, so an allowed submission reaches the route
  assert.equal((await submit(origin)).status, 405)
  assert.equal((await submit("https://remix.run")).status, 405)
  assert.equal((await submit("https://example.com")).status, 400)
})

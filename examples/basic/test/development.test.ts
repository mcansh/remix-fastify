import assert from "node:assert/strict"
import { after, before, test } from "node:test"
import { fileURLToPath } from "node:url"

import type { ViteDevServer } from "vite"
import { createServer } from "vite"

const root = fileURLToPath(new URL("..", import.meta.url))
process.chdir(root)
process.env.LOG_LEVEL = "silent"

let vite: ViteDevServer
let origin: string

before(async () => {
  vite = await createServer({
    root,
    logLevel: "silent",
    server: { port: 0, host: "127.0.0.1" },
  })
  await vite.listen()
  let [url] = vite.resolvedUrls?.local ?? []
  assert.ok(url, "expected the Vite dev server to listen")
  origin = new URL(url).origin
})

after(() => vite.close())

test("renders React Router routes through the Fastify app", async () => {
  let response = await fetch(`${origin}/`, {
    headers: { "User-Agent": "integration-test" },
  })
  let html = await response.text()

  assert.equal(response.status, 200)
  assert.equal(response.headers.get("Content-Type"), "text/html")
  assert.match(html, /React Router is running through Fastify\./)
  assert.match(html, /integration-test/)
  assert.match(html, /getLoadContext -&gt; root middleware/)

  let about = await fetch(`${origin}/about`)
  assert.equal(about.status, 200)
  assert.match(await about.text(), /The Vite plugin mounted this Fastify app/)
})

test("serves Fastify routes registered next to the React Router catch-all", async () => {
  let response = await fetch(`${origin}/api/health`)

  assert.equal(response.status, 200)
  assert.equal((await response.json()).adapter, "fastify")
})

test("returns route data for client-side navigations", async () => {
  let response = await fetch(`${origin}/about.data`)

  assert.equal(response.status, 200)
  assert.equal(response.headers.get("Content-Type"), "text/x-script")
})

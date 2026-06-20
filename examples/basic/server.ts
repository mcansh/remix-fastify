import { randomUUID } from "node:crypto"
import { pathToFileURL } from "node:url"

import { fastifyReactRouter } from "@mcansh/remix-fastify"
import { fastify } from "fastify"
import { RouterContextProvider } from "react-router"
import type { ViteDevServer } from "vite"

import { requestInfoContext } from "#request-info"

export async function createServer(vite?: ViteDevServer) {
  let app = fastify({
    genReqId: () => randomUUID(),
    logger: {
      level: process.env.LOG_LEVEL ?? "info",
    },
  })

  app.get("/api/health", async (request) => ({
    ok: true,
    adapter: "fastify",
    requestId: request.id,
    timestamp: new Date().toISOString(),
  }))

  await app.register(fastifyReactRouter, {
    devServer: vite,
    getLoadContext(request) {
      let context = new RouterContextProvider()
      context.set(requestInfoContext, {
        requestId: request.id,
        userAgent: request.headers["user-agent"] ?? "unknown",
        source: "getLoadContext",
      })

      return context
    },
  })

  return app
}

const entryPoint = process.argv[1]
  ? pathToFileURL(process.argv[1]).href
  : undefined

if (import.meta.url === entryPoint) {
  let port = Number(process.env.PORT ?? 3000)
  let host = process.env.HOST ?? "0.0.0.0"
  let app = await createServer()

  await app.listen({ port, host })
}

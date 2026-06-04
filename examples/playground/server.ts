import { reactRouterFastify } from "@mcansh/remix-fastify"
import { fastify } from "fastify"
import { RouterContextProvider, type ServerBuild } from "react-router"
import type { ViteDevServer } from "vite"

import { nameContext } from "./app/context.ts"

// The `fastifyDevServer` Vite plugin imports this module in development and
// calls `createApp` with the Vite dev server. Production runs this file
// directly (`node server.js`), where `createApp` is called with no dev server.
export async function createApp({
  viteDevServer,
}: { viteDevServer?: ViteDevServer } = {}) {
  let app = fastify()

  app.post("/api/echo", async (request, reply) => {
    reply.send(request.body)
  })

  // We load the server build here (not the plugin), so we could shape it before
  // handing it over — e.g. set `allowedActionOrigins`. In development we resolve
  // it through Vite so route changes hot-reload; in production we import the
  // compiled build.
  let build: ServerBuild = await import(
    // @ts-ignore - the virtual module is only available in development
    "virtual:react-router/server-build"
  )

  await app.register(
    reactRouterFastify({
      viteDevServer,
      build,
      getLoadContext() {
        let context = new RouterContextProvider()
        context.set(nameContext, "host-server")
        return context
      },
    }),
  )

  return app
}

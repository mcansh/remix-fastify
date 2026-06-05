import { styleText } from "node:util";

import { reactRouterFastify } from "@mcansh/remix-fastify";
import { fastify } from "fastify";
import getPort, { portNumbers } from "get-port";
import { RouterContextProvider } from "react-router";

import { nameContext } from "./app/context.ts";

const BUILD_PATH = "./build/server/index.js";

const app = fastify()

app.post("/api/echo", async (request, reply) => {
  reply.send(request.body)
})

await app.register(
  reactRouterFastify({
    build: await import(BUILD_PATH),
    getLoadContext() {
      let context = new RouterContextProvider()
      context.set(nameContext, "host-server")
      return context
    },
  }),
)

const desiredPort = Number(process.env.PORT) || 3000
const portToUse = await getPort({
  port: portNumbers(desiredPort, desiredPort + 100),
})

const address = await app.listen({ port: portToUse, host: "0.0.0.0" })

if (portToUse !== desiredPort) {
  console.warn(
    styleText(
      "yellow",
      `⚠️ Port ${desiredPort} is not available, using ${portToUse} instead.`,
    ),
  )
}

console.log(styleText("green", `✅ app ready: ${address}`))

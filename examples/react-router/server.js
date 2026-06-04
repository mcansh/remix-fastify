import { reactRouterFastify } from "@mcansh/remix-fastify"
import chalk from "chalk"
import { fastify } from "fastify"
import getPort, { portNumbers } from "get-port"
import sourceMapSupport from "source-map-support"

sourceMapSupport.install()

const app = fastify()

// We load the server build here (not the plugin), so we could shape it before
// handing it over — e.g. set `allowedActionOrigins`.
const build = await import("./build/server/index.js")

await app.register(reactRouterFastify({ build }))

const desiredPort = Number(process.env.PORT) || 3000
const portToUse = await getPort({
  port: portNumbers(desiredPort, desiredPort + 100),
})

const address = await app.listen({ port: portToUse, host: "0.0.0.0" })

if (portToUse !== desiredPort) {
  console.warn(
    chalk.yellow(
      `⚠️  Port ${desiredPort} is not available, using ${portToUse} instead.`,
    ),
  )
}

console.log(chalk.green(`✅ app ready: ${address}`))

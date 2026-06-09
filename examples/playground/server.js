import { reactRouterFastify } from "@mcansh/remix-fastify";
import chalk from "chalk";
import "dotenv/config";
import { fastify } from "fastify";
import getPort, { portNumbers } from "get-port";
import { pathToFileURL } from "node:url";
import sourceMapSupport from "source-map-support";

sourceMapSupport.install();

/**
 * Build the Fastify app. In development `fastifyDevServer` imports this and
 * passes the Vite dev server in; in production it's called without one.
 *
 * @param {import("vite").ViteDevServer} [vite]
 */
export async function app(vite) {
  let app = fastify();

  app.post("/api/echo", async (request, reply) => {
    reply.send(request.body);
  });

  await app.register(reactRouterFastify, { vite });

  return app;
}

// Only start listening when run directly (`node ./server.js`), not when the
// Vite dev server imports this module.
let isMain = import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  let server = await app();

  const desiredPort = Number(process.env.PORT) || 3000;
  const portToUse = await getPort({
    port: portNumbers(desiredPort, desiredPort + 100),
  });

  let address = await server.listen({ port: portToUse, host: "0.0.0.0" });

  if (portToUse !== desiredPort) {
    console.warn(
      chalk.yellow(
        `⚠️ Port ${desiredPort} is not available, using ${portToUse} instead.`,
      ),
    );
  }

  console.log(chalk.green(`✅ app ready: ${address}`));
}

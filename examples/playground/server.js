import { getDevServer, reactRouterFastify } from "@mcansh/remix-fastify";
import chalk from "chalk";
import { fastify } from "fastify";
import getPort, { portNumbers } from "get-port";
import { RouterContextProvider } from "react-router";
import sourceMapSupport from "source-map-support";
import { nameContext } from "./app/context.ts";

sourceMapSupport.install();

export const app = fastify();

app.post("/api/echo", async (request, reply) => {
  reply.send(request.body);
});

await app.register(reactRouterFastify, {
  getLoadContext() {
    let context = new RouterContextProvider();
    context.set(nameContext, "host-server");
    return context;
  },
});

// In development the `fastifyDevServer` Vite plugin imports this module and
// drives the app itself, so we only start listening when run directly (e.g.
// `node server.js` in production).
if (!getDevServer()) {
  const desiredPort = Number(process.env.PORT) || 3000;
  const portToUse = await getPort({
    port: portNumbers(desiredPort, desiredPort + 100),
  });

  const address = await app.listen({ port: portToUse, host: "0.0.0.0" });

  if (portToUse !== desiredPort) {
    console.warn(
      chalk.yellow(
        `⚠️ Port ${desiredPort} is not available, using ${portToUse} instead.`,
      ),
    );
  }

  console.log(chalk.green(`✅ app ready: ${address}`));
}

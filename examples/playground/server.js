import { reactRouterFastify } from "@mcansh/remix-fastify";
import "dotenv/config";
import { fastify } from "fastify";
import getPort, { portNumbers } from "get-port";
import { styleText } from "node:util";
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

  if (vite == null) {
    const desiredPort = Number(process.env.PORT) || 3000;
    const portToUse = await getPort({
      port: portNumbers(desiredPort, desiredPort + 100),
    });

    let address = await app.listen({ port: portToUse, host: "0.0.0.0" });

    if (portToUse !== desiredPort) {
      console.warn(
        styleText(
          "yellow",
          `⚠️ Port ${desiredPort} is not available, using ${portToUse} instead.`,
        ),
      );
    }

    console.log(styleText("green", `✅ app ready: ${address}`));
  }

  return app;
}

await app();

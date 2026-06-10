import { createApp, reactRouterFastify } from "@mcansh/remix-fastify";
import "dotenv/config";
import { fastify } from "fastify";
import getPort, { portNumbers } from "get-port";
import { styleText } from "node:util";
import { RouterContextProvider } from "react-router";
import sourceMapSupport from "source-map-support";

import { nameContext } from "./app/context.ts";

sourceMapSupport.install();

/**
 * Build the Fastify app. In development `fastifyDevServer` imports this and
 * passes the Vite dev server in; in production it's called without one. Using
 * `createApp` types the `vite` argument for you — no JSDoc needed.
 */
export const app = createApp(async (vite) => {
  let app = fastify();

  app.post("/api/echo", async (request, reply) => {
    reply.send(request.body);
  });

  await app.register(reactRouterFastify, {
    vite,
    getLoadContext() {
      let context = new RouterContextProvider();
      context.set(nameContext, "Server");
      return context;
    },
  });

  if (vite == null) {
    let desiredPort = Number(process.env.PORT) || 3000;
    let portToUse = await getPort({
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
});

await app();

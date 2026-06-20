import { pathToFileURL } from "node:url";
import { styleText } from "node:util";

import { createApp, reactRouterFastify } from "@mcansh/remix-fastify";
import { fastify } from "fastify";
import getPort, { portNumbers } from "get-port";
import sourceMapSupport from "source-map-support";

sourceMapSupport.install();

/**
 * Build the Fastify app. In development `fastifyDevServer` imports this and
 * passes the Vite dev server in; in production it's called without one. Using
 * `createApp` types the `vite` argument for you — no JSDoc needed.
 */
export const app = createApp(async (vite) => {
  let app = fastify();
  await app.register(reactRouterFastify, { vite });
  return app;
});

// Only start listening when run directly (`node ./server.js`), not when the
// Vite dev server imports this module.
const isMain =
  typeof process.argv[1] === "string" && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  let server = await app();

  let desiredPort = Number(process.env.PORT) || 3000;
  let portToUse = await getPort({
    port: portNumbers(desiredPort, desiredPort + 100),
  });

  let address = await server.listen({ port: portToUse, host: "0.0.0.0" });

  if (portToUse !== desiredPort) {
    console.warn(
      styleText("yellow", `⚠️  Port ${desiredPort} is not available, using ${portToUse} instead.`),
    );
  }

  console.log(styleText("green", `✅ app ready: ${address}`));
}

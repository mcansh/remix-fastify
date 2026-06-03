import { fileURLToPath } from "node:url";
import { reactRouterFastify } from "@mcansh/remix-fastify";
import chalk from "chalk";
import { fastify } from "fastify";
import getPort, { portNumbers } from "get-port";
import { RouterContextProvider } from "react-router";
import sourceMapSupport from "source-map-support";
import { nameContext } from "./app/context.ts";

sourceMapSupport.install();

// The `fastifyDevServer` Vite plugin imports this module in development and
// calls `createApp` with the Vite dev server. Production runs this file
// directly (`node server.js`), where `createApp` is called with no dev server.
/**
 * @param {{ viteDevServer?: import("vite").ViteDevServer }} [options]
 */
export async function createApp({ viteDevServer } = {}) {
  const app = fastify();

  app.post("/api/echo", async (request, reply) => {
    reply.send(request.body);
  });

  // We load the server build here (not the plugin), so we could shape it before
  // handing it over — e.g. set `allowedActionOrigins`. In development we resolve
  // it through Vite so route changes hot-reload; in production we import the
  // compiled build.
  const build = viteDevServer
    ? () => viteDevServer.ssrLoadModule("virtual:react-router/server-build")
    : await import("./build/server/index.js");

  await app.register(
    reactRouterFastify({
      viteDevServer,
      build,
      getLoadContext() {
        let context = new RouterContextProvider();
        context.set(nameContext, "host-server");
        return context;
      },
    }),
  );

  return app;
}

// Only start listening when run directly (production). Under the Vite dev
// plugin this module is imported, so `import.meta.url` won't match argv[1].
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const app = await createApp();

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

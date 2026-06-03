import type { IncomingMessage, ServerResponse } from "node:http";

import type { FastifyInstance } from "fastify";
import type { Connect, Plugin } from "vite";

import { setDevServer } from "./shared";

export interface FastifyDevServerOptions {
  /**
   * Path to your server entry, relative to the project root. The module must
   * export a Fastify instance (see {@link FastifyDevServerOptions.export}).
   * @default "./server.js"
   */
  entry?: string;
  /**
   * The named export of the Fastify instance in your server entry.
   * @default "app"
   */
  export?: string;
}

/**
 * A Vite plugin that runs your Fastify server in development.
 *
 * Add it alongside `reactRouter()` and run `react-router dev`. Vite serves
 * client assets and HMR, then forwards every other request to your Fastify
 * app, which renders with React Router via `reactRouterFastify`.
 *
 * ```ts
 * // vite.config.ts
 * import { reactRouter } from "@react-router/dev/vite";
 * import { fastifyDevServer } from "@mcansh/remix-fastify/vite";
 *
 * export default {
 *   plugins: [reactRouter(), fastifyDevServer({ entry: "./server.js" })],
 * };
 * ```
 */
export function fastifyDevServer(options: FastifyDevServerOptions = {}): Plugin {
  let entry = options.entry ?? "./server.js";
  let exportName = options.export ?? "app";

  return {
    name: "@mcansh/remix-fastify:dev-server",
    // `pre` so our returned post-hook runs before React Router's own dev
    // catch-all (a normal-enforce post-hook). Both still run after Vite's
    // internal asset/HMR middleware, but Fastify must win over React Router's
    // SSR fallback so custom routes (e.g. APIs) and our handler are reached.
    enforce: "pre",
    apply: "serve",
    configureServer(server) {
      // Hand the dev server to `reactRouterFastify`, which runs inside the
      // entry module we load below.
      setDevServer(server);

      // Returning a function registers our middleware as a "post" hook so
      // Vite's own middlewares (module/asset transforms, HMR) run first and
      // only document/data/API requests fall through to Fastify.
      return () => {
        server.middlewares.use(
          async (
            req: IncomingMessage,
            res: ServerResponse,
            next: Connect.NextFunction,
          ) => {
            try {
              let mod = await server.ssrLoadModule(entry);
              let app = (await mod[exportName]) as FastifyInstance | undefined;
              if (!app || typeof app.routing !== "function") {
                throw new Error(
                  `[@mcansh/remix-fastify] expected "${entry}" to export a Fastify instance named "${exportName}".`,
                );
              }
              await app.ready();
              app.routing(req, res);
            } catch (error) {
              if (error instanceof Error) server.ssrFixStacktrace(error);
              next(error);
            }
          },
        );
      };
    },
  };
}

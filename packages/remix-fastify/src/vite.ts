import type { IncomingMessage, ServerResponse } from "node:http";

import type { FastifyInstance } from "fastify";
import type { Connect, Plugin, ViteDevServer } from "vite";

export interface FastifyDevServerOptions {
  /**
   * Path to your server entry, relative to the project root. The module must
   * export a factory (see {@link FastifyDevServerOptions.export}) that builds
   * and returns a Fastify instance.
   * @default "./server.js"
   */
  entry?: string;
  /**
   * The named export of the factory in your server entry. The factory is
   * called with `{ viteDevServer }` and must return a Fastify instance.
   * @default "createApp"
   */
  export?: string;
}

/**
 * The factory your server entry exports. The Vite plugin calls it with the
 * dev server in development; production code calls it with no arguments.
 */
export type CreateApp = (options: {
  viteDevServer?: ViteDevServer;
}) => FastifyInstance | Promise<FastifyInstance>;

/**
 * A Vite plugin that runs your Fastify server in development.
 *
 * Add it alongside `reactRouter()` and run `react-router dev`. Vite serves
 * client assets and HMR, then forwards every other request to your Fastify
 * app, which renders with React Router via `reactRouterFastify`.
 *
 * Your server entry exports a `createApp({ viteDevServer })` factory. The
 * plugin calls it with the Vite dev server so the app can render through Vite
 * in development — no global state involved.
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
  let exportName = options.export ?? "createApp";

  return {
    name: "@mcansh/remix-fastify:dev-server",
    // `pre` so our returned post-hook runs before React Router's own dev
    // catch-all (a normal-enforce post-hook). Both still run after Vite's
    // internal asset/HMR middleware, but Fastify must win over React Router's
    // SSR fallback so custom routes (e.g. APIs) and our handler are reached.
    enforce: "pre",
    apply: "serve",
    configureServer(server) {
      // Build the app once per evaluation of the entry module, reusing it
      // across requests. When Vite invalidates the entry (you edit it), the
      // next `ssrLoadModule` returns a fresh factory function — a new identity —
      // and we rebuild. Route changes flow through `reactRouterFastify`'s own
      // `ssrLoadModule` of the server build, so they don't require a rebuild.
      let cached: { factory: CreateApp; app: Promise<FastifyInstance> } | null =
        null;

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
              let factory = mod[exportName] as CreateApp | undefined;
              if (typeof factory !== "function") {
                throw new Error(
                  `[@mcansh/remix-fastify] expected "${entry}" to export a function named "${exportName}" that returns a Fastify instance.`,
                );
              }

              if (!cached || cached.factory !== factory) {
                cached?.app.then((app) => app.close()).catch(() => {});
                cached = {
                  factory,
                  app: Promise.resolve(factory({ viteDevServer: server })),
                };
              }

              let app = await cached.app;
              if (typeof app?.routing !== "function") {
                throw new Error(
                  `[@mcansh/remix-fastify] "${exportName}" in "${entry}" did not return a Fastify instance.`,
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

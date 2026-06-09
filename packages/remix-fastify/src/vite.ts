import path from "node:path";

import type { FastifyInstance } from "fastify";
import type { Plugin, ViteDevServer } from "vite";

/**
 * A factory exported from your server entry. It receives the Vite dev server,
 * which you should forward to `reactRouterFastify({ vite })`, and returns a
 * configured Fastify instance.
 */
export type FastifyAppFactory = (
  vite: ViteDevServer,
) => FastifyInstance | Promise<FastifyInstance>;

export type FastifyDevServerOptions = {
  /**
   * Path to your server entry module, relative to the Vite root. The module must
   * export a factory function (see {@link FastifyAppFactory}) that returns a
   * configured Fastify instance.
   * @default "./server.ts"
   */
  serverEntry?: string;
  /**
   * The named export of the factory function in your server entry. Falls back to
   * the module's default export.
   * @default "app"
   */
  exportName?: string;
};

/**
 * Vite plugin that boots your Fastify server in development so `react-router dev`
 * serves requests through it. Vite's own middleware handles module, HMR, and
 * asset requests; Fastify is mounted as the SSR catch-all.
 */
export function fastifyDevServer(
  options: FastifyDevServerOptions = {},
): Plugin {
  let { serverEntry = "./server.ts", exportName = "app" } = options;

  return {
    name: "fastify-dev-server",
    apply: "serve",
    // Run before the React Router plugin so Fastify owns the request lifecycle
    // (custom routes + SSR). Otherwise React Router's own dev SSR middleware
    // intercepts every request and Fastify routes never run.
    enforce: "pre",
    configureServer(server) {
      let entryPath = path.resolve(server.config.root, serverEntry);

      let appPromise: Promise<FastifyInstance> | undefined;

      // Invalidate the cached Fastify instance when the server entry changes so
      // edits to your server setup are picked up without a manual restart. Close
      // the previous instance first so plugins it registered (DB connections,
      // timers, watchers) are torn down instead of leaking across edits.
      server.watcher.on("change", async (file) => {
        if (path.resolve(file) !== entryPath) return;
        let previous = appPromise;
        appPromise = undefined;
        if (!previous) return;
        try {
          let app = await previous;
          await app.close();
        } catch {
          // The previous build may have failed to resolve; nothing to close.
        }
      });

      function getApp(): Promise<FastifyInstance> {
        if (!appPromise) {
          appPromise = (async () => {
            let mod = await server.ssrLoadModule(serverEntry);
            let factory = (mod[exportName] ?? mod.default) as
              | FastifyAppFactory
              | undefined;
            if (typeof factory !== "function") {
              throw new Error(
                `[fastify-dev-server] Expected "${serverEntry}" to export a "${exportName}" (or default) function that returns a Fastify instance.`,
              );
            }
            let app = await factory(server);
            await app.ready();
            return app;
          })();
        }
        return appPromise;
      }

      // Returning a function defers our middleware until after Vite's internal
      // middlewares are installed, so they win for module/HMR/asset requests.
      return () => {
        server.middlewares.use(async (req, res, next) => {
          try {
            let app = await getApp();
            app.routing(req, res);
          } catch (error) {
            // surface SSR load errors with Vite's stack-trace fixup
            if (error instanceof Error) server.ssrFixStacktrace(error);
            next(error);
          }
        });
      };
    },
  };
}

import type { FastifyInstance } from "fastify";
import type { ViteDevServer } from "vite";

/**
 * A factory that builds your Fastify app from a {@link FastifyAppContext}.
 */
export type FastifyAppFactory = (
  vite?: ViteDevServer | undefined,
) => FastifyInstance | Promise<FastifyInstance>;

/**
 * Types your server-entry factory so `vite` is inferred without hand-written
 * JSDoc. Export the result as your server entry's `app`:
 *
 * ```ts
 * export const app = createApp(async ({ vite }) => {
 *   const app = fastify();
 *   await app.register(reactRouterFastify, { vite });
 *   return app;
 * });
 * ```
 *
 * `fastifyDevServer` calls it with the Vite dev server in development; in
 * production you call it yourself (`await app({})`) before `listen`.
 */
export function createApp(factory: FastifyAppFactory): FastifyAppFactory {
  return factory;
}

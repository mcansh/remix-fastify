import type { FastifyInstance } from "fastify";
import type { ViteDevServer } from "vite";

/**
 * Builds a Fastify app for production or React Router development mode.
 *
 * @param vite The Vite dev server when called by `fastifyDevServer`; otherwise
 * `undefined`.
 * @returns The configured Fastify instance, or a promise for one.
 */
export type FastifyAppFactory = (
  vite?: ViteDevServer | undefined,
) => FastifyInstance | Promise<FastifyInstance>;

/**
 * Preserves the `FastifyAppFactory` type for a server-entry factory.
 *
 * Export the result as your server entry's `app`:
 *
 * ```ts
 * export const app = createApp(async (vite) => {
 *   const app = fastify();
 *   await app.register(reactRouterFastify, { vite });
 *   return app;
 * });
 * ```
 *
 * @param factory Factory that builds your Fastify app.
 * @returns The same factory, typed as a `FastifyAppFactory`.
 */
export function createApp(factory: FastifyAppFactory): FastifyAppFactory {
  return factory;
}

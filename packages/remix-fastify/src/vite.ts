import { statSync } from "node:fs";
import { readFile } from "node:fs/promises";
import type { IncomingMessage, ServerResponse } from "node:http";
import * as path from "node:path";

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
  /**
   * Directory of your build output. Used to locate the SSR server build
   * (`<buildDirectory>/server`) when auto-externalizing modules shared between
   * your server entry and your app. Match `buildDirectory` in your React Router
   * config.
   * @default "build"
   */
  buildDirectory?: string;
}

// `from "spec"` (import/export ... from) and side-effect `import "spec"`.
const FROM_IMPORT_RE =
  /(?:^|[\s;])(?:import|export)\b[^;'"]*?\bfrom\s*['"]([^'"]+)['"]/g;
const SIDE_EFFECT_IMPORT_RE = /(?:^|[\s;])import\s*['"]([^'"]+)['"]/g;

function isFile(filePath: string): boolean {
  try {
    return statSync(filePath).isFile();
  } catch {
    return false;
  }
}

function toRelativeSpecifier(fromDir: string, toFile: string): string {
  let relative = path.relative(fromDir, toFile).split(path.sep).join("/");
  return relative.startsWith(".") ? relative : `./${relative}`;
}

/**
 * Find first-party modules the server entry imports so they can be externalized
 * from the SSR build.
 *
 * The host server entry lives outside React Router's build graph, so any module
 * it shares with the app (e.g. a `createContext` token module) would otherwise
 * be inlined a second time into the server bundle. React Router matches context
 * tokens by object identity, so two copies never see each other's values. We
 * scan the entry's relative imports and mark each one external — keyed by
 * absolute path, so the app's own import of the same file (even via a tsconfig
 * alias like `~/context`) resolves to it too. `output.paths` rewrites the
 * externalized import to a portable specifier relative to the server build
 * output.
 *
 * The entry runs directly under Node's ESM resolver, so every import specifier
 * already carries its real extension and points at a real file — no extension
 * or directory/index probing (Node ESM has neither).
 */
async function detectSharedModules(
  entryFile: string,
  ssrOutDir: string,
): Promise<{ external: string[]; paths: Record<string, string> }> {
  let code: string;
  try {
    code = await readFile(entryFile, "utf8");
  } catch {
    return { external: [], paths: {} };
  }

  let entryDir = path.dirname(entryFile);
  let specifiers = new Set<string>();
  for (let regexp of [FROM_IMPORT_RE, SIDE_EFFECT_IMPORT_RE]) {
    for (let match of code.matchAll(regexp)) {
      let specifier = match[1];
      if (specifier && (specifier.startsWith("./") || specifier.startsWith("../"))) {
        specifiers.add(specifier);
      }
    }
  }

  let external: string[] = [];
  let paths: Record<string, string> = {};
  for (let specifier of specifiers) {
    let resolved = path.resolve(entryDir, specifier);
    if (!isFile(resolved)) continue;
    external.push(resolved);
    paths[resolved] = toRelativeSpecifier(ssrOutDir, resolved);
  }
  return { external, paths };
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
  let buildDirectory = options.buildDirectory ?? "build";

  return {
    name: "@mcansh/remix-fastify:dev-server",
    // `pre` so our returned post-hook runs before React Router's own dev
    // catch-all (a normal-enforce post-hook). Both still run after Vite's
    // internal asset/HMR middleware, but Fastify must win over React Router's
    // SSR fallback so custom routes (e.g. APIs) and our handler are reached.
    //
    // No `apply`: the dev middleware in `configureServer` is serve-only by
    // nature, while `config` runs at build to auto-externalize modules shared
    // between the server entry and the SSR build.
    enforce: "pre",
    async config(userConfig, env) {
      if (env.command !== "build") return;

      let root = userConfig.root
        ? path.resolve(userConfig.root)
        : process.cwd();
      let entryFile = path.resolve(root, entry);
      let ssrOutDir = path.resolve(root, buildDirectory, "server");

      let { external, paths } = await detectSharedModules(entryFile, ssrOutDir);
      if (external.length === 0) return;

      return {
        environments: {
          ssr: {
            build: { rollupOptions: { external, output: { paths } } },
          },
        },
      };
    },
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

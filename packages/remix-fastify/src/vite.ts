import path from "node:path";

import type { FastifyInstance } from "fastify";
import type { Plugin, UserConfig } from "vite";

import type { FastifyAppFactory } from "./app";
import { getSsrEnvironment, loadSsrModule } from "./dev-ssr";

export type { FastifyAppFactory } from "./app";

// Match a fully-resolved module id (which may carry a `?query`) against the set
// of absolute paths configured as external.
function isExternalId(id: string, externalIds: Set<string>): boolean {
  return externalIds.has(id.split("?")[0] ?? id);
}

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
  /**
   * Modules (paths relative to the Vite root) that your server entry imports
   * *and* your app also imports — typically a file holding a shared
   * `RouterContext` token used by `getLoadContext`. In production these are kept
   * external to the React Router server build so the built routes and your
   * `node`-run server entry import the same file (and therefore the same token
   * instance) instead of two bundled copies.
   * @example ["./app/context.ts"]
   */
  external?: string[];
  /**
   * Your React Router `buildDirectory`, used to emit relative specifiers for
   * {@link FastifyDevServerOptions.external} modules. Should match the
   * `buildDirectory` in your React Router config.
   * @default "build"
   */
  buildDirectory?: string;
};

/**
 * Vite plugin that boots your Fastify server in development so `react-router dev`
 * serves requests through it. Vite's own middleware handles module, HMR, and
 * asset requests; Fastify is mounted as the SSR catch-all.
 */
export function fastifyDevServer(
  options: FastifyDevServerOptions = {},
): Plugin {
  let {
    serverEntry = "./server.ts",
    exportName = "app",
    external = [],
    buildDirectory = "build",
  } = options;

  // Absolute paths of the modules to keep external from the production server
  // build, resolved once the Vite config is known.
  let externalIds = new Set<string>();
  // Directory the server build is written to, used to relativize external
  // specifiers so the output is portable across machines.
  let serverBuildDir = "";
  let isBuild = false;

  return {
    name: "fastify-dev-server",
    // Run before the React Router plugin so Fastify owns the request lifecycle
    // (custom routes + SSR). Otherwise React Router's own dev SSR middleware
    // intercepts every request and Fastify routes never run.
    enforce: "pre",
    config(_, env) {
      isBuild = env.command === "build";
      // Keep the shared modules external from the SSR build (Rollup level, so
      // Vite's SSR "bundle all app code" behavior doesn't re-inline them). The
      // built routes then import the same file your `node`-run server entry
      // does, preserving `RouterContext` token identity across the boundary.
      if (env.command !== "build" || external.length === 0) return;
      let config: UserConfig = {
        environments: {
          ssr: {
            build: {
              rollupOptions: {
                external: (id) => isExternalId(id, externalIds),
                output: {
                  // Emit a relative specifier (e.g. `../../app/context.ts`)
                  // instead of an absolute path so the build is portable.
                  paths: (id) => {
                    if (!isExternalId(id, externalIds)) return id;
                    let rel = path.relative(
                      serverBuildDir,
                      id.split("?")[0] ?? id,
                    );
                    return rel.startsWith(".") ? rel : `./${rel}`;
                  },
                },
              },
            },
          },
        },
      };
      return config;
    },
    configResolved(config) {
      externalIds = new Set(
        external.map((id) => path.resolve(config.root, id)),
      );
      serverBuildDir = path.join(config.root, buildDirectory, "server");
    },
    // Normalize imports of the shared modules (e.g. via the `~/` alias, which
    // resolves without an extension) to their absolute `.ts` path so Rollup's
    // `external` matcher recognizes them and emits a resolvable specifier.
    async resolveId(source, importer) {
      if (!isBuild || externalIds.size === 0 || !importer) return null;
      let resolved = await this.resolve(source, importer, { skipSelf: true });
      if (resolved && isExternalId(resolved.id, externalIds)) {
        return { id: resolved.id };
      }
      return null;
    },
    configureServer(server) {
      let entryPath = path.resolve(server.config.root, serverEntry);

      let appPromise: Promise<FastifyInstance> | undefined;
      // Absolute paths of every module the server entry imports on the server,
      // collected after each build. A change to any of them rebuilds the app.
      let serverDeps = new Set<string>([entryPath]);

      // Walk the SSR module graph from the server entry to collect the files it
      // depends on. The route modules are re-evaluated by Vite on every request
      // (`vite.ssrLoadModule`), so any module the server entry *also* imports —
      // e.g. an `app/context.ts` holding a `RouterContext` token shared with
      // `getLoadContext` — must rebuild the cached app when it changes.
      // Otherwise the app keeps a stale token while routes resolve a fresh one,
      // and `context.get(...)` throws "No value found for context".
      function collectServerDeps(): Set<string> {
        let files = new Set<string>([entryPath]);
        let roots = getSsrEnvironment(server).moduleGraph.getModulesByFile(
          entryPath,
        );
        if (!roots) return files;
        let queue = [...roots];
        let seen = new Set(queue);
        while (queue.length) {
          let mod = queue.shift()!;
          if (mod.file) files.add(mod.file);
          for (let dep of mod.importedModules) {
            if (!seen.has(dep)) {
              seen.add(dep);
              queue.push(dep);
            }
          }
        }
        return files;
      }

      // Close the previous instance first so plugins it registered (DB
      // connections, timers, watchers) are torn down instead of leaking.
      async function invalidateApp(): Promise<void> {
        let previous = appPromise;
        appPromise = undefined;
        if (!previous) return;
        try {
          let app = await previous;
          await app.close();
        } catch {
          // The previous build may have failed to resolve; nothing to close.
        }
      }

      // Rebuild the cached Fastify app when the server entry or any module it
      // imports on the server changes, so server-side edits are picked up
      // without a manual restart and build-time captured values stay in sync
      // with the route modules.
      server.watcher.on("change", (file) => {
        let resolved = path.resolve(file);
        if (resolved !== entryPath && !serverDeps.has(resolved)) return;
        void invalidateApp();
      });

      function getApp(): Promise<FastifyInstance> {
        if (!appPromise) {
          appPromise = (async () => {
            let mod = await loadSsrModule(server, serverEntry);
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
            serverDeps = collectServerDeps();
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

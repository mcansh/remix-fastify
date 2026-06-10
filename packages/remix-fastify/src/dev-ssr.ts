import type { ViteDevServer, } from "vite";

// A minimal view of a runnable SSR environment (Vite's Environment API).
interface RunnableSsrEnvironment {
  runner: { import(id: string): Promise<Record<string, unknown>> };
  moduleGraph: {
    getModulesByFile(file: string): Set<SsrModuleNode> | undefined;
  };
}

export interface SsrModuleNode {
  file: string | null;
  importedModules: Set<SsrModuleNode>;
}

/**
 * React Router runs SSR through Vite's Environment API runner. We load the
 * server entry and the server build through the same runner so they share a
 * module graph — and therefore one instance of any module they both import,
 * like a `RouterContext` token passed through `getLoadContext`. Loading them
 * through different module systems would create duplicate instances and break
 * `context.get(...)` with "No value found for context".
 *
 * Requires Vite 7+, where the SSR environment is runnable in middleware mode.
 */
export function getSsrEnvironment(vite: ViteDevServer): RunnableSsrEnvironment {
  let ssr = vite.environments.ssr as unknown as
    | Partial<RunnableSsrEnvironment>
    | undefined;
  if (!ssr || typeof ssr.runner?.import !== "function" || !ssr.moduleGraph) {
    throw new Error(
      "[fastify-dev-server] Vite's SSR environment runner is unavailable. " +
        "@mcansh/remix-fastify requires Vite 7 or newer.",
    );
  }
  return ssr as RunnableSsrEnvironment;
}

/**
 * Load an SSR module through the Environment API runner so it shares a module
 * graph with the rest of the SSR build.
 */
export function loadSsrModule(
  vite: ViteDevServer,
  id: string,
): Promise<Record<string, unknown>> {
  return getSsrEnvironment(vite).runner.import(id);
}

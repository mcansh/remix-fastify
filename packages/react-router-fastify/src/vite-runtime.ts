import type { DevEnvironment, ViteDevServer } from "vite"

interface RunnableEnvironment extends DevEnvironment {
  runner: {
    import(id: string): Promise<Record<string, unknown>>
  }
}

/**
 * Imports an SSR module using Vite's current Environment runner, with
 * `ssrLoadModule` as a compatibility fallback.
 *
 * @param vite Vite dev server.
 * @param id Module ID to import.
 * @returns Imported module namespace.
 */
export async function importSsrModule<T = Record<string, unknown>>(
  vite: ViteDevServer,
  id: string,
): Promise<T> {
  let ssr = vite.environments?.ssr as Partial<RunnableEnvironment> | undefined
  if (typeof ssr?.runner?.import === "function") {
    return ssr.runner.import(id) as Promise<T>
  }

  return vite.ssrLoadModule(id) as unknown as Promise<T>
}

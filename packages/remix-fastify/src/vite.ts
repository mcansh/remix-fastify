import type { Config } from "@react-router/dev/config";
import { statSync } from "node:fs";
import { readFile } from "node:fs/promises";
import * as path from "node:path";
import type { Plugin } from "vite";

export interface FastifyDevServerOptions {
  /**
   * Path to your server entry, relative to the project root. The module must
   * export a factory (see {@link FastifyDevServerOptions.export}) that builds
   * and returns a Fastify instance.
   * @default "./server.ts"
   */
  entry?: string
}

// `from "spec"` (import/export ... from) and side-effect `import "spec"`.
const FROM_IMPORT_RE =
  /(?:^|[\s;])(?:import|export)\b[^;'"]*?\bfrom\s*['"]([^'"]+)['"]/g
const SIDE_EFFECT_IMPORT_RE = /(?:^|[\s;])import\s*['"]([^'"]+)['"]/g

function isFile(filePath: string): boolean {
  try {
    return statSync(filePath).isFile()
  } catch {
    return false
  }
}

function toRelativeSpecifier(fromDir: string, toFile: string): string {
  let relative = path.relative(fromDir, toFile).split(path.sep).join("/")
  return relative.startsWith(".") ? relative : `./${relative}`
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
 *
 * @param entryFile - Absolute path to the server entry to scan.
 * @param ssrOutDir - Absolute path to the SSR build output (`<buildDirectory>/server`).
 * @returns The modules to externalize and the `output.paths` rewrites for them.
 */
async function detectSharedModules(
  entryFile: string,
  ssrOutDir: string,
): Promise<{ external: string[]; paths: Record<string, string> }> {
  let code: string
  try {
    code = await readFile(entryFile, "utf8")
  } catch {
    return { external: [], paths: {} }
  }

  let entryDir = path.dirname(entryFile)
  let specifiers = new Set<string>()
  for (let regexp of [FROM_IMPORT_RE, SIDE_EFFECT_IMPORT_RE]) {
    for (let match of code.matchAll(regexp)) {
      let specifier = match[1]
      if (
        specifier &&
        (specifier.startsWith("./") || specifier.startsWith("../"))
      ) {
        specifiers.add(specifier)
      }
    }
  }

  let external: string[] = []
  let paths: Record<string, string> = {}
  for (let specifier of specifiers) {
    let resolved = path.resolve(entryDir, specifier)
    if (!isFile(resolved)) continue
    external.push(resolved)
    paths[resolved] = toRelativeSpecifier(ssrOutDir, resolved)
  }
  return { external, paths }
}

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
 *
 * @param {FastifyDevServerOptions} options - Configuration options for the Fastify dev server.
 * @returns A Vite plugin that runs your Fastify server in development.
 */
export function fastifyDevServer(options?: FastifyDevServerOptions): Plugin {
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
      if (env.command !== "build") return

      options ??= {}
      options.entry ??= "./server.ts"

      let root = userConfig.root ? path.resolve(userConfig.root) : process.cwd()
      let reactRouterConfig = await import(path.join(root, "./react-router.config.ts")) as {
        default: Config
      }
      console.log({
        reactRouterConfig
      })
      reactRouterConfig.default.buildDirectory ??= "build"

      let entryFile = path.resolve(root, options.entry)
      let ssrOutDir = path.resolve(root, reactRouterConfig.default.buildDirectory, "server")

      let { external, paths } = await detectSharedModules(entryFile, ssrOutDir)
      if (external.length === 0) return

      return {
        environments: {
          ssr: {
            // build: { rollupOptions: { external, output: { paths } } },
            build: {
              rolldownOptions: {
                input: entryFile,
                output: { paths },
              },
            },
          },
        },
      }
    },
  }
}

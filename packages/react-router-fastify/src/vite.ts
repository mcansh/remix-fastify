import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

import type { FastifyInstance } from "fastify"
import type { Plugin, ViteDevServer } from "vite"

import { importSsrModule } from "./vite-runtime.ts"

const adapterPackageNames = [
  "@mcansh/react-router-fastify",
  "@mcansh/remix-fastify",
]

export type FastifyAppFactory = (
  vite: ViteDevServer,
) => FastifyInstance | Promise<FastifyInstance>

export interface FastifyReactRouterDevOptions {
  /** Server module loaded by Vite during `react-router dev`. */
  entry?: string
  /** Named export that creates the Fastify app. Falls back to `default`. */
  exportName?: string
  /**
   * Keeps local modules imported by the Fastify server entry external in the
   * React Router SSR build. This preserves singleton module identity for shared
   * values such as React Router context tokens.
   *
   * Pass an array to externalize explicit import specifiers instead.
   */
  externalizeServerEntryImports?: boolean | string[]
}

/**
 * Vite plugin that lets `react-router dev` serve through a Fastify app.
 *
 * Vite continues to handle its internal client/HMR/module middleware first.
 * Fastify receives the remaining requests, including the React Router catch-all
 * installed by `fastifyReactRouter`.
 *
 * @param options Development server entry options.
 * @returns Vite plugin.
 */
export function fastifyReactRouterDev(
  options: FastifyReactRouterDevOptions = {},
): Plugin {
  let {
    entry = "./server.ts",
    exportName = "createServer",
    externalizeServerEntryImports = true,
  } = options
  let command: "build" | "serve" = "serve"
  let root = process.cwd()
  let serverEntryImportSpecifiers = new Set<string>()
  let serverEntryImportFiles = new Set<string>()

  return {
    name: "fastify-react-router-dev",
    enforce: "pre",
    config(_config, environment) {
      if (environment.command !== "serve") return

      return {
        ssr: {
          noExternal: adapterPackageNames,
        },
      }
    },
    configResolved(config) {
      command = config.command
      root = config.root

      let resolvedEntry = path.resolve(root, entry)
      let externals = collectServerEntryExternals(
        resolvedEntry,
        externalizeServerEntryImports,
      )
      serverEntryImportSpecifiers = externals.specifiers
      serverEntryImportFiles = externals.files
    },
    async resolveId(source, importer, resolveOptions) {
      if (command !== "build" || !resolveOptions.ssr) return null
      if (shouldExternalizeSpecifier(source) === false) return null

      if (serverEntryImportSpecifiers.has(source)) {
        return { id: source, external: true }
      }

      if (importer == null) return null

      let resolved = await this.resolve(source, importer, {
        ...resolveOptions,
        skipSelf: true,
      })
      if (resolved == null) return null

      let filePath = toFilePath(resolved.id)
      if (filePath == null || serverEntryImportFiles.has(filePath) === false)
        return null

      return {
        id: source.startsWith("#") ? source : filePath,
        external: true,
      }
    },
    configureServer(vite) {
      let resolvedEntry = path.resolve(vite.config.root, entry)
      let appPromise: Promise<FastifyInstance> | undefined

      async function closeApp(): Promise<void> {
        let current = appPromise
        appPromise = undefined
        if (current == null) return

        try {
          let app = await current
          await app.close()
        } catch {
          // The app may have failed while loading; there is nothing to close.
        }
      }

      async function loadApp(): Promise<FastifyInstance> {
        if (appPromise == null) {
          appPromise = (async () => {
            let module = await importSsrModule(vite, resolvedEntry)
            let factory = module[exportName] ?? module.default

            if (typeof factory !== "function") {
              throw new Error(
                `[fastify-react-router-dev] Expected ${entry} to export "${exportName}" or a default Fastify app factory.`,
              )
            }

            let app = await (factory as FastifyAppFactory)(vite)
            await app.ready()
            return app
          })()
        }

        return appPromise
      }

      vite.watcher.on("change", () => {
        void closeApp()
      })
      vite.watcher.on("unlink", () => {
        void closeApp()
      })
      vite.httpServer?.once("close", () => {
        void closeApp()
      })

      return () => {
        vite.middlewares.use(async (request, response, next) => {
          try {
            let app = await loadApp()
            app.routing(request, response)
          } catch (error) {
            if (error instanceof Error) vite.ssrFixStacktrace(error)
            next(error)
          }
        })
      }
    },
  }
}

function collectServerEntryExternals(
  entryPath: string,
  externalizeServerEntryImports: boolean | string[],
): {
  specifiers: Set<string>
  files: Set<string>
} {
  let specifiers = new Set<string>()
  let files = new Set<string>()

  if (externalizeServerEntryImports === false) {
    return { specifiers, files }
  }

  let imports = Array.isArray(externalizeServerEntryImports)
    ? externalizeServerEntryImports
    : readImportSpecifiers(entryPath)

  for (let specifier of imports) {
    if (shouldExternalizeSpecifier(specifier) === false) continue

    specifiers.add(specifier)

    if (isLocalSpecifier(specifier)) {
      let file = resolveLocalImport(entryPath, specifier)
      if (file) files.add(file)
    }
  }

  return { specifiers, files }
}

function readImportSpecifiers(filePath: string): string[] {
  if (fs.existsSync(filePath) === false) return []

  let source = fs.readFileSync(filePath, "utf8")
  let specifiers = new Set<string>()
  let importPattern =
    /\b(?:import|export)\s+(?:[^'"]*?\s+from\s*)?["']([^"']+)["']|import\s*\(\s*["']([^"']+)["']\s*\)/g

  for (let match of source.matchAll(importPattern)) {
    specifiers.add(match[1] ?? match[2])
  }

  return [...specifiers]
}

function shouldExternalizeSpecifier(specifier: string): boolean {
  return specifier.startsWith("#") || isLocalSpecifier(specifier)
}

function isLocalSpecifier(specifier: string): boolean {
  return specifier.startsWith(".") || specifier.startsWith("/")
}

function resolveLocalImport(
  importer: string,
  specifier: string,
): string | undefined {
  let resolved = path.resolve(path.dirname(importer), specifier)
  return resolveExistingFile(resolved)
}

function resolveExistingFile(filePath: string): string | undefined {
  if (isFile(filePath)) return normalizePath(filePath)

  for (let extension of [".ts", ".tsx", ".mts", ".mjs", ".js", ".jsx"]) {
    let candidate = `${filePath}${extension}`
    if (isFile(candidate)) return normalizePath(candidate)
  }

  for (let extension of [".ts", ".tsx", ".mts", ".mjs", ".js", ".jsx"]) {
    let candidate = path.join(filePath, `index${extension}`)
    if (isFile(candidate)) return normalizePath(candidate)
  }

  return undefined
}

function isFile(filePath: string): boolean {
  try {
    return fs.statSync(filePath).isFile()
  } catch {
    return false
  }
}

function toFilePath(id: string): string | undefined {
  let withoutQuery = id.replace(/[?#].*$/, "")

  if (withoutQuery.startsWith("file://")) {
    return normalizePath(fileURLToPath(withoutQuery))
  }

  if (path.isAbsolute(withoutQuery)) {
    return normalizePath(withoutQuery)
  }

  return undefined
}

function normalizePath(filePath: string): string {
  return filePath.split(path.sep).join("/")
}

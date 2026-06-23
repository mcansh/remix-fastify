import fs from "node:fs"
import os from "node:os"
import path from "node:path"

import { describe, expect, it, vi } from "vitest"

import { fastifyReactRouterDev } from "./vite.ts"

describe("fastifyReactRouterDev", () => {
  it("creates a pre-enforced Vite plugin", () => {
    let plugin = fastifyReactRouterDev({ entry: "./server.ts" })

    expect(plugin.name).toBe("fastify-react-router-dev")
    expect(plugin.enforce).toBe("pre")
    expect(plugin.configureServer).toBeTypeOf("function")
  })

  it("keeps the adapter in Vite's SSR module graph during development", async () => {
    let plugin = fastifyReactRouterDev({ entry: "./server.ts" })
    let config = getHook<AnyHook>(plugin.config)

    let result = await config?.call(undefined, {}, {
      command: "serve",
      mode: "development",
      isPreview: false,
      isSsrBuild: false,
    })

    expect(result).toEqual({
      ssr: {
        noExternal: ["@mcansh/react-router-fastify", "@mcansh/remix-fastify"],
      },
    })
  })

  it("does not force adapter noExternal settings during builds", async () => {
    let plugin = fastifyReactRouterDev({ entry: "./server.ts" })
    let config = getHook<AnyHook>(plugin.config)

    let result = await config?.call(undefined, {}, {
      command: "build",
      mode: "production",
      isPreview: false,
      isSsrBuild: true,
    })

    expect(result).toBeUndefined()
  })

  it("externalizes package imports found in the server entry during SSR builds", async () => {
    let root = fs.mkdtempSync(path.join(os.tmpdir(), "rr-fastify-"))
    fs.writeFileSync(
      path.join(root, "server.ts"),
      'import { requestInfoContext } from "#request-info";\n',
    )

    try {
      let plugin = fastifyReactRouterDev({ entry: "./server.ts" })
      let configResolved = getHook<AnyHook>(plugin.configResolved)
      await configResolved?.call(undefined, { command: "build", root })

      let resolveId = getHook<AnyHook>(plugin.resolveId)
      let result = await resolveId?.call(
        { resolve: vi.fn() },
        "#request-info",
        path.join(root, "app/root.tsx"),
        {
          isEntry: false,
          ssr: true,
        },
      )

      expect(result).toEqual({
        id: "#request-info",
        external: true,
      })
    } finally {
      fs.rmSync(root, { recursive: true, force: true })
    }
  })

  it("externalizes relative server entry imports by resolved file", async () => {
    let root = fs.mkdtempSync(path.join(os.tmpdir(), "rr-fastify-"))
    let helperPath = path.join(root, "app/request-info.ts")
    fs.mkdirSync(path.dirname(helperPath), { recursive: true })
    fs.writeFileSync(
      path.join(root, "server.ts"),
      'import { requestInfoContext } from "./app/request-info";\n',
    )
    fs.writeFileSync(helperPath, "export let requestInfoContext = Symbol();\n")

    try {
      let plugin = fastifyReactRouterDev({ entry: "./server.ts" })
      let configResolved = getHook<AnyHook>(plugin.configResolved)
      await configResolved?.call(undefined, {
        command: "build",
        root,
      })

      let normalizedHelperPath = helperPath.split(path.sep).join("/")
      let resolveId = getHook<AnyHook>(plugin.resolveId)
      let result = await resolveId?.call(
        {
          resolve: vi.fn(async () => ({ id: normalizedHelperPath })),
        },
        "./request-info",
        path.join(root, "app/root.tsx"),
        {
          isEntry: false,
          ssr: true,
        },
      )

      expect(result).toEqual({
        id: normalizedHelperPath,
        external: true,
      })
    } finally {
      fs.rmSync(root, { recursive: true, force: true })
    }
  })

  it("does not externalize server entry imports when disabled", async () => {
    let root = fs.mkdtempSync(path.join(os.tmpdir(), "rr-fastify-"))
    fs.writeFileSync(
      path.join(root, "server.ts"),
      'import { requestInfoContext } from "#request-info";\n',
    )

    try {
      let plugin = fastifyReactRouterDev({
        entry: "./server.ts",
        externalizeServerEntryImports: false,
      })
      let configResolved = getHook<AnyHook>(plugin.configResolved)
      await configResolved?.call(undefined, {
        command: "build",
        root,
      })

      let resolveId = getHook<AnyHook>(plugin.resolveId)
      let result = await resolveId?.call(
        {
          resolve: vi.fn(),
        },
        "#request-info",
        path.join(root, "app/root.tsx"),
        {
          isEntry: false,
          ssr: true,
        },
      )

      expect(result).toBeNull()
    } finally {
      fs.rmSync(root, { recursive: true, force: true })
    }
  })
})

function getHook<T>(hook: T | { handler: T } | undefined): T | undefined {
  if (hook == null) return undefined
  if (typeof hook === "object" && "handler" in hook) return hook.handler
  return hook as T
}

type AnyHook = {
  call(thisArg: unknown, ...args: unknown[]): unknown
}

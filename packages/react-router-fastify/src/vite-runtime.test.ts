import type { ViteDevServer } from "vite"
import type { MockedFunction } from "vitest"
import { describe, expect, it, vi } from "vitest"

import { importSsrModule } from "./vite-runtime.ts"

describe("importSsrModule", () => {
  it("uses the Vite Environment runner when available", async () => {
    let imported = { ok: true }
    let vite = {
      environments: {
        ssr: {
          runner: {
            import: vi.fn(async () => imported),
          },
        },
      },
      ssrLoadModule: vi.fn(),
    } as unknown as ViteDevServer

    await expect(importSsrModule(vite, "/entry.ts")).resolves.toBe(imported)
    expect(
      (
        vite as unknown as {
          environments: {
            ssr: {
              runner: {
                import: MockedFunction<(id: string) => Promise<typeof imported>>
              }
            }
          }
        }
      ).environments.ssr.runner.import,
    ).toHaveBeenCalledWith("/entry.ts")
    expect(vite.ssrLoadModule).not.toHaveBeenCalled()
  })

  it("falls back to ssrLoadModule", async () => {
    let imported = { ok: true }
    let vite = {
      ssrLoadModule: vi.fn(async () => imported),
    } as unknown as ViteDevServer

    await expect(importSsrModule(vite, "/entry.ts")).resolves.toBe(imported)
    expect(vite.ssrLoadModule).toHaveBeenCalledWith("/entry.ts")
  })
})

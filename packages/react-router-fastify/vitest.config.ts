import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    environment: "node",
    restoreMocks: true,
    mockReset: true,
    coverage: {
      provider: "v8",
    },
  },
})

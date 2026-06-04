import type { Config } from "@react-router/dev/config"

export default {
  ssr: true,
  future: {
    v8_middleware: true,
    v8_splitRouteModules: "enforce",
    v8_viteEnvironmentApi: true,
    unstable_optimizeDeps: true,
    v8_passThroughRequests: true,
    v8_trailingSlashAwareDataRequests: true,
    unstable_previewServerPrerendering: true,
  },
} satisfies Config
